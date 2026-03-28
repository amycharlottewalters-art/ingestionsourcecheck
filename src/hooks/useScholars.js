import { useState } from "react";
import { callClaudeFull } from "../lib/claude.js";
import { makeSupabase } from "../lib/supabase.js";
import { buildScholarLookupPrompt, buildSenseCheckPrompt } from "../lib/prompts.js";
import { guessEraFromName, guessStrandFromName, TIER_COLOURS, TIER_OPTIONS, CONTESTED_AREA_OPTIONS } from "../constants.js";

// Constrained field values — must match Supabase check constraints.
const VALID_STRANDS = new Set(["critical","evangelical","catholic","feminist","social-prophet","patristic","jewish","orthodox","liberation","other"]);
const VALID_ERAS = new Set(["historical","contemporary"]);
const VALID_TIERS = new Set(["foundational","established","emerging","contested"]);

// Validate a sense-check suggestion patch against Supabase constraints.
// Returns { patch, warnings } where warnings lists fields Claude suggested invalid values for.
function validateSenseCheckPatch(suggestions, existing) {
  const patch = {};
  const warnings = [];
  const fields = ["strand","era","scholar_tier","credentials","scholar_description","key_works","contested_areas","contested_note"];
  for (const field of fields) {
    const val = suggestions[field];
    if (!val) continue;
    if (field === "strand" && !VALID_STRANDS.has(val)) {
      warnings.push({ field, invalid: val, valid: [...VALID_STRANDS] });
      continue;
    }
    if (field === "era" && !VALID_ERAS.has(val)) {
      warnings.push({ field, invalid: val, valid: [...VALID_ERAS] });
      continue;
    }
    if (field === "scholar_tier" && val && !VALID_TIERS.has(val)) {
      warnings.push({ field, invalid: val, valid: [...VALID_TIERS] });
      continue;
    }
    patch[field] = val;
  }
  return { patch, warnings };
}

// Default shape for the new-scholar form.
const EMPTY_NEW_SCHOLAR = {
  scholar_name: "", strand: "other", era: "contemporary",
  scholar_tier: "", credentials: "", scholar_description: "",
  key_works: "", contested_areas: [], contested_note: "",
  enrichContext: "",
};

// How many consecutive API failures abort a bulk operation.
const MAX_CONSECUTIVE_FAILURES = 3;

// Strip JSON fences and parse; throws on malformed JSON.
function parseJsonResult(raw) {
  return JSON.parse(raw.replace(/```json|```/g, "").trim());
}

// Build the patch object used by both single-enrich and bulk-enrich apply,
// ensuring we never overwrite existing data with empty Claude output.
function buildEnrichPatch(suggestion, existing) {
  const s = suggestion;
  const sc = existing;
  const patch = {
    strand: s.strand || sc.strand,
    era: s.era || sc.era,
    // Supabase check constraint: scholar_tier must be null, not empty string.
    scholar_tier: s.scholar_tier || sc.scholar_tier || null,
    credentials: s.credentials || sc.credentials || null,
    scholar_description: s.scholar_description || sc.scholar_description || null,
    key_works: (s.key_works?.length > 0) ? s.key_works : (sc.key_works || []),
    contested_areas: (s.contested_areas?.length > 0) ? s.contested_areas : (sc.contested_areas || []),
    contested_note: s.contested_note || sc.contested_note || null,
  };
  if (!patch.scholar_tier) patch.scholar_tier = null;
  return patch;
}

export function useScholars(config) {
  // ── Scholar list ────────────────────────────────────────────────────────────
  const [allScholars, setAllScholars] = useState([]);
  const [scholarsLoading, setScholarsLoading] = useState(false);
  const [scholarsError, setScholarsError] = useState("");

  // ── Add-scholar panel ───────────────────────────────────────────────────────
  const [addScholarOpen, setAddScholarOpen] = useState(false);
  const [addScholarPrefill, setAddScholarPrefill] = useState(null);
  const [newScholar, setNewScholar] = useState(EMPTY_NEW_SCHOLAR);

  // ── Inline edit ─────────────────────────────────────────────────────────────
  const [editingScholar, setEditingScholar] = useState(null);
  const [editScholarData, setEditScholarData] = useState({});

  // ── Detail panel ────────────────────────────────────────────────────────────
  const [selectedScholar, setSelectedScholar] = useState(null);

  // ── Single-scholar enrich ───────────────────────────────────────────────────
  const [enrichingScholarId, setEnrichingScholarId] = useState(null);
  const [singleEnrichResult, setSingleEnrichResult] = useState(null);

  // ── Scholar lookup (add form) ────────────────────────────────────────────────
  const [lookingUpScholar, setLookingUpScholar] = useState(false);
  const [scholarLookupResult, setScholarLookupResult] = useState(null);

  // ── Bulk enrich ──────────────────────────────────────────────────────────────
  const [enrichingAll, setEnrichingAll] = useState(false);
  const [enrichQueue, setEnrichQueue] = useState([]);
  const [enrichIdx, setEnrichIdx] = useState(0);

  // ── Sense check ──────────────────────────────────────────────────────────────
  const [senseChecking, setSenseChecking] = useState(false);
  const [senseCheckQueue, setSenseCheckQueue] = useState([]);
  const [senseCheckIdx, setSenseCheckIdx] = useState(0);

  // ── Active tool panel ────────────────────────────────────────────────────────
  const [activeScholarTool, setActiveScholarTool] = useState(null);

  const db = () => makeSupabase(config.supabaseUrl, config.supabaseKey);

  // ── Data loading ─────────────────────────────────────────────────────────────

  async function loadAllScholars() {
    setScholarsLoading(true);
    setScholarsError("");
    try {
      const rows = await db().get(
        "/rest/v1/allowed_scholars?select=scholar_id,scholar_name,strand,era,is_active,last_used_date,scholar_tier,scholar_description,credentials,key_works,contested_areas,contested_note&order=scholar_name"
      );
      setAllScholars(rows);
    } catch (e) {
      setScholarsError("loadAllScholars failed: " + e.message);
    }
    setScholarsLoading(false);
  }

  // ── Add / edit / toggle ──────────────────────────────────────────────────────

  async function addScholar() {
    if (!newScholar.scholar_name.trim()) { setScholarsError("Name is required."); return; }
    try {
      await db().post("/rest/v1/allowed_scholars", {
        scholar_name: newScholar.scholar_name.trim(),
        strand: newScholar.strand,
        era: newScholar.era,
        scholar_tier: newScholar.scholar_tier || null,
        credentials: newScholar.credentials || null,
        scholar_description: newScholar.scholar_description || null,
        key_works: newScholar.key_works
          ? newScholar.key_works.split(",").map(s => s.trim()).filter(Boolean)
          : [],
        contested_areas: newScholar.contested_areas || [],
        contested_note: newScholar.contested_note || null,
        is_active: true,
      });
      resetNewScholar();
      setScholarLookupResult(null);
      setAddScholarOpen(false);
      setAddScholarPrefill(null);
      await loadAllScholars();
    } catch (e) {
      setScholarsError("addScholar failed: " + e.message);
    }
  }

  function resetNewScholar() {
    setNewScholar(EMPTY_NEW_SCHOLAR);
  }

  async function saveScholarEdit(scholarId, dataOverride) {
    try {
      const patch = { ...(dataOverride || editScholarData) };
      if (typeof patch.key_works === "string") {
        patch.key_works = patch.key_works.split(",").map(s => s.trim()).filter(Boolean);
      }
      // Supabase check constraint: scholar_tier must be null, not empty string.
      if ("scholar_tier" in patch && !patch.scholar_tier) patch.scholar_tier = null;
      await db().patch("/rest/v1/allowed_scholars?scholar_id=eq." + scholarId, patch);
      setEditingScholar(null);
      setEditScholarData({});
      await loadAllScholars();
    } catch (e) {
      setScholarsError("saveScholarEdit failed: " + e.message);
      throw e;
    }
  }

  async function toggleScholarActive(scholar) {
    try {
      await db().patch("/rest/v1/allowed_scholars?scholar_id=eq." + scholar.scholar_id, {
        is_active: !scholar.is_active,
      });
      await loadAllScholars();
    } catch (e) {
      setScholarsError("toggleScholarActive failed: " + e.message);
    }
  }

  // ── Scholar lookup (add form) ─────────────────────────────────────────────────

  async function lookupScholar(name) {
    if (!name.trim()) return;
    setLookingUpScholar(true);
    setScholarLookupResult(null);
    try {
      const result = await callClaudeFull(config.anthropicKey, {
        messages: [{ role: "user", content: buildScholarLookupPrompt(name, newScholar.enrichContext) }],
        max_tokens: 800,
        temperature: 0.2,
      });
      const parsed = parseJsonResult(result);
      setScholarLookupResult(parsed);
      setNewScholar(s => ({
        ...s,
        scholar_name: parsed.scholar_name || s.scholar_name,
        strand: parsed.strand || s.strand,
        era: parsed.era || s.era,
        scholar_tier: parsed.scholar_tier || "",
        credentials: parsed.credentials || "",
        scholar_description: parsed.scholar_description || "",
        key_works: parsed.key_works ? parsed.key_works.join(", ") : "",
        contested_areas: parsed.contested_areas || [],
        contested_note: parsed.contested_note || "",
      }));
    } catch (e) {
      setScholarsError("Lookup failed: " + e.message);
    }
    setLookingUpScholar(false);
  }

  // ── Single-scholar enrich ─────────────────────────────────────────────────────

  async function enrichSingleScholar(scholar, extraContext = null) {
    setEnrichingScholarId(scholar.scholar_id);
    setSingleEnrichResult(null);
    try {
      const result = await callClaudeFull(config.anthropicKey, {
        messages: [{ role: "user", content: buildScholarLookupPrompt(scholar.scholar_name, extraContext, scholar) }],
        max_tokens: 800,
        temperature: 0.2,
      });
      const parsed = parseJsonResult(result);
      setSingleEnrichResult({ scholar_id: scholar.scholar_id, suggestion: parsed, error: null });
    } catch (e) {
      // Store error on the result object so it renders inline next to the scholar.
      setSingleEnrichResult({ scholar_id: scholar.scholar_id, suggestion: null, error: e.message });
    }
    setEnrichingScholarId(null);
  }

  async function applySingleEnrichment(scholar) {
    if (!singleEnrichResult || singleEnrichResult.scholar_id !== scholar.scholar_id) return;
    try {
      const patch = buildEnrichPatch(singleEnrichResult.suggestion, scholar);
      await db().patch("/rest/v1/allowed_scholars?scholar_id=eq." + scholar.scholar_id, patch);
      setSingleEnrichResult(null);
      if (selectedScholar?.scholar_id === scholar.scholar_id) {
        setSelectedScholar({ ...selectedScholar, ...singleEnrichResult.suggestion });
      }
      await loadAllScholars();
    } catch (e) {
      // Store inline so error shows next to the scholar, not at page top.
      setSingleEnrichResult(prev => prev ? { ...prev, error: e.message } : prev);
    }
  }

  // ── Bulk enrich ───────────────────────────────────────────────────────────────

  async function runEnrichAll() {
    const toEnrich = allScholars.filter(s => !s.scholar_tier);
    if (!toEnrich.length) { setScholarsError("All scholars already have tier data."); return; }

    setActiveScholarTool("enrich");
    setEnrichingAll(true);
    setEnrichIdx(0);

    const queue = [];
    let consecutiveFailures = 0;

    for (let i = 0; i < toEnrich.length; i++) {
      const scholar = toEnrich[i];
      setEnrichIdx(i);
      try {
        const result = await callClaudeFull(config.anthropicKey, {
          messages: [{ role: "user", content: buildScholarLookupPrompt(scholar.scholar_name, null, scholar) }],
          max_tokens: 800,
          temperature: 0.2,
        });
        queue.push({ scholar, suggestion: parseJsonResult(result), status: null });
        consecutiveFailures = 0;
      } catch (e) {
        consecutiveFailures++;
        queue.push({ scholar, suggestion: null, status: "error", error: e.message });
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          setScholarsError("Enrichment stopped after " + MAX_CONSECUTIVE_FAILURES + " consecutive API failures. Check your API key and try again.");
          setEnrichQueue([...queue]);
          break;
        }
      }
      setEnrichQueue([...queue]);
    }

    setEnrichingAll(false);
  }

  async function applyEnrichment(idx) {
    const item = enrichQueue[idx];
    if (!item?.suggestion) return;
    try {
      const patch = buildEnrichPatch(item.suggestion, item.scholar);
      await db().patch("/rest/v1/allowed_scholars?scholar_id=eq." + item.scholar.scholar_id, patch);
      setEnrichQueue(q => q.map((e, i) => i === idx ? { ...e, status: "applied" } : e));
      await loadAllScholars();
    } catch (e) {
      // Store error inline on this queue item, not at page top.
      setEnrichQueue(q => q.map((e, i) => i === idx ? { ...e, itemError: e.message } : e));
    }
  }

  function skipEnrichment(idx) {
    setEnrichQueue(q => q.map((e, i) => i === idx ? { ...e, status: "skipped" } : e));
  }

  // ── Sense check ───────────────────────────────────────────────────────────────

  async function runSenseCheck() {
    const toCheck = allScholars.filter(s => s.scholar_tier);
    if (!toCheck.length) { setScholarsError("No enriched scholars to sense check. Run enrichment first."); return; }

    setActiveScholarTool("sensecheck");
    setSenseChecking(true);
    setSenseCheckIdx(0);

    const queue = [];
    let consecutiveFailures = 0;

    for (let i = 0; i < toCheck.length; i++) {
      const scholar = toCheck[i];
      setSenseCheckIdx(i);
      try {
        const result = await callClaudeFull(config.anthropicKey, {
          messages: [{ role: "user", content: buildSenseCheckPrompt(scholar) }],
          max_tokens: 600,
          temperature: 0.2,
        });
        const parsed = parseJsonResult(result);
        // Only surface items that need attention.
        if (parsed.overall !== "clean") {
          queue.push({ scholar, check: parsed, status: null });
        }
        consecutiveFailures = 0;
      } catch (e) {
        consecutiveFailures++;
        queue.push({ scholar, check: null, status: "error", error: e.message });
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          setScholarsError("Sense check stopped after " + MAX_CONSECUTIVE_FAILURES + " consecutive API failures. Check your API key and try again.");
          setSenseCheckQueue([...queue]);
          break;
        }
      }
      setSenseCheckQueue([...queue]);
    }

    setSenseChecking(false);
  }

  async function applySenseCheck(idx) {
    const item = senseCheckQueue[idx];
    if (!item?.check) return;
    const suggestions = item.check.suggestions || {};
    const { patch, warnings } = validateSenseCheckPatch(suggestions, item.scholar);

    // If there are constraint violations, surface them inline on the item and stop.
    if (warnings.length > 0) {
      setSenseCheckQueue(q => q.map((e, i) => i === idx ? { ...e, validationWarnings: warnings } : e));
      return;
    }

    try {
      if (Object.keys(patch).length > 0) {
        await db().patch("/rest/v1/allowed_scholars?scholar_id=eq." + item.scholar.scholar_id, patch);
        await loadAllScholars();
      }
      setSenseCheckQueue(q => q.map((e, i) => i === idx ? { ...e, status: "applied", itemError: null, validationWarnings: null } : e));
    } catch (e) {
      // Store error inline on this item — not in the global banner.
      setSenseCheckQueue(q => q.map((e, i) => i === idx ? { ...e, itemError: e.message } : e));
    }
  }

  // Apply a manually-overridden patch for one sense check item (after user resolves validation warnings).
  async function applySenseCheckOverride(idx, overridePatch) {
    const item = senseCheckQueue[idx];
    if (!item) return;
    try {
      if (Object.keys(overridePatch).length > 0) {
        await db().patch("/rest/v1/allowed_scholars?scholar_id=eq." + item.scholar.scholar_id, overridePatch);
        await loadAllScholars();
      }
      setSenseCheckQueue(q => q.map((e, i) => i === idx ? { ...e, status: "applied", itemError: null, validationWarnings: null } : e));
    } catch (e) {
      setSenseCheckQueue(q => q.map((e, i) => i === idx ? { ...e, itemError: e.message } : e));
    }
  }

  function skipSenseCheck(idx) {
    setSenseCheckQueue(q => q.map((e, i) => i === idx ? { ...e, status: "skipped" } : e));
  }

  return {
    // State
    allScholars, setAllScholars,
    scholarsLoading, scholarsError, setScholarsError,
    addScholarOpen, setAddScholarOpen,
    addScholarPrefill, setAddScholarPrefill,
    newScholar, setNewScholar,
    editingScholar, setEditingScholar,
    editScholarData, setEditScholarData,
    selectedScholar, setSelectedScholar,
    enrichingScholarId,
    singleEnrichResult, setSingleEnrichResult,
    lookingUpScholar,
    scholarLookupResult, setScholarLookupResult,
    enrichingAll, enrichQueue, setEnrichQueue, enrichIdx,
    senseChecking, senseCheckQueue, setSenseCheckQueue, senseCheckIdx,
    activeScholarTool, setActiveScholarTool,
    // Constants (re-exported for convenience)
    TIER_COLOURS, TIER_OPTIONS, CONTESTED_AREA_OPTIONS,
    guessEraFromName, guessStrandFromName,
    // Functions
    loadAllScholars,
    addScholar, resetNewScholar,
    saveScholarEdit, toggleScholarActive,
    lookupScholar,
    enrichSingleScholar, applySingleEnrichment,
    runEnrichAll, applyEnrichment, skipEnrichment,
    runSenseCheck, applySenseCheck, applySenseCheckOverride, skipSenseCheck,
  };
}
