import { useState, useRef } from "react";
import { callClaudeStream, callClaudeFull } from "../lib/claude.js";
import { makeSupabase } from "../lib/supabase.js";
import { today, wordCount, chunkText, extractJsonBlocks, extractPreCommitText } from "../lib/utils.js";
import { buildDocumentMapPrompt, buildPreviewPrompt, buildCommitPrompt } from "../lib/prompts.js";

// Word count threshold above which source text is split into chunks.
const CHUNK_WORD_THRESHOLD = 6000;

// Hard cap on source text size (~50k words). Beyond this, Claude context limits
// produce confusing API errors rather than clean feedback.
const MAX_SOURCE_CHARS = 200000;

// How many times to poll Supabase after adding a scholar/topic before giving up
// waiting for the write to be visible.
const MAX_FRESHNESS_ATTEMPTS = 6;

// Strip JSON fences and parse; throws on malformed JSON.
function parseJsonResult(raw) {
  return JSON.parse(raw.replace(/```json|```/g, "").trim());
}

// Build the normalised source payload for a Supabase POST.
function normaliseSource(src, sessionId) {
  return {
    user_id: null,
    scholar_id: parseInt(src.scholar_id, 10),
    source_type: "scholar",
    author_name: src.author_name,
    source_title: src.source_title || null,
    source_year: src.source_year ? parseInt(src.source_year, 10) : null,
    content_summary: Array.isArray(src.content_summary)
      ? src.content_summary.join("\n")
      : src.content_summary,
    short_quotes: src.short_quotes || [],
    topic_ids: [Number(Array.isArray(src.topic_ids) ? src.topic_ids[0] : src.topic_ids)]
      .filter(n => n != null && !isNaN(n) && n > 0),
    theological_themes: src.theological_themes || [],
    scripture_references: src.scripture_references || [],
    devotional_angles: src.devotional_angles || [],
    citation_confidence: (src.citation_confidence || "medium").toLowerCase(),
    topic_assignment_confidence: src.topic_assignment_confidence || {},
    is_default_library: true,
    is_primary: src.is_primary || false,
    is_active: true,
    health_check_status: null,
    key_terms: Array.isArray(src.key_terms) ? src.key_terms.join(", ") : (src.key_terms || ""),
    generation_performance: "unchecked",
    ingestion_session_id: sessionId,
  };
}

// Build a blank enriched entry for the review stage.
function makeBlankEntry(data) {
  return { data, status: null, existingRows: [], existingCollapsed: false, merging: false, comparison: null, comparing: false };
}

export function useIngestion(config, scholars, allTopics, setScholars, setAllTopics) {
  // ── Stage & session ──────────────────────────────────────────────────────────
  const [stage, setStage] = useState(-1);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [error, setError] = useState("");

  // ── Home screen ───────────────────────────────────────────────────────────────
  const [homeData, setHomeData] = useState(null);
  const [homeLoading, setHomeLoading] = useState(false);

  // ── Stage 0: session metadata ─────────────────────────────────────────────────
  const [s0, setS0] = useState({ source_description: "", source_type: "primary-text", domains: [] });

  // ── Stage 1: source text & chunking ──────────────────────────────────────────
  const [sourceText, setSourceText] = useState("");
  const [chunks, setChunks] = useState([]);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [documentMap, setDocumentMap] = useState(null);
  const [isChunked, setIsChunked] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef();

  // ── Stage 2: preview & streaming ─────────────────────────────────────────────
  const [previewOutput, setPreviewOutput] = useState("");
  const [previewStreaming, setPreviewStreaming] = useState(false);
  const [parsedProposal, setParsedProposal] = useState(null);
  const [rawProposalCollapsed, setRawProposalCollapsed] = useState(true);
  const [scholarOrTopicAddedSincePreview, setScholarOrTopicAddedSincePreview] = useState(false);

  // ── Stage 3: review cards ─────────────────────────────────────────────────────
  const [scholarCards, setScholarCards] = useState([]);
  const [reviewTopics, setReviewTopics] = useState([]);

  // ── Stage 4/5: commit & approval ─────────────────────────────────────────────
  const [postCommitReport, setPostCommitReport] = useState("");
  const [sourceEntries, setSourceEntries] = useState([]);
  const [reportCollapsed, setReportCollapsed] = useState(false);

  const db = () => makeSupabase(config.supabaseUrl, config.supabaseKey);

  // ── Reference data ────────────────────────────────────────────────────────────

  // Fetches scholars and topics; returns cached values if already loaded and forceRefresh is false.
  async function loadReferenceData(forceRefresh = false) {
    if (!forceRefresh && scholars.length > 0) return { scholars, allTopics };
    const [sc, tp] = await Promise.all([
      db().get("/rest/v1/allowed_scholars?select=scholar_id,scholar_name,strand,era&is_active=eq.true&order=scholar_id"),
      db().get("/rest/v1/topics?select=topic_id,topic_name,topic_display_name,topic_description,domain,adjacent_topic_ids&is_active=eq.true&order=domain,topic_id"),
    ]);
    setScholars(sc);
    setAllTopics(tp);
    return { scholars: sc, allTopics: tp };
  }

  function resetSession() {
    setScholarOrTopicAddedSincePreview(false);
    setS0({ source_description: "", source_type: "primary-text", domains: [] });
    setSourceText(""); setChunks([]); setCurrentChunk(0);
    setDocumentMap(null); setIsChunked(false);
    setPreviewOutput(""); setParsedProposal(null);
    setScholarCards([]); setSourceEntries([]);
    setPostCommitReport(""); setReviewTopics([]);
    setSession(null);
  }

  // ── Home screen loader ────────────────────────────────────────────────────────

  async function loadHome() {
    if (!config.anthropicKey || !config.supabaseKey) return;
    setHomeLoading(true);
    setError("");
    try {
      const [countRes, coverage, sessions, sourcesForStrand] = await Promise.all([
        db().get("/rest/v1/sources?select=source_id&is_active=eq.true&is_default_library=eq.true"),
        db().get("/rest/v1/topic_coverage?select=topic_id,topic_name,topic_display_name,domain,active_source_rows,critical_rows,evangelical_rows,catholic_rows,feminist_rows,social_prophet_rows,other_rows&order=active_source_rows.asc,domain.asc"),
        db().get("/rest/v1/ingestion_sessions?select=*&status=in.(draft,pending-review)&order=created_at.desc&limit=10"),
        db().get("/rest/v1/sources?select=scholar_id&is_active=eq.true&is_default_library=eq.true&scholar_id=not.is.null"),
      ]);

      const { scholars: sc } = await loadReferenceData();

      // Build a scholar_id → strand map for the strand breakdown chart.
      const strandMap = {};
      sc.forEach(s => { strandMap[s.scholar_id] = s.strand; });
      const strandCounts = {};
      sourcesForStrand.forEach(row => {
        const strand = strandMap[row.scholar_id] || "other";
        strandCounts[strand] = (strandCounts[strand] || 0) + 1;
      });

      setHomeData({ total: countRes.length, coverage, sessions, strandCounts });
    } catch (e) {
      setError("loadHome failed: " + e.message);
    }
    setHomeLoading(false);
  }

  // ── Session management ────────────────────────────────────────────────────────

  async function createSession() {
    if (!s0.source_description.trim()) { setError("Source description is required."); return; }
    setLoading(true); setLoadingMsg("Creating session..."); setError("");
    try {
      const rows = await db().post("/rest/v1/ingestion_sessions", {
        status: "draft",
        date: today(),
        source_description: s0.source_description.trim(),
        source_type: s0.source_type,
        domain_focus: [],
      });
      setSession(rows[0]);
      setStage(1);
    } catch (e) {
      setError("createSession failed: " + e.message);
    }
    setLoading(false);
  }

  async function resumeSession(sess) {
    setSession(sess);
    setScholarOrTopicAddedSincePreview(false);
    setS0({ source_description: sess.source_description, source_type: sess.source_type, domains: sess.domain_focus || [] });

    if (sess.source_material_text) {
      setSourceText(sess.source_material_text);
      if (wordCount(sess.source_material_text) > CHUNK_WORD_THRESHOLD) {
        const chks = chunkText(sess.source_material_text);
        setChunks(chks);
        setIsChunked(true);
        setDocumentMap(sess.document_map || null);
        setCurrentChunk(sess.chunk_index || 0);
      }
    }

    if (sess.status === "pending-review" && sess.preview_output) {
      const full = sess.preview_output;
      const fenceIdx = full.indexOf("```json");
      const proseOnly = fenceIdx > -1 ? full.slice(0, fenceIdx).trimEnd() : full;
      setPreviewOutput(proseOnly);

      if (fenceIdx > -1) {
        const { blocks, parseErrors } = extractJsonBlocks(full);
        const proposal = blocks.length > 0 && blocks[blocks.length - 1].scholars
          ? blocks[blocks.length - 1]
          : null;
        setParsedProposal(proposal);
        // Warn if the stored preview had a malformed JSON block.
        if (!proposal && parseErrors.length > 0) {
          setError("The saved preview has a malformed JSON proposal — re-run the preview to fix it.");
        }
      }

      try { await loadReferenceData(); } catch {} // Non-fatal; use cached values.
      setStage(2);
    } else {
      setStage(1);
    }
  }

  // ── File handling ─────────────────────────────────────────────────────────────

  async function handleFile(file) {
    if (!file) return;
    if (file.type === "application/pdf") {
      setLoadingMsg("Extracting PDF text...");
      setLoading(true);
      try {
        const text = await extractPdfText(file);
        await handleTextReady(text);
      } catch (e) {
        setError("PDF extraction failed: " + e.message);
      }
      setLoading(false);
    } else {
      const text = await file.text();
      await handleTextReady(text);
    }
  }

  async function extractPdfText(file) {
    if (!window.pdfjsLib) {
      await new Promise((res, rej) => {
        const s = document.createElement("script");
        s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
        s.onload = res; s.onerror = rej;
        document.head.appendChild(s);
      });
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    }
    const ab = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: ab }).promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const c = await page.getTextContent();
      text += c.items.map(it => it.str).join(" ") + "\n\n";
    }
    return text;
  }

  async function handleTextReady(text) {
    if (text.length > MAX_SOURCE_CHARS) {
      setError(
        "Source text is too long (" + Math.round(text.length / 1000) + "k characters). " +
        "Maximum is 200k characters (~50,000 words). Please split the document and ingest it in sections."
      );
      return;
    }

    setSourceText(text);
    try {
      await db().patch("/rest/v1/ingestion_sessions?session_id=eq." + session.session_id, {
        source_material_text: text,
      });
    } catch {} // Non-fatal — text is held in state even if the save fails.

    if (wordCount(text) > CHUNK_WORD_THRESHOLD) {
      setIsChunked(true);
      setLoadingMsg("Generating document map...");
      setLoading(true);
      try {
        const { scholars: sc } = await loadReferenceData();
        const mapText = await callClaudeFull(config.anthropicKey, {
          messages: [{ role: "user", content: buildDocumentMapPrompt(text, session?.source_type || "primary-text", sc) }],
          max_tokens: 2000,
        });
        let mapJson = null;
        try { mapJson = parseJsonResult(mapText); } catch {}
        setDocumentMap(mapJson);

        const chks = chunkText(text);
        setChunks(chks);
        setCurrentChunk(0);
        await db().patch("/rest/v1/ingestion_sessions?session_id=eq." + session.session_id, {
          document_map: mapJson, total_chunks: chks.length, chunk_index: 0,
        });
      } catch (e) {
        setError("Document map failed: " + e.message);
      }
      setLoading(false);
    } else {
      setIsChunked(false);
    }
  }

  // ── Preview (Stage 2) ─────────────────────────────────────────────────────────

  async function runPreview() {
    setPreviewStreaming(true);
    setPreviewOutput("");
    setParsedProposal(null);
    setError("");
    setScholarOrTopicAddedSincePreview(false);
    setStage(2); // Advance immediately so the streaming display renders.

    try {
      // If a scholar or topic was recently added, poll until Supabase reflects the
      // write before fetching reference data — avoids the new item being invisible.
      if (scholarOrTopicAddedSincePreview) {
        const prevScholarsCount = scholars.length;
        const prevTopicsCount = allTopics.length;
        for (let attempt = 0; attempt < MAX_FRESHNESS_ATTEMPTS; attempt++) {
          await new Promise(resolve => setTimeout(resolve, 400));
          const { scholars: sc, allTopics: tp } = await loadReferenceData(true);
          if (sc.length !== prevScholarsCount || tp.length !== prevTopicsCount) break;
        }
      }

      const { scholars: freshScholars, allTopics: freshTopics } = await loadReferenceData(true);
      const text = isChunked ? chunks[currentChunk] : sourceText;
      const prompt = await buildPreviewPrompt(
        text, isChunked ? currentChunk : null, isChunked ? chunks.length : null,
        freshScholars, freshTopics, documentMap, session
      );

      const full = await callClaudeStream(
        config.anthropicKey,
        { messages: [{ role: "user", content: prompt }], max_tokens: 6000 },
        (partial) => {
          const fenceIdx = partial.indexOf("```json");
          setPreviewOutput(fenceIdx > -1 ? partial.slice(0, fenceIdx).trimEnd() : partial);
        }
      );

      // Strip the JSON proposal block from the displayed prose.
      const fenceIdx = full.indexOf("```json");
      setPreviewOutput(fenceIdx > -1 ? full.slice(0, fenceIdx).trimEnd() : full);

      // Parse the structured proposal, if present.
      let proposal = null;
      if (fenceIdx > -1) {
        const { blocks, parseErrors } = extractJsonBlocks(full);
        if (blocks.length > 0 && blocks[blocks.length - 1].scholars) {
          proposal = blocks[blocks.length - 1];
        } else if (parseErrors.length > 0) {
          setError("Claude's structured proposal had a JSON syntax error — re-run the preview to try again. Detail: " + parseErrors[0]);
        }
      }
      setParsedProposal(proposal);
      setRawProposalCollapsed(true);

      // Derive domain tags from the proposed topics, then persist to Supabase.
      const sessionPatch = {
        preview_output: full,
        preview_generated_at: new Date().toISOString(),
        status: "pending-review",
      };
      if (proposal?.scholars) {
        const proposedTopicIds = new Set();
        proposal.scholars.forEach(s =>
          (s.proposed_topics || []).forEach(pt => proposedTopicIds.add(parseInt(pt.topic_id, 10)))
        );
        const derivedDomains = [...new Set(
          freshTopics.filter(t => proposedTopicIds.has(t.topic_id)).map(t => t.domain)
        )];
        setS0(s => ({ ...s, domains: derivedDomains }));
        sessionPatch.domain_focus = derivedDomains;
      }
      await db().patch("/rest/v1/ingestion_sessions?session_id=eq." + session.session_id, sessionPatch);
      setSession(s => ({ ...s, ...sessionPatch }));
    } catch (e) {
      setError("runPreview failed: " + e.message);
    }
    setPreviewStreaming(false);
  }

  // ── Review cards (Stage 3) ────────────────────────────────────────────────────

  function buildCardsFromProposal(proposal, topicsList, scholarsList) {
    if (!proposal?.scholars?.length) return [];
    const topicsRef = topicsList?.length > 0 ? topicsList : allTopics;
    const scholarsRef = scholarsList?.length > 0 ? scholarsList : scholars;

    return proposal.scholars.map(s => {
      const sc = scholarsRef.find(x => x.scholar_id === parseInt(s.scholar_id, 10));
      const selectedTopics = {};
      (s.proposed_topics || []).forEach(pt => {
        const tid = parseInt(pt.topic_id, 10);
        if (topicsRef.find(t => t.topic_id === tid)) {
          selectedTopics[tid] = pt.confidence || "medium";
        }
      });
      return {
        scholar_id: parseInt(s.scholar_id, 10),
        scholar_name: s.scholar_name || sc?.scholar_name || "Scholar " + s.scholar_id,
        strand: sc?.strand || "other",
        source_title: s.source_title || "",
        source_year: s.source_year ? String(s.source_year) : "",
        included: s.include !== false,
        selectedTopics,
        confidence: s.overall_confidence || "medium",
        flags: s.flags || [],
      };
    });
  }

  async function proceedToReview() {
    try {
      const { scholars: sc, allTopics: tp } = await loadReferenceData(true);
      setScholarCards(parsedProposal ? buildCardsFromProposal(parsedProposal, tp, sc) : []);
      setReviewTopics(tp);
      setStage(3);
    } catch (e) {
      setError("Failed to load reference data: " + e.message);
    }
  }

  function toggleTopicOnCard(cardIdx, topicId) {
    setScholarCards(cards => cards.map((c, i) => {
      if (i !== cardIdx) return c;
      const next = { ...c.selectedTopics };
      if (next[topicId]) delete next[topicId];
      else next[topicId] = "high";
      return { ...c, selectedTopics: next };
    }));
  }

  function setTopicConf(cardIdx, topicId, conf) {
    setScholarCards(cards => cards.map((c, i) =>
      i !== cardIdx ? c : { ...c, selectedTopics: { ...c.selectedTopics, [topicId]: conf } }
    ));
  }

  function setCardField(cardIdx, field, val) {
    setScholarCards(cards => cards.map((c, i) => i === cardIdx ? { ...c, [field]: val } : c));
  }

  // ── Commit (Stage 4) ──────────────────────────────────────────────────────────

  async function runCommit() {
    const included = scholarCards.filter(c => c.included && Object.keys(c.selectedTopics).length > 0);
    if (included.length === 0) {
      setError("Include at least one scholar with at least one topic selected.");
      return;
    }

    const decisions = included.map(c => ({
      include: true,
      scholar_id: c.scholar_id,
      scholar_name: c.scholar_name,
      source_title: c.source_title || null,
      source_year: c.source_year ? parseInt(c.source_year, 10) : null,
      topic_assignments: c.selectedTopics,
      confidence: c.confidence,
    }));

    setError("");
    setStage(4);
    setLoading(true);
    setLoadingMsg("Generating Sources entries... this may take 20-30 seconds");

    try {
      const text = isChunked ? chunks[currentChunk] : sourceText;
      const prompt = await buildCommitPrompt(text, decisions, s0, allTopics, scholars, session, db());
      const full = await callClaudeFull(config.anthropicKey, {
        messages: [{ role: "user", content: prompt }],
        max_tokens: 8000, temperature: 0.3,
      });

      setPostCommitReport(extractPreCommitText(full));
      const { blocks: entries } = extractJsonBlocks(full);

      // Enrich each entry with any existing rows for the same scholar + topic.
      const enrichedEntries = await Promise.all(entries.map(async (e) => {
        try {
          const topicId = (e.topic_ids || [])[0];
          const scholarId = e.scholar_id;
          if (!topicId || !scholarId) return makeBlankEntry(e);
          const existing = await db().get(
            "/rest/v1/sources?select=source_id,author_name,source_title,source_year,content_summary,devotional_angles,theological_themes,scripture_references,topic_ids,citation_confidence&scholar_id=eq." + scholarId + "&topic_ids=cs.{" + topicId + "}&is_active=eq.true&is_default_library=eq.true"
          );
          return { ...makeBlankEntry(e), existingRows: existing || [] };
        } catch {
          return makeBlankEntry(e);
        }
      }));
      setSourceEntries(enrichedEntries);
      setStage(5);

      // Run duplicate comparison for entries that have existing rows.
      const withDuplicates = enrichedEntries
        .map((entry, idx) => ({ entry, idx }))
        .filter(({ entry }) => entry.existingRows?.length > 0);

      if (withDuplicates.length > 0) {
        setSourceEntries(es => es.map((e, i) =>
          withDuplicates.find(w => w.idx === i) ? { ...e, comparing: true } : e
        ));
        for (const { entry, idx } of withDuplicates) {
          await _runEntryComparison(entry, idx);
        }
      }
    } catch (e) {
      setError("runCommit failed: " + e.message);
      setStage(3);
    }
    setLoading(false);
  }

  // Compares a new entry against its first existing row and stores the recommendation.
  async function _runEntryComparison(entry, idx) {
    try {
      const existing = entry.existingRows[0];
      const newData = entry.data;
      const getSummary = d => Array.isArray(d.content_summary)
        ? d.content_summary.join("\n")
        : (d.content_summary || "");

      const compPrompt = [
        "You are comparing two source entries for the same scholar and topic.",
        "EXISTING ROW content summary:", getSummary(existing),
        "", "NEW ENTRY content summary:", getSummary(newData),
        "", "Return ONLY valid JSON:",
        "{",
        "  \"overlap\": \"high | medium | low\",",
        "  \"unique_count\": <integer>,",
        "  \"unique_claims\": [\"each genuinely new claim from the new entry\"],",
        "  \"recommendation\": \"skip | merge | add-new\",",
        "  \"recommendation_reason\": \"one sentence\"",
        "}",
      ].join("\n");

      const result = await callClaudeFull(config.anthropicKey, {
        messages: [{ role: "user", content: compPrompt }],
        max_tokens: 600, temperature: 0.2,
      });
      const comparison = parseJsonResult(result);
      setSourceEntries(es => es.map((e, i) => i === idx ? { ...e, comparison, comparing: false } : e));
    } catch {
      setSourceEntries(es => es.map((e, i) => i === idx ? { ...e, comparison: null, comparing: false } : e));
    }
  }

  // ── Entry approval (Stage 5) ──────────────────────────────────────────────────

  async function mergeEntry(idx) {
    const entry = sourceEntries[idx];
    if (!entry || entry.merging) return;
    setSourceEntries(es => es.map((e, i) => i === idx ? { ...e, merging: true } : e));

    try {
      const newData = entry.data;
      const existing = entry.existingRows[0];
      const getSummary = d => Array.isArray(d.content_summary)
        ? d.content_summary.join("\n")
        : (d.content_summary || "");

      const prompt = [
        "You are merging two source entries for the same scholar and topic into one enriched row.",
        "EXISTING ROW:", "Author: " + existing.author_name, "Content Summary:", getSummary(existing),
        "Devotional Angles:", (existing.devotional_angles || []).join("\n"),
        "", "NEW ROW:", "Author: " + newData.author_name, "Content Summary:", getSummary(newData),
        "Devotional Angles:", (newData.devotional_angles || []).join("\n"),
        "", "Produce a single merged entry. Respond with ONLY a JSON object (no fences):",
        "{\"source_title\": \"...\", \"source_year\": null, \"content_summary\": [\"1. ...\"], \"devotional_angles\": [\"...\"], \"theological_themes\": [\"...\"], \"scripture_references\": [\"...\"]}",
      ].join("\n");

      const result = await callClaudeFull(config.anthropicKey, {
        messages: [{ role: "user", content: prompt }],
        max_tokens: 3000, temperature: 0.3,
      });
      const merged = parseJsonResult(result);

      await db().patch("/rest/v1/sources?source_id=eq." + existing.source_id, { is_active: false });
      await db().post("/rest/v1/sources", {
        ...normaliseSource(newData, session.session_id),
        source_title: merged.source_title || newData.source_title,
        source_year: merged.source_year || newData.source_year,
        content_summary: Array.isArray(merged.content_summary)
          ? merged.content_summary.join("\n")
          : merged.content_summary,
        devotional_angles: merged.devotional_angles || [],
        theological_themes: merged.theological_themes || [],
        scripture_references: merged.scripture_references || [],
      });
      setSourceEntries(es => es.map((e, i) => i === idx ? { ...e, status: "merged", merging: false } : e));
    } catch (e) {
      setSourceEntries(es => es.map((e, i) => i === idx ? { ...e, merging: false, entryError: e.message } : e));
    }
  }

  async function approveEntry(idx) {
    const entry = sourceEntries[idx];
    if (!entry || entry.status) return;
    try {
      await db().post("/rest/v1/sources", normaliseSource(entry.data, session.session_id));
      setSourceEntries(es => es.map((e, i) => i === idx ? { ...e, status: "approved", entryError: null } : e));
    } catch (e) {
      setSourceEntries(es => es.map((e, i) => i === idx ? { ...e, entryError: e.message } : e));
    }
  }

  function rejectEntry(idx) {
    setSourceEntries(es => es.map((e, i) => i === idx ? { ...e, status: "rejected" } : e));
  }

  async function approveAll() {
    // Snapshot length at call time; approveEntry updates state async so we cannot
    // read sourceEntries[i] inside the loop — it may reflect stale state after
    // the first approveEntry call. We iterate by index and let approveEntry
    // guard against double-writes via its own entry.status check.
    const snapshot = [...sourceEntries];
    for (let i = 0; i < snapshot.length; i++) {
      if (!snapshot[i].status) await approveEntry(i);
    }
  }

  function rejectAll() {
    setSourceEntries(es => es.map(e => ({ ...e, status: e.status || "rejected" })));
  }

  // ── Finalise session ───────────────────────────────────────────────────────────

  async function finaliseSession() {
    const approved = sourceEntries.filter(e => e.status === "approved" || e.status === "merged");
    const scholarIds = [...new Set(approved.map(e => e.data.scholar_id).filter(Boolean).map(Number))];

    try {
      await db().patch("/rest/v1/ingestion_sessions?session_id=eq." + session.session_id, {
        status: "committed",
        commit_notes: postCommitReport,
        scholars_processed: scholarIds,
        rows_created: approved.length,
      });
    } catch {} // Non-fatal — session record already has the data.

    if (isChunked && currentChunk < chunks.length - 1) {
      // More chunks remain — update carry-forward summary and advance to next chunk.
      const summary = (session.carry_forward_summary || "") +
        "\n\n[Chunk " + (currentChunk + 1) + " committed: " + approved.length + " rows written for scholars: " +
        approved.map(e => e.data.author_name || e.data.scholar_name || "unknown").join(", ") + "]";
      try {
        await db().patch("/rest/v1/ingestion_sessions?session_id=eq." + session.session_id, {
          carry_forward_summary: summary, chunk_index: currentChunk + 1, status: "draft",
        });
        setSession(s => ({ ...s, carry_forward_summary: summary, chunk_index: currentChunk + 1, status: "draft" }));
      } catch {}

      setCurrentChunk(c => c + 1);
      setPreviewOutput(""); setParsedProposal(null); setSourceEntries([]); setPostCommitReport("");
      setScholarCards([]); setStage(2);
    } else {
      resetSession();
      await loadHome();
      setStage(-1);
    }
  }

  return {
    // State
    stage, setStage,
    session, setSession,
    loading, loadingMsg,
    error, setError,
    homeData, homeLoading,
    s0, setS0,
    sourceText, setSourceText,
    chunks, setChunks,
    currentChunk, setCurrentChunk,
    documentMap, setDocumentMap,
    isChunked, setIsChunked,
    dragOver, setDragOver,
    fileInputRef,
    previewOutput, setPreviewOutput,
    previewStreaming, setPreviewStreaming,
    parsedProposal, setParsedProposal,
    rawProposalCollapsed, setRawProposalCollapsed,
    scholarOrTopicAddedSincePreview, setScholarOrTopicAddedSincePreview,
    scholarCards, setScholarCards,
    reviewTopics, setReviewTopics,
    postCommitReport,
    sourceEntries, setSourceEntries,
    reportCollapsed, setReportCollapsed,
    // Functions
    loadReferenceData, resetSession, loadHome,
    createSession, resumeSession,
    handleFile, handleTextReady,
    runPreview, proceedToReview,
    buildCardsFromProposal,
    toggleTopicOnCard, setTopicConf, setCardField,
    runCommit, mergeEntry, approveEntry, rejectEntry,
    approveAll, rejectAll, finaliseSession,
    normaliseSource,
  };
}
