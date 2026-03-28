import { STRAND_COLOURS } from "../../constants.js";
import ManualScholarForm from "../ManualScholarForm.jsx";
import { confClass, staleWarning } from "../../lib/utils.js";

export default function StagesReviewApprove(props) {
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
  qualityQueue, setQualityQueue, qualityRunning, qualityIdx, qualityFilter,
  setQualityFilter, qualityDone, setQualityDone,
  loadAllSources, runDuplicateScan, askClaudeAboutDuplicate,
  mergeDupRows, deleteDupRow, dismissDup,
  runQualityCheck, runConsistencyCheck, loadPersistedResults,
  applyClaimSuggestion, dismissClaimFlag,
  applyAngleSuggestion, dismissAngleFlag,
  markQualityKept, deleteQualityRow
  } = props;
  // Local topic lookup using reviewTopics (always populated) with fallback to allTopics
  function localTopicName(tid) {
    const source = reviewTopics.length > 0 ? reviewTopics : allTopics;
    const t = source.find(x => x.topic_id === tid);
    return t ? t.topic_display_name : topicDisplayName(tid);
  }

  return (
    <>
      {/*  Stage 3: Review Decisions  */}
      {stage === 3 && (
        <div className="page">
          <div className="page-title">Review Decisions</div>
          <div className="page-subtitle">Confirm scholars and topic assignments before committing</div>

          {staleWarning(session?.preview_generated_at) && (
            <div className="alert alert-warn">
              This preview is more than 7 days old. Topic assignments may be stale — consider re-running the preview.
            </div>
          )}

          {scholarOrTopicAddedSincePreview && (
            <div className="alert alert-warn" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 2 }}>Scholars or topics were added after this preview.</div>
                <div style={{ fontSize: "0.9375rem" }}>Their assignments won't appear in these cards. Rerun the preview to include them.</div>
              </div>
              <button className="btn btn-secondary btn-sm" style={{ flexShrink: 0 }}
                onClick={() => { setStage(2); runPreview(); }}>
                Rerun Preview
              </button>
            </div>
          )}

          {scholarCards.map((card, cardIdx) => {
            const cols = STRAND_COLOURS[card.strand] || STRAND_COLOURS.other;

            return (
              <div className={"scholar-card " + (card.included ? "" : "excluded")} key={cardIdx}>
                <div className="scholar-card-header">
                  <div>
                    <div className="scholar-card-name">{card.scholar_name}</div>
                    <div className="scholar-card-id">ID: {card.scholar_id}</div>
                  </div>
                  <span className="strand-badge" style={{ background: cols.bg, color: cols.text }}>{card.strand}</span>
                </div>

                {card.flags?.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    {card.flags.map((flag, fi) => (
                      <div className="alert alert-warn" key={fi} style={{ marginBottom: 4, fontSize: "0.875rem", padding: "7px 10px" }}>
                        ⚑ {flag}
                      </div>
                    ))}
                  </div>
                )}

                <div className="toggle-row">
                  <button className={"toggle " + (card.included ? "on" : "")} onClick={() => setCardField(cardIdx, "included", !card.included)} />
                  <span className="toggle-label">{card.included ? "Included" : "Excluded"}</span>
                </div>

                {card.included && (
                  <>
                    <div className="field">
                      <label className="label">Source Title</label>
                      <input className="input" type="text" placeholder="Optional" value={card.source_title}
                        onChange={e => setCardField(cardIdx, "source_title", e.target.value)} />
                    </div>
                    <div className="field">
                      <label className="label">Source Year</label>
                      <input className="input" type="number" placeholder="e.g. 2011" value={card.source_year}
                        onChange={e => setCardField(cardIdx, "source_year", e.target.value)} style={{ maxWidth: 140 }} />
                    </div>

                    <div className="field">
                      <label className="label">Overall Confidence</label>
                      <div className="confidence-row">
                        {["high", "medium", "low"].map(c => (
                          <button key={c} className={"conf-btn " + (confClass(card.confidence, c) ? "active-" + c : "")}
                            onClick={() => setCardField(cardIdx, "confidence", c)}
                            style={{ background: card.confidence === c ? (c === "high" ? "#DCFCE7" : c === "medium" ? "#FFFBEB" : "#FEF2F2") : "#fff" }}>
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>


                    <div className="field">
                      <label className="label">Topic Assignments</label>
                      <div style={{ fontSize: "0.875rem", color: "#9CA3AF", marginBottom: 8 }}>
                        Proposed by Claude. Deselect any that do not apply.
                      </div>
                      <div className="topic-chips">
                        {Object.keys(card.selectedTopics).map(tidStr => {
                          const tid = parseInt(tidStr, 10);
                          const topicsSource = reviewTopics.length > 0 ? reviewTopics : allTopics;
                          const t = topicsSource.find(x => x.topic_id === tid);
                          if (!t) return null;
                          const sel = !!card.selectedTopics[tid];
                          const conf = card.selectedTopics[tid];
                          return (
                            <div key={tid}>
                              <div
                                className={"topic-chip " + (sel ? "selected" : "")}
                                title={t.topic_description}
                                onClick={() => toggleTopicOnCard(cardIdx, tid)}
                              >
                                {t.topic_display_name}
                                <span style={{ fontSize: "0.75rem", color: "#9CA3AF", marginLeft: 4 }}>{t.domain}</span>
                              </div>
                              {sel && (
                                <div className="per-topic-conf">
                                  <span className="ptc-label">conf:</span>
                                  {["high", "medium", "low"].map(c => (
                                    <button key={c} className={"ptc-btn " + (conf === c ? "active-" + c : "")}
                                      onClick={() => setTopicConf(cardIdx, tid, c)}>
                                      {c[0].toUpperCase()}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {Object.keys(card.selectedTopics).length === 0 && (
                        <div>
                          <div style={{ fontSize: "0.875rem", color: "#92400E", background: "#FFFBEB", border: "1px solid #FCD34D", borderRadius: 6, padding: "8px 10px", marginBottom: 8 }}>
                            ⚠ No topics assigned — this scholar cannot be committed until at least one topic is selected below.
                          </div>
                          <select className="input" style={{ marginBottom: 6 }}
                            onChange={e => {
                              const tid = parseInt(e.target.value, 10);
                              if (tid) toggleTopicOnCard(cardIdx, tid);
                              e.target.value = "";
                            }}
                            defaultValue="">
                            <option value="">+ Add a topic assignment…</option>
                            {(reviewTopics.length > 0 ? reviewTopics : allTopics)
                              .filter(t => !card.selectedTopics[t.topic_id])
                              .sort((a, b) => a.topic_display_name.localeCompare(b.topic_display_name))
                              .map(t => (
                                <option key={t.topic_id} value={t.topic_id}>
                                  {t.topic_display_name} ({t.domain})
                                </option>
                              ))
                            }
                          </select>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}

          {/* Manual add */}
          <div className="card">
            <div className="card-title">Add Scholar Manually</div>
            <ManualScholarForm
              scholars={scholars}
              onAdd={(card) => setScholarCards(c => [...c, card])}
            />
          </div>

          {(() => {
            const blockedCards = scholarCards.filter(c => c.included && Object.keys(c.selectedTopics).length === 0);
            return blockedCards.length > 0 ? (
              <div className="alert alert-warn" style={{ marginBottom: 8 }}>
                {blockedCards.length} included scholar{blockedCards.length > 1 ? "s have" : " has"} no topic assigned: {blockedCards.map(c => c.scholar_name).join(", ")}. Assign at least one topic each before committing.
              </div>
            ) : null;
          })()}
          <div className="action-row">
            <button className="btn btn-secondary" onClick={() => setStage(2)}>← Back to Preview</button>
            <button className="btn btn-primary" onClick={runCommit}>
              Confirm & Commit →
            </button>
          </div>
        </div>
      )}

      {/*  Stage 4: Loading  */}
      {stage === 4 && (
        <div className="page">
          <div className="loading-state" style={{ paddingTop: 80 }}>
            <div className="spinner"></div>
            <div className="loading-msg">{loadingMsg}</div>
            <div style={{ fontSize: "0.875rem", color: "#9CA3AF", marginTop: 8 }}>Please wait — Claude is generating structured entries</div>
          </div>
        </div>
      )}

      {/*  Stage 5: Approve & Write  */}
      {stage === 5 && (
        <div className="page">
          <div className="page-title">Approve & Write</div>
          <div className="page-subtitle">{sourceEntries.length} entries ready for review</div>

          {postCommitReport && (
            <div>
              <div
                className="collapsible-header"
                onClick={() => setReportCollapsed(v => !v)}
                style={{ marginBottom: 4 }}
              >
                <span style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#374151" }}>Post-Commit Report</span>
                <span style={{ fontSize: "0.8125rem", color: "#9CA3AF" }}>{reportCollapsed ? "▼ Show" : "▲ Hide"}</span>
              </div>
              {!reportCollapsed && <div className="post-commit-report">{postCommitReport}</div>}
            </div>
          )}

          <div className="action-row mb-16">
            <button className="btn btn-success btn-sm" onClick={approveAll}>✓ Approve All</button>
            <button className="btn btn-danger btn-sm" onClick={rejectAll}>✗ Reject All</button>
          </div>

          {sourceEntries.map((entry, idx) => {
            const src = entry.data;
            return (
              <div className={"review-card " + (entry.status || "")} key={idx}>
                <div className="review-card-header">
                  <div className="review-card-title">{src.author_name}</div>
                  <div className="review-card-sub">
                    {[src.source_title, src.source_year].filter(Boolean).join(" · ")}
                    {" · "}
                    <span style={{ fontWeight: 700, color: src.citation_confidence === "high" ? "#166534" : src.citation_confidence === "low" ? "#991B1B" : "#92400E" }}>
                      {src.citation_confidence} confidence
                    </span>
                  </div>
                </div>

                <div className="review-section">
                  <div className="review-section-label">Topics</div>
                  <div className="tag-list">
                    {(src.topic_ids || []).map(tid => (
                      <span className="tag" key={tid}>{localTopicName(tid)}</span>
                    ))}
                  </div>
                </div>

                {src.content_summary && (
                  <div className="review-section">
                    <div className="review-section-label">Content Summary</div>
                    {(Array.isArray(src.content_summary) ? src.content_summary : src.content_summary.split("\n")).map((claim, i) => (
                      <div className="claim-item" key={i}>{claim}</div>
                    ))}
                  </div>
                )}

                {src.devotional_angles?.length > 0 && (
                  <div className="review-section">
                    <div className="review-section-label">Devotional Angles</div>
                    {src.devotional_angles.map((angle, i) => (
                      <div className="angle-item" key={i}>{angle}</div>
                    ))}
                  </div>
                )}

                {src.theological_themes?.length > 0 && (
                  <div className="review-section">
                    <div className="review-section-label">Theological Themes</div>
                    <div className="tag-list">
                      {src.theological_themes.map((t, i) => <span className="tag" key={i}>{t}</span>)}
                    </div>
                  </div>
                )}

                {src.scripture_references?.length > 0 && (
                  <div className="review-section">
                    <div className="review-section-label">Scripture References</div>
                    <div className="tag-list">
                      {src.scripture_references.map((r, i) => <span className="tag" key={i}>{r}</span>)}
                    </div>
                  </div>
                )}

                {src.key_terms && (
                  <div className="review-section">
                    <div className="review-section-label">Key Terms</div>
                    <div style={{ fontSize: "0.9375rem", color: "#374151" }}>
                      {Array.isArray(src.key_terms) ? src.key_terms.join(" · ") : src.key_terms}
                    </div>
                  </div>
                )}

                {src.short_quotes?.length > 0 && (
                  <div className="review-section">
                    <div className="review-section-label">Short Quotes</div>
                    {src.short_quotes.map((q, i) => (
                      <div className="quote-block" key={i}>
                        "{q.quote}"
                        <div className="quote-ref">{q.reference}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Existing row duplicate warning + auto comparison */}
                {entry.existingRows?.length > 0 && !entry.status && (
                  <div style={{ marginTop: 10, border: "1px solid #FCD34D", borderRadius: 8, overflow: "hidden" }}>
                    {/* Header with recommendation badge */}
                    <div style={{ background: "#FFFBEB", padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "#92400E" }}>
                        ⚠ {entry.existingRows.length} existing row{entry.existingRows.length > 1 ? "s" : ""} found
                      </span>
                      {entry.comparing && <span style={{ fontSize: "0.8125rem", color: "#9CA3AF" }}>Comparing...</span>}
                      {entry.comparison && !entry.comparing && (() => {
                        const rec = entry.comparison.recommendation;
                        const colour = rec === "skip" ? { bg: "#FEE2E2", text: "#991B1B" } : rec === "merge" ? { bg: "#DBEAFE", text: "#1D4ED8" } : { bg: "#DCFCE7", text: "#166534" };
                        return <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: colour.text, background: colour.bg, padding: "2px 8px", borderRadius: 10 }}>
                          {rec === "skip" ? "Suggest: Skip" : rec === "merge" ? "Suggest: Merge" : "Suggest: Add New"}
                        </span>;
                      })()}
                    </div>

                    {/* Comparison summary */}
                    {entry.comparison && !entry.comparing && (
                      <div style={{ padding: "10px 12px", background: "#FFFDF0", borderTop: "1px solid #FCD34D" }}>
                        <div style={{ display: "flex", gap: 12, marginBottom: 6, flexWrap: "wrap" }}>
                          <span style={{ fontSize: "0.875rem" }}><strong>Overlap:</strong> {entry.comparison.overlap}</span>
                          <span style={{ fontSize: "0.875rem" }}><strong>Unique claims:</strong> {entry.comparison.unique_count}</span>
                        </div>
                        {entry.comparison.recommendation_reason && (
                          <div style={{ fontSize: "0.875rem", color: "#92400E", fontStyle: "italic", marginBottom: entry.comparison.unique_claims?.length > 0 ? 8 : 0 }}>
                            {entry.comparison.recommendation_reason}
                          </div>
                        )}
                        {entry.comparison.unique_claims?.length > 0 && (
                          <div>
                            <div style={{ fontSize: "0.8125rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#92400E", marginBottom: 5 }}>Unique claims in new entry</div>
                            {entry.comparison.unique_claims.map((claim, ci) => (
                              <div key={ci} style={{ fontSize: "0.875rem", color: "#374151", padding: "3px 0", borderBottom: "1px solid #FEF3C7", lineHeight: 1.4 }}>{ci + 1}. {claim}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Full existing row — collapsible, open by default */}
                    {entry.existingRows.map((ex, ei) => (
                      <div key={ei} style={{ borderTop: "1px solid #FCD34D" }}>
                        <div style={{ background: "#FEFCE8", padding: "8px 12px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                          onClick={() => setSourceEntries(es => es.map((e, i) => i === idx ? { ...e, existingCollapsed: !e.existingCollapsed } : e))}>
                          <div style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#374151" }}>
                            Existing: {ex.author_name}{ex.source_title ? " — " + ex.source_title : ""}{ex.source_year ? " (" + ex.source_year + ")" : ""}
                            <span style={{ fontSize: "0.8125rem", color: "#9CA3AF", fontWeight: 400, marginLeft: 6 }}>{ex.citation_confidence} confidence</span>
                          </div>
                          <span style={{ fontSize: "0.8125rem", color: "#92400E" }}>{entry.existingCollapsed ? "▼ Show" : "▲ Hide"}</span>
                        </div>
                        {!entry.existingCollapsed && (
                          <div style={{ padding: "0 12px 12px", background: "#FEFCE8" }}>
                            {ex.content_summary && (
                              <div style={{ marginBottom: 10 }}>
                                <div style={{ fontSize: "0.8125rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#9CA3AF", marginBottom: 5, paddingTop: 10 }}>All existing claims</div>
                                {(Array.isArray(ex.content_summary) ? ex.content_summary : ex.content_summary.split("\n")).map((c, ci) => (
                                  <div key={ci} style={{ fontSize: "0.875rem", color: "#374151", padding: "3px 0", borderBottom: "1px solid #F3F4F6", lineHeight: 1.4 }}>{c}</div>
                                ))}
                              </div>
                            )}
                            {ex.devotional_angles && ex.devotional_angles.length > 0 && (
                              <div>
                                <div style={{ fontSize: "0.8125rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#9CA3AF", marginBottom: 5 }}>Existing devotional angles</div>
                                {ex.devotional_angles.map((a, ai) => (
                                  <div key={ai} style={{ fontSize: "0.875rem", color: "#374151", padding: "6px 10px", borderLeft: "3px solid #FCD34D", background: "#FFFBEB", borderRadius: "0 4px 4px 0", marginBottom: 4, lineHeight: 1.4 }}>{a}</div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="action-row">
                  {!entry.status && entry.existingRows?.length > 0 ? (
                    <>
                      <button className="btn btn-danger btn-sm" onClick={() => rejectEntry(idx)} title="Don't write — existing row is sufficient">
                        Skip
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => mergeEntry(idx)} disabled={entry.merging} title="Claude combines both rows into one enriched entry">
                        {entry.merging ? "Merging…" : "✦ Merge with Claude"}
                      </button>
                      <button className="btn btn-success btn-sm" onClick={() => approveEntry(idx)} title="Write as additional row alongside existing">
                        + Add as New
                      </button>
                    </>
                  ) : !entry.status ? (
                    <>
                      <button className="btn btn-success btn-sm" onClick={() => approveEntry(idx)}>✓ Approve & Write</button>
                      <button className="btn btn-danger btn-sm" onClick={() => rejectEntry(idx)}>✗ Reject</button>
                    </>
                  ) : null}
                  {entry.status === "approved" && <span style={{ fontSize: "0.9375rem", color: "#166534", fontWeight: 700 }}>✓ Written to Supabase</span>}
                  {entry.status === "merged" && <span style={{ fontSize: "0.9375rem", color: "#1D4ED8", fontWeight: 700 }}>✦ Merged and written</span>}
                  {entry.status === "rejected" && <span style={{ fontSize: "0.9375rem", color: "#991B1B", fontWeight: 700 }}>✗ Skipped</span>}
                  {entry.entryError && (
                    <div style={{ width: "100%", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6, padding: "8px 10px", marginTop: 6, fontSize: "0.875rem", color: "#991B1B" }}>
                      ⚠️ {entry.entryError}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {sourceEntries.every(e => e.status) && (
            <div className="alert alert-success mt-12">
              {sourceEntries.filter(e => e.status === "approved").length} written ·{" "}
              {sourceEntries.filter(e => e.status === "merged").length} merged ·{" "}
              {sourceEntries.filter(e => e.status === "rejected").length} skipped
            </div>
          )}

          {sourceEntries.every(e => e.status) && (
            <button className="btn btn-primary btn-full mt-12" onClick={finaliseSession}>
              {isChunked && currentChunk < chunks.length - 1
                ? "→ Proceed to Chunk " + (currentChunk + 2) + " of " + chunks.length
                : "Finalise Session & Return to Dashboard"}
            </button>
          )}
        </div>
      )}
      {/* Floating action button — visible during workflow stages */}
    </>
  );
}
