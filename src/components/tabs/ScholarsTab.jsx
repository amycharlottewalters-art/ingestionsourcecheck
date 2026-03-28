import { useState } from "react";
import { TIER_COLOURS, TIER_OPTIONS, CONTESTED_AREA_OPTIONS } from "../../constants.js";
import ScholarList from "../ScholarList.jsx";
import ScholarDetailPanel from "./ScholarDetailPanel.jsx";


// ── Sense check results panel ─────────────────────────────────────────────────

const VALID_STRANDS = ["critical","evangelical","catholic","feminist","social-prophet","patristic","jewish","orthodox","liberation","other"];
const VALID_ERAS = ["historical","contemporary"];
const VALID_TIERS = ["foundational","established","emerging","contested"];

const FIELD_LABELS = {
  strand: "Strand",
  era: "Era",
  scholar_tier: "Tier",
  credentials: "Credentials",
  scholar_description: "Description",
  key_works: "Key Works",
  contested_areas: "Contested Areas",
  contested_note: "Contested Note",
};

function SenseCheckResults({ senseChecking, senseCheckIdx, senseCheckQueue, setSenseCheckQueue,
  allScholars, applySenseCheck, applySenseCheckOverride, skipSenseCheck, setActiveScholarTool }) {

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div className="card-title" style={{ marginBottom: 0 }}>Sense Check Results</div>
        <button className="btn btn-secondary btn-sm" onClick={() => { setActiveScholarTool(null); setSenseCheckQueue([]); }}>Close</button>
      </div>
      {senseChecking && (
        <div className="alert alert-info mb-8">
          <div className="spinner" style={{ width: 16, height: 16, display: "inline-block", marginRight: 8, borderWidth: 2 }}></div>
          Checking scholar {senseCheckIdx + 1} of {allScholars.filter(s => s.scholar_tier).length}...
        </div>
      )}
      {!senseChecking && senseCheckQueue.length === 0 && (
        <div className="alert alert-success">All enriched scholars passed the sense check — no issues found.</div>
      )}
      {senseCheckQueue.map((item, idx) => {
        // Actioned — collapsed
        if (item.status === "applied" || item.status === "skipped") {
          return (
            <div key={idx} style={{ borderBottom: "1px solid #F3F4F6", padding: "8px 0", display: "flex", justifyContent: "space-between", alignItems: "center", opacity: item.status === "skipped" ? 0.45 : 1 }}>
              <span style={{ fontSize: "0.9375rem", color: "#374151" }}>{item.scholar.scholar_name}</span>
              <span style={{ fontSize: "0.8125rem", fontWeight: 700,
                color: item.status === "applied" ? "#166534" : "#6B7280",
                background: item.status === "applied" ? "#DCFCE7" : "#F3F4F6",
                padding: "2px 8px", borderRadius: 10 }}>
                {item.status === "applied" ? "✓ Fixed" : "Skipped"}
              </span>
            </div>
          );
        }

        const suggestions = item.check?.suggestions || {};
        // Fields Claude actually suggested a change for
        const changedFields = Object.entries(suggestions).filter(([k, v]) => v && v !== item.scholar[k]);

        return (
          <div key={idx} style={{ borderBottom: "1px solid #F3F4F6", paddingBottom: 16, marginBottom: 4, paddingTop: 12 }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: "1rem", fontWeight: 700, color: "#111" }}>{item.scholar.scholar_name}</div>
                {item.check && (
                  <span style={{ fontSize: "0.8125rem", fontWeight: 700,
                    color: item.check.overall === "significant-issues" ? "#991B1B" : "#92400E",
                    background: item.check.overall === "significant-issues" ? "#FEE2E2" : "#FFFBEB",
                    padding: "2px 7px", borderRadius: 10 }}>
                    {item.check.overall}
                  </span>
                )}
              </div>
              {item.check && (
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button className="btn btn-success btn-sm" onClick={() => applySenseCheck(idx)}>Apply fixes</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => skipSenseCheck(idx)}>Skip</button>
                </div>
              )}
            </div>

            {/* Issues list */}
            {item.check?.issues?.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                {item.check.issues.map((issue, ii) => (
                  <div key={ii} style={{ fontSize: "0.875rem", color: "#374151", padding: "2px 0", lineHeight: 1.5 }}>⚑ {issue}</div>
                ))}
              </div>
            )}

            {/* Before / after for each suggested field change */}
            {changedFields.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: "0.8125rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6B7280", marginBottom: 6 }}>
                  Suggested changes
                </div>
                {changedFields.map(([field, suggested]) => {
                  const current = item.scholar[field];
                  const currentDisplay = Array.isArray(current) ? current.join(", ") : (current || "not set");
                  const suggestedDisplay = Array.isArray(suggested) ? suggested.join(", ") : suggested;
                  const override = item.overrides?.[field];
                  return (
                    <div key={field} style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 8, padding: "10px 12px", marginBottom: 6 }}>
                      <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#374151", marginBottom: 6, textTransform: "capitalize" }}>
                        {FIELD_LABELS[field] || field}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                        <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6, padding: "6px 8px" }}>
                          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#991B1B", marginBottom: 3 }}>Current</div>
                          <div style={{ fontSize: "0.875rem", color: "#374151" }}>{currentDisplay}</div>
                        </div>
                        <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: 6, padding: "6px 8px" }}>
                          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#166534", marginBottom: 3 }}>Suggested</div>
                          <div style={{ fontSize: "0.875rem", color: "#374151" }}>{suggestedDisplay}</div>
                        </div>
                      </div>
                      {/* Edit override */}
                      <SenseFieldEdit
                        field={field}
                        current={override !== undefined ? override : suggested}
                        onEdit={val => setSenseCheckQueue(q => q.map((e, i) => i === idx ? {
                          ...e, overrides: { ...(e.overrides || {}), [field]: val }
                        } : e))}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Validation warnings — constraint violations Claude suggested */}
            {item.validationWarnings?.length > 0 && (
              <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 12px", marginBottom: 10 }}>
                <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "#991B1B", marginBottom: 6 }}>
                  ⚠ Claude suggested invalid values for {item.validationWarnings.length} field{item.validationWarnings.length > 1 ? "s" : ""} — please choose from the valid options below before applying:
                </div>
                {item.validationWarnings.map((w, wi) => (
                  <div key={wi} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#374151", marginBottom: 4 }}>
                      {FIELD_LABELS[w.field] || w.field}: Claude suggested "{w.invalid}" — not a valid value
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {w.valid.map(v => (
                        <button key={v}
                          className={"btn btn-sm " + ((item.overrides?.[w.field] === v) ? "btn-primary" : "btn-secondary")}
                          onClick={() => setSenseCheckQueue(q => q.map((e, i) => i === idx ? {
                            ...e,
                            overrides: { ...(e.overrides || {}), [w.field]: v },
                            validationWarnings: e.validationWarnings.filter(x => x.field !== w.field),
                          } : e))}>
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <button className="btn btn-success btn-sm" style={{ marginTop: 6 }}
                  onClick={() => {
                    const base = {};
                    changedFields.forEach(([f, v]) => { base[f] = v; });
                    const final = { ...base, ...(item.overrides || {}) };
                    applySenseCheckOverride(idx, final);
                  }}>
                  Apply with selected values
                </button>
              </div>
            )}

            {/* Inline error */}
            {item.itemError && (
              <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6, padding: "8px 10px", marginBottom: 8, fontSize: "0.875rem", color: "#991B1B" }}>
                ⚠️ {item.itemError}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Inline field editor for sense check overrides.
function SenseFieldEdit({ field, current, onEdit }) {
  const isArray = Array.isArray(current);
  const displayVal = isArray ? current.join(", ") : (current || "");
  return (
    <div>
      <div style={{ fontSize: "0.75rem", color: "#6B7280", marginBottom: 3 }}>
        Edit before applying:
      </div>
      <input className="edit-input" style={{ width: "100%", fontSize: "0.875rem" }}
        value={displayVal}
        onChange={e => {
          const val = e.target.value;
          onEdit(isArray ? val.split(",").map(s => s.trim()).filter(Boolean) : val);
        }} />
    </div>
  );
}

export default function ScholarsTab(props) {
  const {
  config, configValid, activeTab, setActiveTab, panelOpen, setPanelOpen,
  panelTab, setPanelTab, scholars, allTopics,
  stage, setStage, session, setSession,
  loading, loadingMsg, error, setError,
  homeData, homeLoading,
  s0, setS0, sourceText, setSourceText,
  chunks, currentChunk, documentMap, isChunked,
  dragOver, setDragOver, fileInputRef,
  previewOutput, previewStreaming,
  parsedProposal, setParsedProposal,
  rawProposalCollapsed, setRawProposalCollapsed,
  scholarOrTopicAddedSincePreview, setScholarOrTopicAddedSincePreview,
  scholarCards, setScholarCards,
  reviewTopics, setReviewTopics,
  postCommitReport, sourceEntries, setSourceEntries,
  reportCollapsed, setReportCollapsed,
  loadReferenceData, resetSession, loadHome,
  createSession, resumeSession,
  handleFile, handleTextReady,
  runPreview, proceedToReview,
  buildCardsFromProposal,
  toggleTopicOnCard, setTopicConf, setCardField,
  runCommit, mergeEntry, approveEntry, rejectEntry,
  approveAll, rejectAll, finaliseSession,
  normaliseSource, setLoading, setLoadingMsg,
  setPostCommitReport,
  allScholars, scholarsLoading, scholarsError, setScholarsError,
  addScholarOpen, setAddScholarOpen,
  addScholarPrefill, setAddScholarPrefill,
  newScholar, setNewScholar,
  editingScholar, setEditingScholar,
  editScholarData, setEditScholarData,
  selectedScholar, setSelectedScholar,
  enrichingScholarId, singleEnrichResult, setSingleEnrichResult,
  lookingUpScholar, scholarLookupResult, setScholarLookupResult,
  enrichingAll, enrichQueue, setEnrichQueue, enrichIdx,
  senseChecking, senseCheckQueue, setSenseCheckQueue, senseCheckIdx,
  activeScholarTool, setActiveScholarTool,
  TIER_COLOURS, TIER_OPTIONS, CONTESTED_AREA_OPTIONS,
  guessEraFromName, guessStrandFromName,
  loadAllScholars, addScholar, resetNewScholar,
  saveScholarEdit, toggleScholarActive,
  lookupScholar, enrichSingleScholar, applySingleEnrichment,
  runEnrichAll, applyEnrichment, skipEnrichment,
  runSenseCheck, applySenseCheck, applySenseCheckOverride, skipSenseCheck,
  allTopicsManaged, setAllTopicsManaged,
  topicsLoading, topicsError, setTopicsError,
  addTopicOpen, setAddTopicOpen,
  addTopicPrefill, setAddTopicPrefill,
  newTopic, setNewTopic,
  newTopicAdjacent, setNewTopicAdjacent,
  suggestingAdjacent, setSuggestingAdjacent,
  suggestingDescription, setSuggestingDescription,
  adjacentSuggested, setAdjacentSuggested,
  editingTopic, setEditingTopic,
  editTopicData, setEditTopicData,
  editTopicAdjacent, setEditTopicAdjacent,
  editSuggestingAdjacent, setEditSuggestingAdjacent,
  editSuggestingDescription, setEditSuggestingDescription,
  loadReferenceTopics, loadAllTopicsManaged,
  suggestTopicDescriptionAndDomain, suggestAdjacentTopics,
  addTopic, saveTopicEdit, toggleTopicActive,
  topicDisplayName, slugify,
  allSources, sourcesLoading, sourcesError, setSourcesError,
  dupScanResults, setDupScanResults, dupScanDone, setDupScanDone, dupScanRunning,
  qualityQueue, setQualityQueue, qualityRunning, qualityIdx, qualityFilter,
  setQualityFilter, qualityDone, setQualityDone,
  loadAllSources, runDuplicateScan, askClaudeAboutDuplicate,
  mergeDupRows, deleteDupRow, dismissDup,
  runQualityCheck, runConsistencyCheck, loadPersistedResults,
  applyClaimSuggestion, dismissClaimFlag, applyAngleSuggestion, dismissAngleFlag,
  markQualityKept, deleteQualityRow
  } = props;
  return (
    <>
      {/*  Scholars Tab  */}
      {stage === -1 && activeTab === "scholars" && (
        <div className="page">
          <div className="page-title">Allowed Scholars</div>
          <div className="page-subtitle">Manage the closed scholar list used in all ingestion and generation</div>

          {scholarsError && (
            <div className="alert alert-error">
              ⚠️ {scholarsError}
              <button onClick={() => setScholarsError("")} style={{ float: "right", background: "none", border: "none", cursor: "pointer", color: "#991B1B", fontWeight: 700 }}>×</button>
            </div>
          )}

          <button className="btn btn-primary btn-full mb-16" onClick={() => { setAddScholarOpen(v => !v); if (!addScholarOpen) setNewScholar({ scholar_name: "", strand: "other", era: "contemporary", scholar_tier: "", credentials: "", scholar_description: "", key_works: "", contested_areas: [], contested_note: "" }); }}>
            {addScholarOpen ? "Cancel" : "+ Add Scholar"}
          </button>

          {addScholarOpen && (
            <div className="card" style={{ borderColor: "#3B82F6" }}>
              <div className="card-title">New Scholar</div>
              {addScholarPrefill && (
                <div className="alert alert-info mb-8">Pre-filled from preview flag: "{addScholarPrefill}"</div>
              )}
              <div className="field">
                <label className="label">Name *</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input className="input" type="text" placeholder="e.g. John Meier"
                    value={newScholar.scholar_name}
                    onChange={e => {
                      const name = e.target.value;
                      setNewScholar(s => ({
                        ...s,
                        scholar_name: name,
                        era: guessEraFromName(name),
                        strand: s.strand === "other" ? guessStrandFromName(name) : s.strand,
                      }));
                      setScholarLookupResult(null);
                    }}
                    style={{ flex: 1 }}
                  />
                  <button className="btn btn-secondary" style={{ flexShrink: 0, minWidth: 120 }}
                    disabled={!newScholar.scholar_name.trim() || lookingUpScholar}
                    onClick={() => lookupScholar(newScholar.scholar_name)}>
                    {lookingUpScholar ? "Looking up..." : "Look up"}
                  </button>
                </div>
                {scholarLookupResult && (
                  <div className="alert" style={{ marginTop: 8, background: scholarLookupResult.confidence === "low" ? "#FEF2F2" : "#F0FDF4", border: "1px solid " + (scholarLookupResult.confidence === "low" ? "#FECACA" : "#BBF7D0"), color: "#374151" }}>
                    <div style={{ fontSize: "0.875rem", fontWeight: 700, marginBottom: 4 }}>
                      Lookup complete — confidence: {scholarLookupResult.confidence}
                      {scholarLookupResult.confidence_note && <span style={{ fontWeight: 400 }}> — {scholarLookupResult.confidence_note}</span>}
                    </div>
                    <div style={{ fontSize: "0.875rem" }}>Fields pre-populated below. Review and edit before saving.</div>
                  </div>
                )}
              </div>
              <div className="field">
                <label className="label">Additional context for lookup <span style={{ fontWeight: 300, textTransform: "none", letterSpacing: 0 }}>(optional — paste bio text from their website or publisher page)</span></label>
                <textarea className="input textarea" style={{ minHeight: 70, fontSize: "0.875rem" }}
                  placeholder="e.g. paste a paragraph from their university profile or personal website. Claude will use this as authoritative information."
                  value={newScholar.enrichContext || ""}
                  onChange={e => setNewScholar(s => ({ ...s, enrichContext: e.target.value }))} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <div className="field" style={{ flex: 1 }}>
                  <label className="label">Strand *</label>
                  <select className="input" value={newScholar.strand} onChange={e => setNewScholar(s => ({ ...s, strand: e.target.value }))}>
                    {"critical evangelical catholic feminist social-prophet patristic jewish orthodox liberation other".split(" ").map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="field" style={{ flex: 1 }}>
                  <label className="label">Era *</label>
                  <select className="input" value={newScholar.era} onChange={e => setNewScholar(s => ({ ...s, era: e.target.value }))}>
                    <option value="historical">Historical</option>
                    <option value="contemporary">Contemporary</option>
                  </select>
                </div>
                <div className="field" style={{ flex: 1 }}>
                  <label className="label">Tier</label>
                  <select className="input" value={newScholar.scholar_tier} onChange={e => setNewScholar(s => ({ ...s, scholar_tier: e.target.value }))}>
                    <option value="">Not set</option>
                    {TIER_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="field">
                <label className="label">Credentials</label>
                <input className="input" type="text" placeholder="e.g. Emeritus Professor, Duke Divinity School"
                  value={newScholar.credentials}
                  onChange={e => setNewScholar(s => ({ ...s, credentials: e.target.value }))} />
              </div>
              <div className="field">
                <label className="label">Description</label>
                <textarea className="input textarea" style={{ minHeight: 70 }}
                  placeholder="2-3 sentences describing their work and standing in the field"
                  value={newScholar.scholar_description}
                  onChange={e => setNewScholar(s => ({ ...s, scholar_description: e.target.value }))} />
              </div>
              <div className="field">
                <label className="label">Key Works <span style={{ fontWeight: 300, textTransform: "none", letterSpacing: 0 }}>(comma-separated)</span></label>
                <input className="input" type="text" placeholder="e.g. Jesus and the Victory of God, The Resurrection of the Son of God"
                  value={newScholar.key_works}
                  onChange={e => setNewScholar(s => ({ ...s, key_works: e.target.value }))} />
              </div>
              <div className="field">
                <label className="label">Contested Areas</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                  {CONTESTED_AREA_OPTIONS.map(opt => (
                    <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.9375rem", cursor: "pointer", padding: "4px 0" }}>
                      <input type="checkbox"
                        checked={(newScholar.contested_areas || []).includes(opt.value)}
                        onChange={e => setNewScholar(s => ({
                          ...s,
                          contested_areas: e.target.checked
                            ? [...(s.contested_areas || []), opt.value]
                            : (s.contested_areas || []).filter(x => x !== opt.value)
                        }))} />
                      {opt.label}
                    </label>
                  ))}
                </div>
                {(newScholar.contested_areas || []).length > 0 && (
                  <input className="input" type="text" placeholder="One sentence explaining the dispute"
                    value={newScholar.contested_note}
                    onChange={e => setNewScholar(s => ({ ...s, contested_note: e.target.value }))} />
                )}
              </div>
              <button className="btn btn-primary" onClick={addScholar}>Add Scholar</button>
            </div>
          )}

          {/* Bulk tools */}
          {!addScholarOpen && allScholars.length > 0 && activeScholarTool === null && (
            <div className="card">
              <div className="card-title">Bulk Scholar Tools</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn btn-secondary" style={{ flex: 1 }}
                  disabled={enrichingAll}
                  onClick={runEnrichAll}>
                  ✦ Enrich All Scholars
                </button>
                <button className="btn btn-secondary" style={{ flex: 1 }}
                  disabled={senseChecking}
                  onClick={runSenseCheck}>
                  ✦ Sense Check All
                </button>
              </div>
              <div style={{ fontSize: "0.875rem", color: "#9CA3AF", marginTop: 8 }}>
                Enrich: fills tier, credentials, description and key works for scholars missing this data.
                Sense Check: reviews all enriched scholars for inaccuracies and suggests corrections.
              </div>
            </div>
          )}

          {/* Enrichment progress + results */}
          {activeScholarTool === "enrich" && (
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div className="card-title" style={{ marginBottom: 0 }}>Enrichment Results</div>
                <button className="btn btn-secondary btn-sm" onClick={() => { setActiveScholarTool(null); setEnrichQueue([]); }}>Close</button>
              </div>
              {enrichingAll && (
                <div className="alert alert-info mb-8">
                  <div className="spinner" style={{ width: 16, height: 16, display: "inline-block", marginRight: 8, borderWidth: 2 }}></div>
                  Looking up scholar {enrichIdx + 1} of {allScholars.filter(s => !s.scholar_tier).length}...
                </div>
              )}
              {enrichQueue.map((item, idx) => {
                const s = item.suggestion;
                const tierCols = s && TIER_COLOURS[s.scholar_tier] ? TIER_COLOURS[s.scholar_tier] : { bg: "#F3F4F6", text: "#374151" };
                // Collapsed view for actioned items
                if (item.status === "applied" || item.status === "skipped") {
                  return (
                    <div key={idx} style={{ borderBottom: "1px solid #F3F4F6", padding: "8px 0", display: "flex", justifyContent: "space-between", alignItems: "center", opacity: item.status === "skipped" ? 0.45 : 1 }}>
                      <span style={{ fontSize: "0.9375rem", color: "#374151" }}>{item.scholar.scholar_name}</span>
                      <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: item.status === "applied" ? "#166534" : "#9CA3AF", background: item.status === "applied" ? "#DCFCE7" : "#F3F4F6", padding: "2px 8px", borderRadius: 10 }}>
                        {item.status === "applied" ? "✓ Applied" : "Skipped"}
                      </span>
                    </div>
                  );
                }
                return (
                  <div key={idx} style={{ borderBottom: "1px solid #F3F4F6", padding: "12px 0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                      <div>
                        <div style={{ fontSize: "1rem", fontWeight: 700 }}>{item.scholar.scholar_name}</div>
                        {s && (
                          <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                            <span className="strand-badge" style={{ background: tierCols.bg, color: tierCols.text }}>{s.scholar_tier}</span>
                            <span className="strand-badge" style={{ background: "#F3F4F6", color: "#374151" }}>{s.strand}</span>
                            <span style={{ fontSize: "0.8125rem", color: s.confidence === "low" ? "#991B1B" : "#166534" }}>confidence: {s.confidence}</span>
                          </div>
                        )}
                        {!s && item.status !== "error" && <div style={{ fontSize: "0.875rem", color: "#9CA3AF" }}>Processing...</div>}
                        {item.status === "error" && <div style={{ fontSize: "0.875rem", color: "#991B1B" }}>Error: {item.error}</div>}
                      </div>
                      {!item.status && s && (
                        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                          <button className="btn btn-success btn-sm" onClick={() => applyEnrichment(idx)}>Apply</button>
                          <button className="btn btn-danger btn-sm" onClick={() => skipEnrichment(idx)}>Skip</button>
                        </div>
                      )}
                    </div>
                    {s && !item.status && (
                      <div style={{ fontSize: "0.875rem", color: "#6B7280", lineHeight: 1.5 }}>
                        {s.credentials && <div><strong>Credentials:</strong> {s.credentials}</div>}
                        {s.scholar_description && <div style={{ marginTop: 3 }}>{s.scholar_description}</div>}
                        {s.key_works && s.key_works.length > 0 && <div style={{ marginTop: 3 }}><strong>Key works:</strong> {s.key_works.join(", ")}</div>}
                        {s.contested_areas && s.contested_areas.length > 0 && <div style={{ marginTop: 3 }}><strong>Contested:</strong> {s.contested_areas.join(", ")} — {s.contested_note}</div>}
                        {s.confidence_note && <div style={{ marginTop: 3, color: "#92400E" }}><strong>Note:</strong> {s.confidence_note}</div>}
                      </div>
                    )}
                    {item.itemError && (
                      <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6, padding: "8px 10px", marginTop: 6, fontSize: "0.875rem", color: "#991B1B" }}>
                        ⚠️ Apply failed: {item.itemError}
                      </div>
                    )}
                  </div>
                );
              })}
              {!enrichingAll && enrichQueue.length > 0 && enrichQueue.every(e => e.status) && (
                <div className="alert alert-success mt-12">
                  {enrichQueue.filter(e => e.status === "applied").length} applied · {enrichQueue.filter(e => e.status === "skipped").length} skipped
                </div>
              )}
            </div>
          )}

          {/* Sense check progress + results */}
          {activeScholarTool === "sensecheck" && (
            <SenseCheckResults
              senseChecking={senseChecking}
              senseCheckIdx={senseCheckIdx}
              senseCheckQueue={senseCheckQueue}
              setSenseCheckQueue={setSenseCheckQueue}
              allScholars={allScholars}
              applySenseCheck={applySenseCheck}
              applySenseCheckOverride={applySenseCheckOverride}
              skipSenseCheck={skipSenseCheck}
              setActiveScholarTool={setActiveScholarTool}
            />
          )}
        </div>
      )}

      <ScholarDetailPanel {...props} />
    </>
  );
}
