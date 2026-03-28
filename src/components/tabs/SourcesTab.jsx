
// Colour for the check type badge on angle flags.
const CHECK_COLOURS = {
  discrimination: { bg: "#FEE2E2", text: "#991B1B" },
  harm:           { bg: "#FEE2E2", text: "#991B1B" },
  christianese:   { bg: "#FFFBEB", text: "#92400E" },
  directive:      { bg: "#FFFBEB", text: "#92400E" },
  depth:          { bg: "#EFF6FF", text: "#1E40AF" },
};
const CHECK_LABELS = {
  discrimination: "Discrimination",
  harm:           "Harm / Manipulation",
  christianese:   "Christianese",
  directive:      "Directive",
  depth:          "Shallow resolution",
};

// Side-by-side diff display: highlights changed words in the suggestion.
function DiffDisplay({ original, suggestion, onApply, onDismiss, applyLabel = "Apply", disabled = false }) {
  // Simple word-level diff — mark words that are new in the suggestion.
  const origWords = new Set((original || "").toLowerCase().split(/\s+/).filter(Boolean));
  const sugWords = (suggestion || "").split(/\s+/);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
      {/* Original */}
      <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6, padding: "8px 10px" }}>
        <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#991B1B", marginBottom: 4 }}>Original</div>
        <div style={{ fontSize: "0.875rem", color: "#374151", lineHeight: 1.5 }}>{original}</div>
      </div>
      {/* Suggestion */}
      <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: 6, padding: "8px 10px" }}>
        <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#166534", marginBottom: 4 }}>
          {suggestion ? "Suggested rewrite" : "Recommended: delete"}
        </div>
        {suggestion ? (
          <div style={{ fontSize: "0.875rem", lineHeight: 1.5 }}>
            {sugWords.map((word, i) => {
              const isNew = !origWords.has(word.toLowerCase().replace(/[^a-z]/g, ""));
              return (
                <span key={i} style={{ color: isNew ? "#166534" : "#374151", fontWeight: isNew ? 700 : 400 }}>
                  {word}{i < sugWords.length - 1 ? " " : ""}
                </span>
              );
            })}
          </div>
        ) : (
          <div style={{ fontSize: "0.875rem", color: "#991B1B", fontStyle: "italic" }}>Delete this item</div>
        )}
      </div>
      {/* Actions */}
      <div style={{ gridColumn: "1 / -1", display: "flex", gap: 6 }}>
        <button className="btn btn-success btn-sm" onClick={onApply} disabled={disabled}>
          {suggestion ? applyLabel : "Delete"}
        </button>
        <button className="btn btn-secondary btn-sm" onClick={onDismiss} disabled={disabled}>
          Dismiss
        </button>
      </div>
    </div>
  );
}

export default function SourcesTab(props) {
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
  runSenseCheck, applySenseCheck, skipSenseCheck,
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
  qualityQueue, setQualityQueue, qualityRunning, qualityIdx,
  qualityFilter, setQualityFilter, qualityDone, setQualityDone,
  consistencyRunning,
  loadAllSources, runDuplicateScan, askClaudeAboutDuplicate,
  mergeDupRows, deleteDupRow, dismissDup,
  runQualityCheck, runConsistencyCheck, loadPersistedResults,
  applyClaimSuggestion, dismissClaimFlag,
  applyAngleSuggestion, dismissAngleFlag,
  markQualityKept, deleteQualityRow,
  } = props;

  // Counts for filter buttons.
  const uncheckedCount = allSources.filter(s => !s.quality_check_result).length;
  const flaggedCount = allSources.filter(s => {
    if (!s.quality_check_result) return false;
    const r = s.quality_check_result;
    return [...(r.claim_flags || []), ...(r.angle_flags || [])].some(f => !f.resolution);
  }).length;
  const cleanCount = allSources.filter(s => {
    if (!s.quality_check_result) return false;
    const r = s.quality_check_result;
    if (r.overall === "clean") return true;
    return [...(r.claim_flags || []), ...(r.angle_flags || [])].every(f => f.resolution);
  }).length;

  return (
    <>
      {stage === -1 && activeTab === "sources" && (
        <div className="page">
          <div className="page-title">Source Check</div>
          <div className="page-subtitle">Duplicate scan and quality review of all ingested sources</div>

          {sourcesError && (
            <div className="alert alert-error">
              {sourcesError}
              <button onClick={() => setSourcesError("")} style={{ float: "right", background: "none", border: "none", cursor: "pointer", color: "#991B1B", fontWeight: 700 }}>×</button>
            </div>
          )}

          {/* Stats */}
          {allSources.length > 0 && (
            <div className="stats-row" style={{ marginBottom: 16 }}>
              <div className="stat-box">
                <div className="stat-num">{allSources.length}</div>
                <div className="stat-label">Total rows</div>
              </div>
              <div className="stat-box">
                <div className="stat-num">{allSources.filter(s => s.health_check_status === "flagged").length}</div>
                <div className="stat-label">Flagged</div>
              </div>
              <div className="stat-box">
                <div className="stat-num">{uncheckedCount}</div>
                <div className="stat-label">Unchecked</div>
              </div>
            </div>
          )}

          {sourcesLoading && (
            <div className="loading-state"><div className="spinner"></div><div className="loading-msg">Loading sources...</div></div>
          )}

          {/* ── DUPLICATE SCAN ── */}
          {!sourcesLoading && allSources.length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-title">Duplicate Scan</div>
              <div style={{ fontSize: "0.9375rem", color: "#4B5563", marginBottom: 12 }}>
                Finds rows with the same scholar and topic. No API calls — instant heuristic analysis.
              </div>
              {!dupScanDone ? (
                <button className="btn btn-primary" onClick={runDuplicateScan} disabled={dupScanRunning}>
                  {dupScanRunning ? "Scanning..." : "Run Duplicate Scan"}
                </button>
              ) : (
                <button className="btn btn-secondary btn-sm" onClick={() => { setDupScanResults([]); setDupScanDone(false); }}>
                  Reset Scan
                </button>
              )}

              {dupScanDone && dupScanResults.length === 0 && (
                <div className="alert alert-success" style={{ marginTop: 12 }}>
                  No duplicates found — all scholar/topic combinations are unique.
                </div>
              )}

              {dupScanResults.map((item, dupIdx) => {
                if (item.status) {
                  return (
                    <div key={dupIdx} style={{ borderTop: "1px solid #F3F4F6", padding: "8px 0", marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center", opacity: 0.45 }}>
                      <span style={{ fontSize: "0.9375rem", color: "#374151" }}>
                        {item.rows[0].author_name} — {(() => { const tid = (item.rows[0].topic_ids || [])[0]; const t = allTopics.find(x => x.topic_id === tid); return t ? t.topic_display_name : "Topic " + tid; })()}
                      </span>
                      <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: item.status === "deleted" ? "#991B1B" : item.status === "merged" ? "#1D4ED8" : "#166534", background: item.status === "deleted" ? "#FEE2E2" : item.status === "merged" ? "#DBEAFE" : "#DCFCE7", padding: "2px 8px", borderRadius: 10 }}>
                        {item.status === "deleted" ? "Deleted" : item.status === "merged" ? "Merged" : "Kept"}
                      </span>
                    </div>
                  );
                }

                const recColours = {
                  "delete-least-full": { bg: "#FEE2E2", text: "#991B1B" },
                  "merge": { bg: "#DBEAFE", text: "#1D4ED8" },
                  "review": { bg: "#FFFBEB", text: "#92400E" },
                  "keep-both": { bg: "#DCFCE7", text: "#166534" },
                };
                const activeRec = item.claudeRecommendation ? item.claudeRecommendation.recommendation : item.recommendation;
                const recCols = recColours[activeRec] || recColours["review"];
                const recLabel = activeRec === "delete-least-full" ? "Delete least full"
                  : activeRec === "merge" ? "Merge"
                  : activeRec === "review" ? "Needs review"
                  : activeRec === "delete-row-a" ? "Delete row A"
                  : activeRec === "delete-row-b" ? "Delete row B"
                  : "Keep both";

                return (
                  <div key={dupIdx} style={{ borderTop: "1px solid #F3F4F6", paddingTop: 12, marginTop: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: "1rem", fontWeight: 700, color: "#111" }}>{item.rows[0].author_name}</div>
                        <div style={{ fontSize: "0.875rem", color: "#6B7280" }}>
                          {(() => {
                            const tid = (item.rows[0].topic_ids || [])[0];
                            const t = allTopics.find(x => x.topic_id === tid);
                            return t ? t.topic_display_name + (t.topic_description ? " — " + t.topic_description : "") : "Topic " + tid;
                          })()} · {item.overlapScore}% content overlap
                        </div>
                      </div>
                      <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: recCols.text, background: recCols.bg, padding: "2px 8px", borderRadius: 10, flexShrink: 0 }}>
                        {recLabel}
                      </span>
                    </div>

                    {item.claudeRecommendation?.reason && (
                      <div style={{ fontSize: "0.875rem", color: "#92400E", fontStyle: "italic", marginBottom: 8 }}>
                        {item.claudeRecommendation.reason}
                      </div>
                    )}
                    {item.claudeError && (
                      <div style={{ fontSize: "0.875rem", color: "#991B1B", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6, padding: "6px 10px", marginBottom: 8 }}>
                        ⚠️ {item.claudeError}
                      </div>
                    )}

                    {item.rows.map((row, rowIdx) => {
                      const isLeastFull = rowIdx === item.leastFullIdx;
                      const claims = Array.isArray(row.content_summary)
                        ? row.content_summary
                        : (row.content_summary || "").split("\n").filter(Boolean);
                      return (
                        <div key={rowIdx} style={{ border: "1px solid " + (isLeastFull && activeRec === "delete-least-full" ? "#FECACA" : "#E5E7EB"), borderRadius: 8, padding: 10, marginBottom: 8, background: isLeastFull && activeRec === "delete-least-full" ? "#FEF2F2" : "#FAFAFA" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                            <div style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#374151" }}>
                              Row {rowIdx === 0 ? "A" : "B"}{row.source_title ? " — " + row.source_title : ""}{row.source_year ? " (" + row.source_year + ")" : ""}
                              <span style={{ fontSize: "0.8125rem", color: "#6B7280", fontWeight: 400, marginLeft: 6 }}>
                                {row.citation_confidence} · {claims.length} claims · {(row.devotional_angles || []).length} angles · score: {item.scores[rowIdx]}
                              </span>
                            </div>
                            {isLeastFull && activeRec === "delete-least-full" && (
                              <span style={{ fontSize: "0.8125rem", color: "#991B1B", background: "#FEE2E2", padding: "1px 6px", borderRadius: 8, fontWeight: 700, flexShrink: 0 }}>least full</span>
                            )}
                          </div>
                          <div style={{ fontSize: "0.875rem", color: "#4B5563", lineHeight: 1.5 }}>
                            {claims.slice(0, 3).map((c, ci) => <div key={ci}>{c}</div>)}
                            {claims.length > 3 && <div style={{ color: "#6B7280", fontStyle: "italic" }}>+ {claims.length - 3} more claims</div>}
                          </div>
                        </div>
                      );
                    })}

                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                      {activeRec === "delete-least-full" && (
                        <button className="btn btn-danger btn-sm" onClick={() => deleteDupRow(dupIdx, item.leastFullIdx)}>
                          Delete least full (Row {item.leastFullIdx === 0 ? "A" : "B"})
                        </button>
                      )}
                      {activeRec === "delete-row-a" && (
                        <button className="btn btn-danger btn-sm" onClick={() => deleteDupRow(dupIdx, 0)}>Delete Row A</button>
                      )}
                      {activeRec === "delete-row-b" && (
                        <button className="btn btn-danger btn-sm" onClick={() => deleteDupRow(dupIdx, 1)}>Delete Row B</button>
                      )}
                      <button className="btn btn-primary btn-sm" disabled={item.askingClaude} onClick={() => mergeDupRows(dupIdx)}>
                        {item.askingClaude ? "Merging..." : "Merge with Claude"}
                      </button>
                      {activeRec !== "keep-both" && (
                        <button className="btn btn-secondary btn-sm" onClick={() => dismissDup(dupIdx)}>Keep Both</button>
                      )}
                      {activeRec === "keep-both" && (
                        <button className="btn btn-success btn-sm" onClick={() => dismissDup(dupIdx)}>Confirm Keep Both</button>
                      )}
                      {!item.claudeRecommendation && (
                        <button className="btn btn-secondary btn-sm" style={{ color: "#1D4ED8" }} disabled={item.askingClaude} onClick={() => askClaudeAboutDuplicate(dupIdx)}>
                          {item.askingClaude ? "Asking Claude..." : "Ask Claude"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── QUALITY CHECK ── */}
          {!sourcesLoading && allSources.length > 0 && (
            <div className="card">
              <div className="card-title">Quality Check</div>
              <div style={{ fontSize: "0.9375rem", color: "#4B5563", marginBottom: 12 }}>
                Checks claim accuracy, devotional angle quality (christianese, directive language, harm, discrimination, depth), and cross-row consistency. Results are saved to Supabase and survive page refreshes.
              </div>

              {/* Three-way filter */}
              <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
                {[
                  { key: "unchecked", label: "Unchecked", count: uncheckedCount },
                  { key: "flagged",   label: "Flagged",   count: flaggedCount },
                  { key: "clean",     label: "Clean",     count: cleanCount },
                ].map(f => (
                  <button key={f.key}
                    className={"btn btn-sm " + (qualityFilter === f.key ? "btn-primary" : "btn-secondary")}
                    onClick={() => setQualityFilter(f.key)}>
                    {f.label} ({f.count})
                  </button>
                ))}
              </div>

              {/* Action buttons */}
              {!qualityRunning && !consistencyRunning && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                  {uncheckedCount > 0 && (
                    <button className="btn btn-primary" onClick={runQualityCheck}>
                      Check {uncheckedCount} unchecked row{uncheckedCount !== 1 ? "s" : ""}
                    </button>
                  )}
                  {(flaggedCount > 0 || cleanCount > 0) && qualityQueue.length === 0 && (
                    <button className="btn btn-secondary" onClick={loadPersistedResults}>
                      Load saved results
                    </button>
                  )}
                  <button className="btn btn-secondary" onClick={runConsistencyCheck}
                    title="One API call per scholar with 2+ rows — checks for contradictions across rows">
                    Run consistency check
                  </button>
                </div>
              )}

              {/* Cost warning before run */}
              {uncheckedCount > 0 && !qualityRunning && qualityQueue.length === 0 && (
                <div className="alert alert-warn" style={{ marginBottom: 12, fontSize: "0.875rem" }}>
                  This will make {uncheckedCount} API call{uncheckedCount !== 1 ? "s" : ""}, one per source row. Results are saved to Supabase so you only pay once per row.
                </div>
              )}

              {/* Progress indicators */}
              {qualityRunning && (
                <div className="alert alert-info" style={{ marginBottom: 12 }}>
                  <div className="spinner" style={{ width: 16, height: 16, display: "inline-block", marginRight: 8, borderWidth: 2 }}></div>
                  Checking row {qualityIdx + 1} of {qualityQueue.length}...
                </div>
              )}
              {consistencyRunning && (
                <div className="alert alert-info" style={{ marginBottom: 12 }}>
                  <div className="spinner" style={{ width: 16, height: 16, display: "inline-block", marginRight: 8, borderWidth: 2 }}></div>
                  Running consistency check across scholars...
                </div>
              )}

              {qualityDone && !qualityRunning && (
                <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
                  <button className="btn btn-secondary btn-sm"
                    onClick={() => { setQualityQueue([]); setQualityDone(false); }}>
                    Clear results
                  </button>
                  <span style={{ fontSize: "0.875rem", color: "#6B7280" }}>
                    Showing {qualityFilter} results
                  </span>
                </div>
              )}

              {/* Results list — filtered to the active tab.
                   We preserve the original queue index (realIdx) so action functions
                   (applyClaimSuggestion, markQualityKept etc.) operate on the correct item. */}
              {qualityQueue
                .map((item, realIdx) => ({ item, realIdx }))
                .filter(({ item }) => {
                  if (qualityFilter === "unchecked") return !item.result;
                  if (qualityFilter === "flagged") {
                    if (!item.result) return false;
                    const allFlags = [...(item.result.claim_flags || []), ...(item.result.angle_flags || [])];
                    return allFlags.some(f => !f.resolution);
                  }
                  if (qualityFilter === "clean") {
                    if (!item.result) return false;
                    if (item.result.overall === "clean") return true;
                    const allFlags = [...(item.result.claim_flags || []), ...(item.result.angle_flags || [])];
                    return allFlags.length === 0 || allFlags.every(f => f.resolution);
                  }
                  return true;
                })
                .map(({ item, realIdx: qIdx }) => {
                // Still running — placeholder
                if (!item.result) {
                  return (
                    <div key={qIdx} style={{ borderBottom: "1px solid #F3F4F6", padding: "8px 0", fontSize: "0.9375rem", color: "#6B7280" }}>
                      {item.source.author_name} — checking...
                    </div>
                  );
                }

                const r = item.result;

                // Actioned — collapsed
                if (item.status) {
                  return (
                    <div key={qIdx} style={{ borderBottom: "1px solid #F3F4F6", padding: "8px 0", display: "flex", justifyContent: "space-between", alignItems: "center", opacity: 0.5 }}>
                      <span style={{ fontSize: "0.9375rem", color: "#374151" }}>{item.source.author_name} — {item.source.source_title || "untitled"}</span>
                      <span style={{ fontSize: "0.8125rem", fontWeight: 700,
                        color: item.status === "deleted" ? "#991B1B" : item.status === "corrected" ? "#1D4ED8" : "#166534",
                        background: item.status === "deleted" ? "#FEE2E2" : item.status === "corrected" ? "#DBEAFE" : "#DCFCE7",
                        padding: "2px 8px", borderRadius: 10 }}>
                        {item.status === "deleted" ? "Deleted" : item.status === "corrected" ? "Corrected" : "Kept as-is"}
                      </span>
                    </div>
                  );
                }

                // Error
                if (r.overall === "error") {
                  return (
                    <div key={qIdx} style={{ borderBottom: "1px solid #F3F4F6", padding: "8px 0" }}>
                      <span style={{ fontSize: "0.9375rem", color: "#991B1B" }}>{item.source.author_name} — check failed: {r.error}</span>
                    </div>
                  );
                }

                // Clean — compact
                if (r.overall === "clean" && !(r.claim_flags?.length) && !(r.angle_flags?.length) && !(r.consistency_flags?.length)) {
                  return (
                    <div key={qIdx} style={{ borderBottom: "1px solid #F3F4F6", padding: "8px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <span style={{ fontSize: "0.9375rem", color: "#374151", fontWeight: 700 }}>{item.source.author_name}</span>
                        {item.source.source_title && <span style={{ fontSize: "0.875rem", color: "#6B7280", marginLeft: 6 }}>{item.source.source_title}</span>}
                        {r.unverifiable && <span style={{ fontSize: "0.8125rem", color: "#92400E", marginLeft: 8 }}>⚠ Attribution unverifiable</span>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#166534", background: "#DCFCE7", padding: "2px 8px", borderRadius: 10 }}>Clean</span>
                        <button className="btn btn-secondary btn-sm" onClick={() => markQualityKept(qIdx)}>Mark kept</button>
                      </div>
                    </div>
                  );
                }

                // Has flags — full display
                const unresolvedClaims = (r.claim_flags || []).filter(f => !f.resolution);
                const unresolvedAngles = (r.angle_flags || []).filter(f => !f.resolution);
                const unresolvedConsistency = (r.consistency_flags || []).filter(f => !f.resolution);
                const totalUnresolved = unresolvedClaims.length + unresolvedAngles.length + unresolvedConsistency.length;

                return (
                  <div key={qIdx} style={{ borderBottom: "1px solid #F3F4F6", paddingBottom: 16, marginBottom: 16, paddingTop: 12 }}>
                    {/* Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: "1rem", fontWeight: 700, color: "#111" }}>{item.source.author_name}</div>
                        <div style={{ fontSize: "0.875rem", color: "#6B7280" }}>
                          {item.source.source_title || "untitled"}{item.source.source_year ? " (" + item.source.source_year + ")" : ""}
                          {" · "}confidence: {r.confidence}
                          {r.unverifiable && " · ⚠ attribution unverifiable"}
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                        <span style={{ fontSize: "0.8125rem", fontWeight: 700,
                          color: r.overall === "significant-issues" ? "#991B1B" : "#92400E",
                          background: r.overall === "significant-issues" ? "#FEE2E2" : "#FFFBEB",
                          padding: "2px 8px", borderRadius: 10 }}>
                          {r.overall === "significant-issues" ? "Significant issues" : "Minor issues"}
                        </span>
                        {totalUnresolved > 0 && (
                          <span style={{ fontSize: "0.75rem", color: "#6B7280" }}>{totalUnresolved} unresolved</span>
                        )}
                      </div>
                    </div>

                    {/* Claim flags */}
                    {(r.claim_flags || []).length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: "0.8125rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6B7280", marginBottom: 6 }}>
                          Claim issues
                        </div>
                        {r.claim_flags.map((flag, fi) => (
                          <div key={flag.id || fi} style={{
                            background: flag.resolution ? "#F9FAFB" : "#FFFBEB",
                            border: "1px solid " + (flag.resolution ? "#E5E7EB" : "#FCD34D"),
                            borderRadius: 8, padding: "10px 12px", marginBottom: 8,
                            opacity: flag.resolution ? 0.6 : 1,
                          }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                              <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#92400E" }}>
                                Claim {flag.claim_index} · {flag.action === "delete" ? "Recommend deletion" : "Rewrite suggested"}
                              </span>
                              {flag.resolution && (
                                <span style={{ fontSize: "0.75rem", color: flag.resolution === "applied" ? "#166534" : "#6B7280",
                                  background: flag.resolution === "applied" ? "#DCFCE7" : "#F3F4F6",
                                  padding: "1px 6px", borderRadius: 8, fontWeight: 700 }}>
                                  {flag.resolution === "applied" ? "Applied" : "Dismissed"}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: "0.875rem", color: "#374151", marginBottom: flag.resolution ? 0 : 8, fontStyle: "italic" }}>
                              {flag.issue}
                            </div>
                            {!flag.resolution && (
                              <DiffDisplay
                                original={flag.original}
                                suggestion={flag.suggestion}
                                onApply={() => applyClaimSuggestion(qIdx, flag.id)}
                                onDismiss={() => dismissClaimFlag(qIdx, flag.id)}
                                applyLabel={flag.action === "delete" ? "Delete claim" : "Apply rewrite"}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Angle flags */}
                    {(r.angle_flags || []).length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: "0.8125rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6B7280", marginBottom: 6 }}>
                          Devotional angle issues
                        </div>
                        {r.angle_flags.map((flag, fi) => {
                          const checkCols = CHECK_COLOURS[flag.check] || CHECK_COLOURS.depth;
                          return (
                            <div key={flag.id || fi} style={{
                              background: flag.resolution ? "#F9FAFB" : "#FFF",
                              border: "1px solid " + (flag.resolution ? "#E5E7EB" : (flag.check === "discrimination" || flag.check === "harm" ? "#FECACA" : "#FCD34D")),
                              borderRadius: 8, padding: "10px 12px", marginBottom: 8,
                              opacity: flag.resolution ? 0.6 : 1,
                            }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: checkCols.text, background: checkCols.bg, padding: "1px 7px", borderRadius: 10 }}>
                                    {CHECK_LABELS[flag.check] || flag.check}
                                  </span>
                                  <span style={{ fontSize: "0.8125rem", color: "#6B7280" }}>Angle {flag.angle_index}</span>
                                </div>
                                {flag.resolution && (
                                  <span style={{ fontSize: "0.75rem", color: flag.resolution === "applied" ? "#166534" : "#6B7280",
                                    background: flag.resolution === "applied" ? "#DCFCE7" : "#F3F4F6",
                                    padding: "1px 6px", borderRadius: 8, fontWeight: 700 }}>
                                    {flag.resolution === "applied" ? "Applied" : "Dismissed"}
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: "0.875rem", color: "#374151", marginBottom: flag.resolution ? 0 : 8, fontStyle: "italic" }}>
                                {flag.issue}
                              </div>
                              {!flag.resolution && (
                                <DiffDisplay
                                  original={flag.original}
                                  suggestion={flag.suggestion}
                                  onApply={() => applyAngleSuggestion(qIdx, flag.id)}
                                  onDismiss={() => dismissAngleFlag(qIdx, flag.id)}
                                  applyLabel="Apply rewrite"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Consistency flags */}
                    {(r.consistency_flags || []).length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: "0.8125rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6B7280", marginBottom: 6 }}>
                          Cross-row consistency issues
                        </div>
                        {r.consistency_flags.map((flag, fi) => (
                          <div key={fi} style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "10px 12px", marginBottom: 8 }}>
                            <div style={{ fontSize: "0.875rem", color: "#1E40AF" }}>
                              Conflicts with source ID {flag.source_id_a === item.source.source_id ? flag.source_id_b : flag.source_id_a}: {flag.issue}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Inline error */}
                    {item.itemError && (
                      <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6, padding: "8px 10px", marginBottom: 8, fontSize: "0.875rem", color: "#991B1B" }}>
                        ⚠️ {item.itemError}
                      </div>
                    )}

                    {/* Row-level actions */}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                      {totalUnresolved === 0 && (
                        <button className="btn btn-success btn-sm" onClick={() => markQualityKept(qIdx)}>
                          Mark clean
                        </button>
                      )}
                      <button className="btn btn-secondary btn-sm" onClick={() => markQualityKept(qIdx)}>
                        Keep as-is
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => deleteQualityRow(qIdx)}>
                        Delete row
                      </button>
                    </div>
                  </div>
                );
              })}
              {qualityDone && !qualityRunning && qualityQueue.length > 0 && (() => {
                // Check how many items pass the active filter
                const visibleCount = qualityQueue.filter(item => {
                  if (qualityFilter === "unchecked") return !item.result;
                  if (qualityFilter === "flagged") {
                    if (!item.result) return false;
                    const flags = [...(item.result.claim_flags || []), ...(item.result.angle_flags || [])];
                    return flags.some(f => !f.resolution);
                  }
                  if (qualityFilter === "clean") {
                    if (!item.result) return false;
                    if (item.result.overall === "clean") return true;
                    const flags = [...(item.result.claim_flags || []), ...(item.result.angle_flags || [])];
                    return flags.length === 0 || flags.every(f => f.resolution);
                  }
                  return true;
                }).length;
                if (visibleCount === 0) {
                  return (
                    <div style={{ textAlign: "center", padding: "20px 0", color: "#6B7280", fontSize: "0.9375rem" }}>
                      No {qualityFilter} results in the loaded queue.
                      {qualityFilter !== "unchecked" && (
                        <span> Switch to a different filter or clear and reload.</span>
                      )}
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          )}
        </div>
      )}
    </>
  );
}
