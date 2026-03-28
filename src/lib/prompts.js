import { DOMAINS } from "../constants.js";
import { today } from "./utils.js";

export function buildDocumentMapPrompt(text, sourceType, sc) {
  return `DOCUMENT MAP PROMPT

You are producing a structured map of a theological document before it is processed in chunks. This map will be prepended to every chunk's preview call to ensure cross-document consistency.

SOURCE TYPE: ${sourceType}

FULL DOCUMENT:
${text.slice(0, 60000)}

ALLOWED SCHOLARS (scholar_id | scholar_name):
${sc.map(s => "" + s.scholar_id + " | " + s.scholar_name).join("\n")}

Produce a JSON document map with exactly these fields:
{
"main_scholars": [{"scholar_id": integer, "scholar_name": "string", "works_mentioned": ["title"]}],
"key_terms": [{"term": "string", "location": "brief description"}],
"major_arguments": ["brief description of each major argument"],
"theological_themes": ["theme1", "theme2"],
"unresolved_threads": ["arguments that seem incomplete and may continue in later sections"]
}

Produce ONLY valid JSON. No prose before or after.`;
}

export async function buildExistingSourcesMatrix(sc, topics, dbClient) {
  try {
    const d = dbClient;
    const sources = await d.get("/rest/v1/sources?select=scholar_id,topic_ids&is_active=eq.true&scholar_id=not.is.null");
    const topicDomainMap = {};
    topics.forEach(t => { topicDomainMap[t.topic_id] = t.domain; });
    const scholarMap = {};
    sc.forEach(s => { scholarMap[s.scholar_id] = { name: s.scholar_name, domainCounts: {}, total: 0 }; });
    sources.forEach(row => {
      if (!row.scholar_id || !scholarMap[row.scholar_id]) return;
      scholarMap[row.scholar_id].total++;
      (row.topic_ids || []).forEach(tid => {
        const dom = topicDomainMap[tid];
        if (dom) {
          scholarMap[row.scholar_id].domainCounts[dom] =
            (scholarMap[row.scholar_id].domainCounts[dom] || 0) + 1;
        }
      });
    });
    return sc.map(s => {
      const m = scholarMap[s.scholar_id];
      if (!m) return "" + s.scholar_name + " | 0 rows";
      if (m.total === 0) return "" + s.scholar_name + " | 0 rows";
      const breakdown = Object.entries(m.domainCounts).map(([d, c]) => "" + d + ": " + c).join(", ");
      return "" + s.scholar_name + " | " + m.total + " rows" + (breakdown ? " | " + breakdown : "");
    }).join("\n");
  } catch { return ""; }
}

export async function buildPreviewPrompt(text, chunkIdx = null, totalChunks = null, sc, tp, documentMap = null, session = null) {
  const matrix = "";  // dbClient not available at preview stage
  // Send ALL topics -- no domain pre-filtering, Claude assigns freely
  const domainTopicText = DOMAINS.map(dom => {
    const dt = tp.filter(t => t.domain === dom.slug);
    if (!dt.length) return "";
    return "--- " + dom.slug + " ---\n" + dt.map(t => {
      let line = "" + t.topic_id + " | " + t.topic_display_name + " | " + t.topic_description;
      if (t.adjacent_topic_ids?.length) {
        const adjNames = t.adjacent_topic_ids.map(aid => {
          const found = tp.find(x => x.topic_id === aid);
          return found ? "" + aid + " (" + found.topic_display_name + ")" : String(aid);
        });
        line += " | ADJACENT TO: " + adjNames.join(", ");
      }
      return line;
    }).join("\n");
  }).filter(Boolean).join("\n\n");
  const fullIndex = "";
  const chunkBlock = (chunkIdx !== null)
    ? `\nCHUNK CONTEXT: This is chunk ${chunkIdx + 1} of ${totalChunks}. Focus only on material in this chunk. Do not duplicate claims already extracted in previous chunks.\n\nDOCUMENT MAP (full document context):\n${JSON.stringify(documentMap, null, 2)}\n\n${session?.carry_forward_summary ? `CARRY FORWARD SUMMARY (claims already extracted from previous chunks):\n${session.carry_forward_summary}` : ""}`
    : "";
  return `INGESTION PREVIEW PROMPT — VERSION 2

PURPOSE
Read the source material and produce a preview report. The preview is reviewed by the developer before the commit stage. After the human-readable sections, you will also output a single structured PROPOSED_DECISIONS block (see instructions at the end).

SOURCE TYPE: ${session.source_type}
TODAY'S DATE: ${today()}
${chunkBlock}

SOURCE MATERIAL:
${text}

ALLOWED SCHOLARS (scholar_id | canonical_name | strand | era):
${sc.map(s => "" + s.scholar_id + " | " + s.scholar_name + " | " + s.strand + " | " + s.era).join("\n")}

If the source material references a scholar NOT in this list: list every non-allowed scholar found and ask whether to proceed without them or stop entirely before proceeding.

EXISTING COVERAGE
${matrix}
Use this to avoid extracting claims substantially identical to existing entries. High row counts do not mean new material should be excluded — only genuine duplication of specific claims warrants exclusion. A scholar with many existing rows can still yield valuable new entries if the material covers distinct arguments or angles not already captured.

TOPIC REFERENCE — ALL DOMAINS
${domainTopicText}

PREVIEW OUTPUT — produce the following sections in plain English:

1. SCHOLARS FOUND
List each allowed scholar identified. For each: scholar_id, scholar_name, specific work or section if identifiable.

2. PROPOSED TOPIC ASSIGNMENTS
For each scholar found, list the 1-5 topic_ids you would assign (exact integers from TOPIC REFERENCE above — any domain) and your confidence in each (high / medium / low). Where two adjacent topics could both apply, name both, describe the ambiguity, state which is the better primary fit and why.

3. ADJACENCY FLAGS
List any cases of uncertainty between adjacent topics. Name both, describe ambiguity, make a recommendation. Developer resolves before commit.

4. COVERAGE GAPS
List any content that does not fit any existing topic in the declared domains. These are candidates for new topics.

5. CITATION CONFIDENCE NOTES
List cases where confidence is MEDIUM or LOW and why. Flag any titles you are uncertain about.

6. DUPLICATION FLAGS
List content that substantially duplicates an existing Sources entry based on EXISTING COVERAGE. Note the existing entry.

7. SUMMARY
X scholars identified. Y works. Estimated Z JSON objects in commit stage. Source type: ${session.source_type}.

---

PROPOSED_DECISIONS — after the plain English sections above, append a single JSON block in triple-backtick json fences containing your structured proposal. This block is parsed by the tool to pre-populate review cards and must be valid JSON.

The structure is:
{
"scholars": [
  {
    "scholar_id": <integer — exact scholar_id from ALLOWED SCHOLARS>,
    "scholar_name": "<canonical name>",
    "source_title": "<identified title or null>",
    "source_year": <integer or null>,
    "overall_confidence": "high" | "medium" | "low",
    "include": true,
    "proposed_topics": [
      { "topic_id": <integer>, "confidence": "high" | "medium" | "low" }
    ],
    "flags": ["any adjacency, duplication or citation note specific to this scholar"]
  }
],
"non_allowed_scholars": [
  { "name": "<name as it appears in source>", "relevance": "<one sentence>" }
],
"coverage_gaps": ["short topic name", "another gap"]
}

Rules for this block:
- scholar_id must be an exact integer from the ALLOWED SCHOLARS list above — do not invent ids
- topic_id values must be exact integers from TOPIC REFERENCE — any domain
- Include every scholar identified in section 1, even those flagged as uncertain
- source_title: use the title as it appears in the source material; null if not identifiable
- overall_confidence: your confidence that the scholar is correctly identified and the source correctly attributed
- proposed_topics: 1-5 topics maximum per scholar
- flags: brief notes only — adjacency uncertainty, duplication risk, citation gaps`;
}

export async function buildCommitPrompt(text, decisions, s0, allTopics, scholars, session, dbClient) {
  const matrix = await buildExistingSourcesMatrix(scholars, allTopics, dbClient);
  const topicRef = allTopics.map(t => "" + t.topic_id + " | " + t.topic_display_name + " | " + t.topic_description).join("\n");
  const decisionsText = decisions.map(d => {
    const topicLines = Object.entries(d.topic_assignments).map(([tid, conf]) => {
      const t = allTopics.find(x => x.topic_id === parseInt(tid, 10));
      return "  topic_id: " + tid + (t ? " (" + t.topic_display_name + ")" : "") + " | confidence: " + conf;
    }).join("\n");
    return "Scholar: " + d.scholar_name + " (id: " + d.scholar_id + ")\nSource title: " + (d.source_title || "null") + "\nSource year: " + (d.source_year || "null") + "\nOverall confidence: " + d.confidence + "\nTopics:\n" + topicLines;
  }).join("\n\n");
  return `INGESTION COMMIT PROMPT

PURPOSE
You confirmed the decisions below in the preview stage. Now produce the final structured source entries for writing to the database. One JSON object per scholar per topic assignment.

SOURCE TYPE: ${s0.source_type}
TODAY'S DATE: ${today()}
SESSION DESCRIPTION: ${session?.source_description || ""}

SOURCE MATERIAL:
${text}

CONFIRMED DECISIONS:
${decisionsText}

EXISTING COVERAGE (scholar | rows | domain breakdown):
${matrix}

TOPIC REFERENCE:
${topicRef}

OUTPUT FORMAT
First, produce a brief plain-English pre-commit report covering:
- Any topic assignment changes from preview to commit
- Any titles assigned as MEDIUM confidence (explain why)
- Any content you are NOT including due to duplication (with reason)

Then, for each scholar × topic combination, produce a JSON object in triple-backtick json fences. One object per fence. Each object must have exactly these fields.

── DEVOTIONAL ANGLES — READ THIS CAREFULLY ──

devotional_angles is the most important field. These are used directly in a devotional app read by people with a wide range of faith backgrounds, including people who have been hurt by religion, people with serious doubts, and people who do not hold conventional evangelical assumptions.

Produce as many angles as genuinely arise from the material — do not aim for a fixed number. Each angle must meet ALL of the following standards:

GROUNDED: The angle must be impossible to write without this specific scholar's argument. If it could appear in any generic devotional without referencing this scholar's work, discard it and find something more specific.

INVITATIONAL: Prefer angles that open a question or create space for reflection rather than telling the reader what to think or feel. A statement is acceptable only if it expresses something the scholarship genuinely establishes and the topic is not theologically contested — do not make doctrinal assertions on contested questions.

NOT CHRISTIANESE: Avoid stock phrases that have been emptied of meaning through overuse — "walk with the Lord", "trust God's plan", "let Jesus into your heart", "God is good all the time", "claim the promise". If a phrase sounds like it belongs on a motivational poster in a church foyer, rewrite it.

NOT MANIPULATIVE: Do not use guilt, fear of judgement, shame, or emotional coercion to produce a devotional response. Do not assume the reader has an uncomplicated or positive relationship with God, church, or religious authority. An angle that would feel punishing or alienating to someone with religious wounds is not acceptable.

NOT DISCRIMINATORY: No language, framing, or assumption that marginalises or excludes any person or group — including LGBTQ+ people, women, people of other faiths, or people with mental illness. This is a hard rule with no exceptions.

HONEST ABOUT DIFFICULTY: If the scholarly argument surfaces a genuinely hard theological question, do not resolve it too neatly. An angle that wraps real difficulty in a tidy bow is weaker than one that sits honestly with the complexity.

──

{
"scholar_id": <integer>,
"author_name": "<canonical name>",
"source_title": "<title or null>",
"source_year": <integer or null>,
"topic_ids": [<single topic_id integer>],
"content_summary": ["1. claim", "2. claim", "3. claim"],
"devotional_angles": ["angle — grounded in this scholar's specific argument"],
"theological_themes": ["theme1", "theme2"],
"scripture_references": ["Book chapter:verse"],
"short_quotes": [{"quote": "exact short quote", "reference": "source location"}],
"key_terms": ["term: brief definition"],
"citation_confidence": "high | medium | low",
"topic_assignment_confidence": {"<topic_id>": "high | medium | low"},
"is_default_library": true,
"is_primary": false
}`;
}

export function buildScholarLookupPrompt(name, extraContext, existingData) {
  const contextBlock = extraContext && extraContext.trim()
    ? ["", "ADDITIONAL CONTEXT PROVIDED (treat as authoritative — use this to override or supplement your training knowledge):", extraContext.trim(), ""]
    : [];
  // If we already have data for this scholar, tell Claude so it can fill gaps
  // rather than guessing over things we already know
  const existingBlock = existingData ? (() => {
    const lines = ["", "EXISTING DATA FOR THIS SCHOLAR (already stored — do not overwrite with guesses):"];
    if (existingData.strand) lines.push("Strand: " + existingData.strand);
    if (existingData.era) lines.push("Era: " + existingData.era);
    if (existingData.scholar_tier) lines.push("Tier: " + existingData.scholar_tier);
    if (existingData.credentials) lines.push("Credentials: " + existingData.credentials);
    if (existingData.scholar_description) lines.push("Description: " + existingData.scholar_description);
    if (existingData.key_works && existingData.key_works.length > 0) lines.push("Key works: " + (Array.isArray(existingData.key_works) ? existingData.key_works.join(", ") : existingData.key_works));
    lines.push("", "Your task: confirm what is correct, correct anything wrong, and supplement any missing fields. Return the complete record — use the existing values for fields you cannot improve on.");
    lines.push("");
    return lines;
  })() : [];
  return [
    "You are a theological research assistant helping to build a database of biblical scholars.",
    "Look up the scholar named: " + name,
    "",
    "Provide a structured assessment based on your training knowledge. If you are not confident about a scholar, say so explicitly rather than guessing.",
    ...existingBlock,
    ...contextBlock,
    "",
    "Return ONLY valid JSON with exactly these fields:",
    "{",
    '  "scholar_name": "canonical full name",',
    '  "strand": "one of: critical | evangelical | catholic | feminist | social-prophet | patristic | jewish | orthodox | liberation | other",',
    '  "era": "historical or contemporary",',
    '  "scholar_tier": "one of: foundational | established | emerging | contested",',
    '  "credentials": "current or most recent institutional affiliation and role, one sentence",',
    '  "scholar_description": "2-3 sentences: who they are, their main scholarly contribution, and where they sit in the field",',
    '  "key_works": ["title1", "title2", "title3"],',
    '  "contested_areas": ["zero or more of: historical-method | theological-conclusions | textual-criticism | early-church-history | gender-and-authorship"],',
    '  "contested_note": "one sentence explaining the dispute, or null if contested_areas is empty",',
    '  "confidence": "high | medium | low — your confidence in this assessment",',
    '  "confidence_note": "brief explanation if confidence is medium or low"',
    "}",
    "",
    "Tier guidance:",
    "- foundational: work has defined the field, cited by virtually all subsequent scholars",
    "- established: strong peer recognition, broadly accepted in mainstream scholarship",
    "- emerging: credible newer voice or specialist with growing recognition",
    "- contested: significant but disputed — conclusions rejected by a substantial portion of the field",
    "",
    "If you do not recognise this scholar, set confidence to low and explain in confidence_note.",
    "Do not invent credentials or works you are not certain of.",
    "Respond with ONLY the JSON object. No prose before or after.",
  ].join("\n");
}

export function buildSenseCheckPrompt(scholar) {
  return [
    "You are a theological research assistant sense-checking a scholar database entry.",
    "",
    "Scholar entry to review:",
    "Name: " + scholar.scholar_name,
    "Strand: " + (scholar.strand || "not set"),
    "Era: " + (scholar.era || "not set"),
    "Tier: " + (scholar.scholar_tier || "not set"),
    "Credentials: " + (scholar.credentials || "not set"),
    "Description: " + (scholar.scholar_description || "not set"),
    "Key works: " + (scholar.key_works ? scholar.key_works.join(", ") : "not set"),
    "Contested areas: " + (scholar.contested_areas ? scholar.contested_areas.join(", ") : "none"),
    "Contested note: " + (scholar.contested_note || "none"),
    "",
    "Review this entry for accuracy. Check:",
    "1. Is the strand correct for this scholar's actual approach?",
    "2. Is the era correct (historical = pre-1900, contemporary = post-1900)?",
    "3. Is the tier accurate given their standing in the field?",
    "4. Are the credentials accurate to your knowledge?",
    "5. Is the description accurate and fair?",
    "6. Are the key works correctly attributed to this scholar?",
    "7. Are the contested areas accurate? Are there missing contested areas?",
    "",
    "Return ONLY valid JSON:",
    "{",
    '  "issues": ["list each specific inaccuracy or concern as a plain string"],',
    '  "suggestions": {',
    '    "strand": "corrected value or null if correct",',
    '    "era": "corrected value or null if correct",',
    '    "scholar_tier": "corrected value or null if correct",',
    '    "credentials": "corrected value or null if correct",',
    '    "scholar_description": "corrected value or null if correct",',
    '    "key_works": ["corrected array or null if correct"],',
    '    "contested_areas": ["corrected array or null if correct"],',
    '    "contested_note": "corrected value or null if correct"',
    '  },',
    '  "overall": "clean | minor-issues | significant-issues",',
    '  "confidence": "high | medium | low"',
    "}",
    "",
    "If the entry looks accurate, set issues to empty array and overall to clean.",
    "Only suggest changes you are confident about.",
    "Respond with ONLY the JSON object.",
  ].join("\n");
}

// ── Quality check prompts ──────────────────────────────────────────────────────

export function buildQualityCheckPrompt(row, scholarMeta) {
  const claims = Array.isArray(row.content_summary)
    ? row.content_summary
    : (row.content_summary || "").split("\n").filter(Boolean);
  const angles = row.devotional_angles || [];
  const citationConf = row.citation_confidence || "medium";

  // For low-confidence or unknown scholars, we cannot verify attribution — say so explicitly
  // rather than producing a false verdict.
  const scholarKnown = scholarMeta?.scholar_tier && scholarMeta?.scholar_description;
  const verificationNote = !scholarKnown
    ? "NOTE: Insufficient scholar metadata to verify attribution with confidence. Flag any claims that seem implausible but do not produce definitive verdicts on attribution."
    : "";

  const claimsText = claims.map((c, i) => "" + (i + 1) + ". " + c).join("\n");
  const anglesText = angles.map((a, i) => "" + (i + 1) + ". " + a).join("\n");

  return [
    "You are reviewing a source database entry for a Christian devotional app grounded in Historical Jesus scholarship.",
    "This app aims to be welcoming to people with doubts, wounds from religion, or complex faith journeys.",
    "",
    "SCHOLAR: " + row.author_name,
    scholarMeta ? "Tier: " + (scholarMeta.scholar_tier || "unknown") : "",
    scholarMeta ? "Strand: " + (scholarMeta.strand || "unknown") : "",
    scholarMeta ? "Description: " + (scholarMeta.scholar_description || "not available") : "",
    scholarMeta ? "Key works: " + (scholarMeta.key_works ? scholarMeta.key_works.join(", ") : "not available") : "",
    scholarMeta?.contested_areas?.length > 0 ? "Contested areas: " + scholarMeta.contested_areas.join(", ") : "",
    verificationNote,
    "",
    "SOURCE: " + (row.source_title || "untitled") + (row.source_year ? " (" + row.source_year + ")" : ""),
    "Citation confidence: " + citationConf,
    "",
    "CLAIMS (numbered for reference):",
    claimsText,
    "",
    "DEVOTIONAL ANGLES (numbered for reference):",
    anglesText,
    "",
    "── DIMENSION 1: CLAIM ACCURACY ──",
    citationConf === "low"
      ? "Citation confidence is LOW. Focus only on claims that seem implausible or contradictory given what is broadly known. Do not produce confident verdicts where you lack data."
      : "Review each claim for accuracy. Flag claims that misrepresent this scholar, overstate their position, or contradict their known methodology.",
    "",
    "For each flagged claim provide:",
    "- The claim number",
    "- What is wrong",
    "- A suggested rewrite that preserves the scholarly insight but corrects the problem, OR recommend deletion if the claim cannot be salvaged",
    "",
    "── DIMENSION 2: DEVOTIONAL ANGLE QUALITY ──",
    "Devotional angles are invitations to reflection, not academic statements. They are deliberately accessible.",
    "Review each angle on these four sub-checks:",
    "",
    "CHRISTIANESE: Does the angle use hollow stock phrases drained of meaning through overuse? (e.g. 'let Jesus into your heart', 'trust God's plan', 'God is good all the time', 'walk with the Lord'). These may sound spiritual but prompt no genuine thought.",
    "",
    "DIRECTIVE vs INVITATIONAL: Does the angle tell people what to think or feel ('this shows us we must...', 'we should always...') rather than opening a question or inviting exploration? Good angles create space; they do not close it.",
    "",
    "HARM / MANIPULATION: Does the angle use guilt, fear, shame, or authority-coercion to produce an emotional response? Would it feel punishing or alienating to someone who has been hurt by religion, church, or religious authority figures? Flag anything that assumes an uncomplicated relationship with God or faith.",
    "",
    "DISCRIMINATION: Does the angle contain any language, assumption, or framing that could be read as exclusionary, demeaning, or harmful toward any person or group — including LGBTQ+ people, women, people of colour, those with mental illness, or people of other faiths? This is a zero-tolerance check. Flag anything that even implicitly marginalises.",
    "",
    "DEPTH: Does the angle resolve a genuinely hard theological question too easily or too neatly? Does it wrap difficulty up with a tidy bow when the honest response would be to sit with it?",
    "",
    "For each flagged angle provide:",
    "- The angle number",
    "- Which sub-check triggered (christianese / directive / harm / discrimination / depth)",
    "- What is wrong",
    "- A suggested rewrite that preserves the devotional intent but corrects the problem",
    "",
    "── OUTPUT FORMAT ──",
    "Respond with ONLY valid JSON:",
    "{",
    '  "overall": "clean | minor-issues | significant-issues",',
    '  "confidence": "high | medium | low",',
    '  "unverifiable": true/false,',
    '  "claim_flags": [',
    '    {',
    '      "claim_index": <integer, 1-based>,',
    '      "original": "<exact claim text>",',
    '      "issue": "<what is wrong>",',
    '      "action": "rewrite | delete",',
    '      "suggestion": "<rewritten claim, or null if action is delete>"',
    '    }',
    '  ],',
    '  "angle_flags": [',
    '    {',
    '      "angle_index": <integer, 1-based>,',
    '      "original": "<exact angle text>",',
    '      "check": "christianese | directive | harm | discrimination | depth",',
    '      "issue": "<what is wrong>",',
    '      "suggestion": "<rewritten angle>"',
    '    }',
    '  ]',
    "}",
    "",
    "If there are no claim flags, use an empty array. Same for angle flags.",
    "Do not invent problems. Only flag genuine issues.",
    "Respond with ONLY the JSON object.",
  ].filter(Boolean).join("\n");
}

export function buildConsistencyCheckPrompt(scholarName, rows) {
  // rows is an array of {source_id, source_title, content_summary (string)}
  const rowsText = rows.map((r, i) => {
    return "ROW " + (i + 1) + " (source_id: " + r.source_id + ")" +
      (r.source_title ? " — " + r.source_title : "") + ":\n" + r.content_summary;
  }).join("\n\n");

  return [
    "You are reviewing multiple source database entries for the same scholar to check for cross-row consistency.",
    "",
    "SCHOLAR: " + scholarName,
    "",
    "SOURCE ROWS:",
    rowsText,
    "",
    "Check whether the characterisation of this scholar's position is consistent across all rows.",
    "Look for:",
    "- Contradictory claims about the scholar's view on the same topic",
    "- One row overstating or understating a position described more accurately in another",
    "- A claim in one row that directly contradicts a claim in another",
    "",
    "Do NOT flag differences that are simply different aspects of the scholar's work.",
    "Only flag genuine contradictions or inconsistencies.",
    "",
    "Respond with ONLY valid JSON:",
    "{",
    '  "has_issues": true | false,',
    '  "consistency_flags": [',
    '    {',
    '      "source_id_a": <integer>,',
    '      "source_id_b": <integer>,',
    '      "issue": "<description of the contradiction>"',
    '    }',
    '  ]',
    "}",
    "",
    "If no issues found, return has_issues: false and an empty array.",
    "Respond with ONLY the JSON object.",
  ].join("\n");
}
