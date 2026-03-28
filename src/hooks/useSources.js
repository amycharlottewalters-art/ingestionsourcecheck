import { useState } from "react";
import { callClaudeFull } from "../lib/claude.js";
import { makeSupabase } from "../lib/supabase.js";
import { buildQualityCheckPrompt, buildConsistencyCheckPrompt } from "../lib/prompts.js";

// Strip JSON fences and parse; throws on malformed JSON.
function parseJsonResult(raw) {
  return JSON.parse(raw.replace(/```json|```/g, "").trim());
}

// A blank dup-scan entry for a row pair.
function makeDupEntry(rows, overlapScore, leastFullIdx, scores, recommendation) {
  return {
    rows, recommendation, leastFullIdx, overlapScore,
    scores, askingClaude: false,
    claudeRecommendation: null, status: null,
  };
}

// Build a queue entry from a source row, optionally seeding from a persisted result.
function makeQueueEntry(source, persistedResult = null) {
  if (persistedResult) {
    // Hydrate from Supabase — reconstruct per-flag resolved state
    return {
      source,
      result: persistedResult,
      status: _deriveStatus(persistedResult),
      editing: false,
      editData: {},
      itemError: null,
    };
  }
  return { source, result: null, status: null, editing: false, editData: {}, itemError: null };
}

// Derive a queue item status from a persisted result.
function _deriveStatus(result) {
  if (!result) return null;
  if (result.overall === "clean") return "kept";
  const allFlags = [...(result.claim_flags || []), ...(result.angle_flags || [])];
  const allResolved = allFlags.length > 0 && allFlags.every(f => f.resolution);
  return allResolved ? "corrected" : null;
}

// After applying or dismissing a flag, recalculate overall status and health_check_status.
function _recalcResult(result) {
  const allFlags = [...(result.claim_flags || []), ...(result.angle_flags || [])];
  const allResolved = allFlags.length > 0 && allFlags.every(f => f.resolution);
  const anyUnresolved = allFlags.some(f => !f.resolution);
  return {
    ...result,
    _allResolved: allResolved,
    _anyUnresolved: anyUnresolved,
  };
}

export function useSources(config, allScholars) {
  // ── Source list ──────────────────────────────────────────────────────────────
  const [allSources, setAllSources] = useState([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [sourcesError, setSourcesError] = useState("");

  // ── Duplicate scan ────────────────────────────────────────────────────────────
  const [dupScanResults, setDupScanResults] = useState([]);
  const [dupScanDone, setDupScanDone] = useState(false);
  const [dupScanRunning, setDupScanRunning] = useState(false);

  // ── Quality check ─────────────────────────────────────────────────────────────
  const [qualityQueue, setQualityQueue] = useState([]);
  const [qualityRunning, setQualityRunning] = useState(false);
  const [qualityIdx, setQualityIdx] = useState(0);
  // Three filter states: "unchecked" | "flagged" | "clean"
  const [qualityFilter, setQualityFilter] = useState("unchecked");
  const [qualityDone, setQualityDone] = useState(false);
  const [consistencyRunning, setConsistencyRunning] = useState(false);

  const db = () => makeSupabase(config.supabaseUrl, config.supabaseKey);

  // ── Data loading ──────────────────────────────────────────────────────────────

  async function loadAllSources() {
    setSourcesLoading(true);
    setSourcesError("");
    try {
      const rows = await db().get(
        "/rest/v1/sources?select=source_id,scholar_id,author_name,source_title,source_year,content_summary,devotional_angles,theological_themes,scripture_references,topic_ids,citation_confidence,key_terms,health_check_status,quality_check_result,is_active,ingestion_session_id&is_active=eq.true&is_default_library=eq.true&order=author_name,topic_ids"
      );
      setAllSources(rows);
    } catch (e) {
      setSourcesError("loadAllSources failed: " + e.message);
    }
    setSourcesLoading(false);
  }

  // Load ALL sources that have a persisted quality_check_result into the queue.
  // The active filter is then applied as a view-level filter in the component.
  function loadPersistedResults() {
    const withResults = allSources.filter(s => s.quality_check_result);
    if (!withResults.length) {
      setSourcesError("No checked sources found. Run the quality check first.");
      return;
    }
    const queue = allSources.map(row =>
      makeQueueEntry(row, row.quality_check_result || null)
    );
    setQualityQueue(queue);
    setQualityDone(true);
  }

  // Filter sources according to the three-way filter.
  function _filterSources(sources, filter) {
    if (filter === "unchecked") return sources.filter(s => !s.quality_check_result);
    if (filter === "flagged") {
      return sources.filter(s => {
        if (!s.quality_check_result) return false;
        const r = s.quality_check_result;
        const allFlags = [...(r.claim_flags || []), ...(r.angle_flags || [])];
        return allFlags.some(f => !f.resolution);
      });
    }
    if (filter === "clean") {
      return sources.filter(s => {
        if (!s.quality_check_result) return false;
        const r = s.quality_check_result;
        if (r.overall === "clean") return true;
        const allFlags = [...(r.claim_flags || []), ...(r.angle_flags || [])];
        return allFlags.length === 0 || allFlags.every(f => f.resolution);
      });
    }
    return sources;
  }

  // ── Duplicate scan helpers ────────────────────────────────────────────────────

  function sourceFullnessScore(row) {
    const claims = Array.isArray(row.content_summary)
      ? row.content_summary.length
      : (row.content_summary || "").split("\n").filter(Boolean).length;
    const angles = (row.devotional_angles || []).length;
    const hasTitle = row.source_title ? 1 : 0;
    const confScore = row.citation_confidence === "high" ? 2 : row.citation_confidence === "medium" ? 1 : 0;
    return claims * 2 + angles * 2 + hasTitle * 3 + confScore * 2
      + (row.theological_themes || []).length
      + (row.scripture_references || []).length;
  }

  function contentOverlapScore(a, b) {
    const getWords = r => new Set(
      (Array.isArray(r.content_summary) ? r.content_summary.join(" ") : (r.content_summary || ""))
        .toLowerCase().split(/\W+/).filter(w => w.length > 4)
    );
    const wordsA = getWords(a);
    const wordsB = getWords(b);
    if (!wordsA.size || !wordsB.size) return 0;
    let shared = 0;
    wordsA.forEach(w => { if (wordsB.has(w)) shared++; });
    return shared / Math.max(wordsA.size, wordsB.size);
  }

  // ── Duplicate scan ────────────────────────────────────────────────────────────

  function runDuplicateScan() {
    setDupScanRunning(true);
    setDupScanResults([]);
    setDupScanDone(false);

    const groups = {};
    allSources.forEach(row => {
      const topicId = (row.topic_ids || [])[0];
      if (!topicId) return;
      const key = row.scholar_id + "-" + topicId;
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    });

    const results = [];
    Object.values(groups).forEach(rows => {
      if (rows.length < 2) return;
      for (let i = 0; i < rows.length; i++) {
        for (let j = i + 1; j < rows.length; j++) {
          const overlap = contentOverlapScore(rows[i], rows[j]);
          const scoreI = sourceFullnessScore(rows[i]);
          const scoreJ = sourceFullnessScore(rows[j]);
          const leastFullIdx = scoreI <= scoreJ ? i : j;
          const sameTitle = rows[i].source_title && rows[j].source_title &&
            rows[i].source_title.toLowerCase().trim() === rows[j].source_title.toLowerCase().trim();
          const sameYear = rows[i].source_year === rows[j].source_year;

          let recommendation;
          if (overlap > 0.8) recommendation = "delete-least-full";
          else if (overlap > 0.6 || (sameTitle && sameYear && overlap > 0.3)) recommendation = "merge";
          else if (overlap > 0.3) recommendation = "review";
          else recommendation = "keep-both";

          results.push(makeDupEntry(
            [rows[i], rows[j]], Math.round(overlap * 100), leastFullIdx, [scoreI, scoreJ], recommendation
          ));
        }
      }
    });

    results.sort((a, b) => b.overlapScore - a.overlapScore);
    setDupScanResults(results);
    setDupScanRunning(false);
    setDupScanDone(true);
  }

  async function askClaudeAboutDuplicate(idx) {
    setDupScanResults(r => r.map((item, i) => i === idx ? { ...item, askingClaude: true } : item));
    const { rows: [rowA, rowB] } = dupScanResults[idx];

    const formatRow = row => {
      const label = row.author_name +
        (row.source_title ? " -- " + row.source_title : "") +
        (row.source_year ? " (" + row.source_year + ")" : "");
      const summary = Array.isArray(row.content_summary)
        ? row.content_summary.join("\n")
        : (row.content_summary || "");
      return label + "\nClaims: " + summary + "\nDevotional angles: " + (row.devotional_angles || []).join(" | ");
    };

    const prompt = [
      "You are reviewing two source database entries for the same scholar and topic.",
      "ROW A: " + formatRow(rowA),
      "",
      "ROW B: " + formatRow(rowB),
      "",
      "Recommend one of: merge | delete-row-a | delete-row-b | keep-both",
      "Respond with ONLY valid JSON: {\"recommendation\": \"merge|delete-row-a|delete-row-b|keep-both\", \"reason\": \"one sentence\"}",
    ].join("\n");

    try {
      const result = await callClaudeFull(config.anthropicKey, {
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200, temperature: 0.2,
      });
      const parsed = parseJsonResult(result);
      setDupScanResults(r => r.map((item, i) => i === idx
        ? { ...item, askingClaude: false, claudeRecommendation: parsed }
        : item));
    } catch (e) {
      const msg = e.message.includes("401") || e.message.includes("403")
        ? "API key invalid or quota exceeded. Check your Anthropic key in Configuration."
        : e.message.includes("429")
          ? "Rate limit hit. Wait a moment and try again."
          : "Claude call failed: " + e.message;
      setSourcesError(msg);
      setDupScanResults(r => r.map((item, i) => i === idx
        ? { ...item, askingClaude: false, claudeError: msg }
        : item));
    }
  }

  async function mergeDupRows(dupIdx) {
    const item = dupScanResults[dupIdx];
    if (!item) return;
    const [rowA, rowB] = item.rows;

    setDupScanResults(r => r.map((item, i) => i === dupIdx ? { ...item, askingClaude: true } : item));

    const getSummary = row => Array.isArray(row.content_summary)
      ? row.content_summary.join("\n")
      : (row.content_summary || "");

    const prompt = [
      "You are merging two source entries for the same scholar and topic into one enriched row.",
      "ROW A: " + rowA.author_name + (rowA.source_title ? " -- " + rowA.source_title : ""),
      "Content Summary: " + getSummary(rowA),
      "Devotional Angles: " + (rowA.devotional_angles || []).join("\n"),
      "",
      "ROW B: " + rowB.author_name + (rowB.source_title ? " -- " + rowB.source_title : ""),
      "Content Summary: " + getSummary(rowB),
      "Devotional Angles: " + (rowB.devotional_angles || []).join("\n"),
      "",
      "Produce a single merged entry. Respond with ONLY a JSON object (no fences):",
      "{\"source_title\": \"...\", \"source_year\": null, \"content_summary\": [\"1. ...\"], \"devotional_angles\": [\"...\"], \"theological_themes\": [\"...\"], \"scripture_references\": [\"...\"]}",
    ].join("\n");

    try {
      const result = await callClaudeFull(config.anthropicKey, {
        messages: [{ role: "user", content: prompt }],
        max_tokens: 3000, temperature: 0.3,
      });
      const merged = parseJsonResult(result);
      const baseRow = item.scores[0] >= item.scores[1] ? rowA : rowB;

      await db().post("/rest/v1/sources", {
        user_id: null, scholar_id: baseRow.scholar_id, source_type: "scholar",
        author_name: baseRow.author_name,
        source_title: merged.source_title || baseRow.source_title,
        source_year: merged.source_year || baseRow.source_year,
        content_summary: Array.isArray(merged.content_summary)
          ? merged.content_summary.join("\n")
          : (merged.content_summary || ""),
        devotional_angles: merged.devotional_angles || [],
        theological_themes: merged.theological_themes || [],
        scripture_references: merged.scripture_references || [],
        topic_ids: baseRow.topic_ids,
        citation_confidence: baseRow.citation_confidence,
        topic_assignment_confidence: baseRow.topic_assignment_confidence || {},
        is_default_library: true, is_primary: baseRow.is_primary || false,
        is_active: true, health_check_status: "clean",
        key_terms: baseRow.key_terms || "", generation_performance: "unchecked",
        ingestion_session_id: baseRow.ingestion_session_id, short_quotes: [],
      });

      await db().patch("/rest/v1/sources?source_id=eq." + rowA.source_id, { is_active: false });
      await db().patch("/rest/v1/sources?source_id=eq." + rowB.source_id, { is_active: false });

      setDupScanResults(r => r.map((item, i) => i === dupIdx
        ? { ...item, status: "merged", askingClaude: false }
        : item));
      await loadAllSources();
    } catch (e) {
      setDupScanResults(r => r.map((item, i) => i === dupIdx
        ? { ...item, askingClaude: false, claudeError: e.message }
        : item));
    }
  }

  async function deleteDupRow(dupIdx, rowIdx) {
    const item = dupScanResults[dupIdx];
    if (!item?.rows[rowIdx]) return;
    try {
      await db().patch("/rest/v1/sources?source_id=eq." + item.rows[rowIdx].source_id, { is_active: false });
      setDupScanResults(r => r.map((item, i) => i === dupIdx ? { ...item, status: "deleted" } : item));
      await loadAllSources();
    } catch (e) {
      setDupScanResults(r => r.map((item, i) => i === dupIdx ? { ...item, claudeError: e.message } : item));
    }
  }

  function dismissDup(idx) {
    setDupScanResults(r => r.map((item, i) => i === idx ? { ...item, status: "kept" } : item));
  }

  // ── Quality check — per-row pass ──────────────────────────────────────────────

  async function runQualityCheck() {
    // Always run on unchecked rows — the filter is for browsing persisted results, not deciding what to check.
    const unchecked = allSources.filter(s => !s.quality_check_result);
    if (!unchecked.length) { setSourcesError("All sources have already been checked. Use the filter to browse results."); return; }

    setQualityRunning(true);
    setQualityDone(false);
    setQualityQueue(unchecked.map(row => makeQueueEntry(row)));
    setQualityIdx(0);

    for (let i = 0; i < unchecked.length; i++) {
      setQualityIdx(i);
      const row = unchecked[i];
      const scholarMeta = allScholars.find(sc => sc.scholar_id === row.scholar_id) || null;
      try {
        const raw = await callClaudeFull(config.anthropicKey, {
          messages: [{ role: "user", content: buildQualityCheckPrompt(row, scholarMeta) }],
          max_tokens: 2500, temperature: 0.2,
        });
        const parsed = parseJsonResult(raw);

        // Add checked_at timestamp and initialise resolution state on each flag.
        const result = {
          ...parsed,
          checked_at: new Date().toISOString(),
          claim_flags: (parsed.claim_flags || []).map((f, fi) => ({
            ...f, id: "cf_" + fi, resolution: null,
          })),
          angle_flags: (parsed.angle_flags || []).map((f, fi) => ({
            ...f, id: "af_" + fi, resolution: null,
          })),
        };

        const healthStatus = result.overall === "clean" ? "clean" : "flagged";

        // Persist to Supabase.
        try {
          await db().patch("/rest/v1/sources?source_id=eq." + row.source_id, {
            health_check_status: healthStatus,
            quality_check_result: result,
          });
        } catch {}

        setQualityQueue(q => q.map((item, idx) => idx === i ? { ...item, result } : item));
      } catch (e) {
        setQualityQueue(q => q.map((item, idx) => idx === i
          ? { ...item, result: { overall: "error", error: e.message, claim_flags: [], angle_flags: [] } }
          : item));
      }
    }

    setQualityRunning(false);
    setQualityDone(true);
  }

  // ── Quality check — cross-row consistency pass ────────────────────────────────

  async function runConsistencyCheck() {
    // Group all sources by scholar_id, only include scholars with 2+ rows.
    const byScholar = {};
    allSources.forEach(row => {
      if (!row.scholar_id) return;
      if (!byScholar[row.scholar_id]) byScholar[row.scholar_id] = [];
      byScholar[row.scholar_id].push(row);
    });
    const scholars = Object.entries(byScholar).filter(([, rows]) => rows.length >= 2);

    if (!scholars.length) { setSourcesError("No scholars have multiple source rows — nothing to consistency-check."); return; }

    setConsistencyRunning(true);

    for (const [scholarId, rows] of scholars) {
      const scholarName = rows[0].author_name;
      const rowsForPrompt = rows.map(r => ({
        source_id: r.source_id,
        source_title: r.source_title || null,
        content_summary: Array.isArray(r.content_summary)
          ? r.content_summary.join("\n")
          : (r.content_summary || ""),
      }));

      try {
        const raw = await callClaudeFull(config.anthropicKey, {
          messages: [{ role: "user", content: buildConsistencyCheckPrompt(scholarName, rowsForPrompt) }],
          max_tokens: 800, temperature: 0.2,
        });
        const parsed = parseJsonResult(raw);

        if (parsed.has_issues && parsed.consistency_flags?.length > 0) {
          // Write consistency flags onto each participating source row's quality_check_result.
          for (const flag of parsed.consistency_flags) {
            for (const sourceId of [flag.source_id_a, flag.source_id_b]) {
              const row = allSources.find(r => r.source_id === sourceId);
              if (!row) continue;
              const existing = row.quality_check_result || {
                overall: "minor-issues", confidence: "medium", unverifiable: false,
                claim_flags: [], angle_flags: [], checked_at: new Date().toISOString(),
              };
              const updated = {
                ...existing,
                consistency_flags: [
                  ...(existing.consistency_flags || []),
                  { ...flag, resolution: null },
                ],
                overall: existing.overall === "clean" ? "minor-issues" : existing.overall,
              };
              try {
                await db().patch("/rest/v1/sources?source_id=eq." + sourceId, {
                  quality_check_result: updated,
                  health_check_status: "flagged",
                });
              } catch {}
            }
          }
        }
      } catch {} // Non-fatal — skip failed scholars and continue.
    }

    setConsistencyRunning(false);
    // Reload to pick up the newly written consistency flags.
    await loadAllSources();
  }

  // ── Per-flag actions ──────────────────────────────────────────────────────────

  // Apply a single claim suggestion (rewrite or delete) to the source row.
  async function applyClaimSuggestion(qIdx, flagId) {
    const item = qualityQueue[qIdx];
    if (!item?.result) return;

    const flag = item.result.claim_flags.find(f => f.id === flagId);
    if (!flag) return;

    // Get the current claims array from the source.
    const currentClaims = Array.isArray(item.source.content_summary)
      ? [...item.source.content_summary]
      : (item.source.content_summary || "").split("\n").filter(Boolean);

    // claim_index is 1-based.
    const idx = flag.claim_index - 1;
    let newClaims;
    if (flag.action === "delete") {
      newClaims = currentClaims.filter((_, i) => i !== idx);
    } else {
      newClaims = currentClaims.map((c, i) => i === idx ? flag.suggestion : c);
    }

    const updatedResult = {
      ...item.result,
      claim_flags: item.result.claim_flags.map(f =>
        f.id === flagId ? { ...f, resolution: "applied" } : f
      ),
    };
    const recalced = _recalcResult(updatedResult);
    const newHealthStatus = recalced._allResolved ? "clean" : "flagged";

    try {
      await db().patch("/rest/v1/sources?source_id=eq." + item.source.source_id, {
        content_summary: newClaims.join("\n"),
        health_check_status: newHealthStatus,
        quality_check_result: updatedResult,
      });
      setQualityQueue(q => q.map((entry, i) => i === qIdx ? {
        ...entry,
        result: updatedResult,
        status: recalced._allResolved ? "corrected" : null,
        itemError: null,
      } : entry));
      await loadAllSources();
    } catch (e) {
      setQualityQueue(q => q.map((entry, i) => i === qIdx ? { ...entry, itemError: e.message } : entry));
    }
  }

  async function dismissClaimFlag(qIdx, flagId) {
    const item = qualityQueue[qIdx];
    if (!item?.result) return;

    const updatedResult = {
      ...item.result,
      claim_flags: item.result.claim_flags.map(f =>
        f.id === flagId ? { ...f, resolution: "dismissed" } : f
      ),
    };
    const recalced = _recalcResult(updatedResult);
    const newHealthStatus = recalced._allResolved ? "clean" : "flagged";

    try {
      await db().patch("/rest/v1/sources?source_id=eq." + item.source.source_id, {
        health_check_status: newHealthStatus,
        quality_check_result: updatedResult,
      });
      setQualityQueue(q => q.map((entry, i) => i === qIdx ? {
        ...entry,
        result: updatedResult,
        status: recalced._allResolved ? "corrected" : null,
        itemError: null,
      } : entry));
    } catch (e) {
      setQualityQueue(q => q.map((entry, i) => i === qIdx ? { ...entry, itemError: e.message } : entry));
    }
  }

  async function applyAngleSuggestion(qIdx, flagId) {
    const item = qualityQueue[qIdx];
    if (!item?.result) return;

    const flag = item.result.angle_flags.find(f => f.id === flagId);
    if (!flag) return;

    const currentAngles = [...(item.source.devotional_angles || [])];
    const idx = flag.angle_index - 1;
    const newAngles = currentAngles.map((a, i) => i === idx ? flag.suggestion : a);

    const updatedResult = {
      ...item.result,
      angle_flags: item.result.angle_flags.map(f =>
        f.id === flagId ? { ...f, resolution: "applied" } : f
      ),
    };
    const recalced = _recalcResult(updatedResult);
    const newHealthStatus = recalced._allResolved ? "clean" : "flagged";

    try {
      await db().patch("/rest/v1/sources?source_id=eq." + item.source.source_id, {
        devotional_angles: newAngles,
        health_check_status: newHealthStatus,
        quality_check_result: updatedResult,
      });
      setQualityQueue(q => q.map((entry, i) => i === qIdx ? {
        ...entry,
        result: updatedResult,
        status: recalced._allResolved ? "corrected" : null,
        itemError: null,
      } : entry));
      await loadAllSources();
    } catch (e) {
      setQualityQueue(q => q.map((entry, i) => i === qIdx ? { ...entry, itemError: e.message } : entry));
    }
  }

  async function dismissAngleFlag(qIdx, flagId) {
    const item = qualityQueue[qIdx];
    if (!item?.result) return;

    const updatedResult = {
      ...item.result,
      angle_flags: item.result.angle_flags.map(f =>
        f.id === flagId ? { ...f, resolution: "dismissed" } : f
      ),
    };
    const recalced = _recalcResult(updatedResult);
    const newHealthStatus = recalced._allResolved ? "clean" : "flagged";

    try {
      await db().patch("/rest/v1/sources?source_id=eq." + item.source.source_id, {
        health_check_status: newHealthStatus,
        quality_check_result: updatedResult,
      });
      setQualityQueue(q => q.map((entry, i) => i === qIdx ? {
        ...entry,
        result: updatedResult,
        status: recalced._allResolved ? "corrected" : null,
        itemError: null,
      } : entry));
    } catch (e) {
      setQualityQueue(q => q.map((entry, i) => i === qIdx ? { ...entry, itemError: e.message } : entry));
    }
  }

  async function markQualityKept(qIdx) {
    const item = qualityQueue[qIdx];
    if (!item) return;
    // Mark all flags dismissed and status clean.
    const updatedResult = item.result ? {
      ...item.result,
      claim_flags: (item.result.claim_flags || []).map(f => ({ ...f, resolution: "dismissed" })),
      angle_flags: (item.result.angle_flags || []).map(f => ({ ...f, resolution: "dismissed" })),
    } : null;
    try {
      await db().patch("/rest/v1/sources?source_id=eq." + item.source.source_id, {
        health_check_status: "clean",
        ...(updatedResult ? { quality_check_result: updatedResult } : {}),
      });
      setQualityQueue(q => q.map((entry, i) => i === qIdx ? {
        ...entry, result: updatedResult || entry.result, status: "kept", itemError: null,
      } : entry));
    } catch (e) {
      setQualityQueue(q => q.map((entry, i) => i === qIdx ? { ...entry, itemError: e.message } : entry));
    }
  }

  async function deleteQualityRow(qIdx) {
    const item = qualityQueue[qIdx];
    if (!item) return;
    try {
      await db().patch("/rest/v1/sources?source_id=eq." + item.source.source_id, { is_active: false });
      setQualityQueue(q => q.map((entry, i) => i === qIdx ? { ...entry, status: "deleted", itemError: null } : entry));
      await loadAllSources();
    } catch (e) {
      setQualityQueue(q => q.map((entry, i) => i === qIdx ? { ...entry, itemError: e.message } : entry));
    }
  }

  return {
    // State
    allSources, sourcesLoading, sourcesError, setSourcesError,
    dupScanResults, setDupScanResults, dupScanDone, setDupScanDone, dupScanRunning,
    qualityQueue, setQualityQueue, qualityRunning, qualityIdx,
    qualityFilter, setQualityFilter, qualityDone, setQualityDone,
    consistencyRunning,
    // Functions
    loadAllSources,
    runDuplicateScan, askClaudeAboutDuplicate, mergeDupRows, deleteDupRow, dismissDup,
    runQualityCheck, runConsistencyCheck, loadPersistedResults,
    applyClaimSuggestion, dismissClaimFlag,
    applyAngleSuggestion, dismissAngleFlag,
    markQualityKept, deleteQualityRow,
  };
}
