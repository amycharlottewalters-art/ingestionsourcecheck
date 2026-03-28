import { DOMAINS, STRAND_COLOURS } from "../../constants.js";
import { staleWarning } from "../../lib/utils.js";

export default function LibraryTab(props) {
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
  applyClaimSuggestion, dismissClaimFlag, applyAngleSuggestion, dismissAngleFlag,
  markQualityKept, deleteQualityRow,
  setChunks, setIsChunked, setCurrentChunk
  } = props;
  return (
    <>
      {stage === -1 && activeTab === "library" && (
        <div className="page">
          <div className="page-title">Ingestion Tool</div>
          <div className="page-subtitle">Library health & session management</div>

          {homeLoading && (
            <div className="loading-state">
              <div className="spinner"></div>
              <div className="loading-msg">Loading library health…</div>
            </div>
          )}

          {!homeLoading && !homeData && (
            <button className="btn btn-primary" onClick={loadHome} disabled={!configValid}>
              {configValid ? "Load Dashboard" : "Complete configuration first"}
            </button>
          )}

          {homeData && (
            <>
              {/* Stats */}
              <div className="stats-row">
                <div className="stat-box">
                  <div className="stat-num">{homeData.total}</div>
                  <div className="stat-label">Source rows</div>
                </div>
                <div className="stat-box">
                  <div className="stat-num">{homeData.coverage.filter(t => t.active_source_rows === 0).length}</div>
                  <div className="stat-label">Topics empty</div>
                </div>
                <div className="stat-box">
                  <div className="stat-num">{homeData.sessions.length}</div>
                  <div className="stat-label">Pending</div>
                </div>
              </div>

              {/* Strand balance */}
              <div className="card">
                <div className="card-title">Strand Balance</div>
                <div className="strand-bar">
                  {["critical","evangelical","catholic","feminist","social-prophet","patristic","jewish","orthodox","liberation","other"].map(strand => {
                    const count = homeData.strandCounts[strand] || 0;
                    const max = Math.max(...Object.values(homeData.strandCounts), 1);
                    const cols = STRAND_COLOURS[strand] || STRAND_COLOURS.other;
                    return (
                      <div className="strand-row" key={strand}>
                        <div className="strand-name">
                          <span className="strand-badge" style={{ background: cols.bg, color: cols.text }}>{strand}</span>
                        </div>
                        <div className="strand-track">
                          <div className="strand-fill" style={{ width: "" + ((count / max) * 100) + "%", background: cols.text }}></div>
                        </div>
                        <div className="strand-count">{count}</div>
                        {count === 0 && <span style={{ fontSize: "0.8125rem", color: "#EF4444", fontWeight: 700 }}>⚠ none</span>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Topics needing coverage */}
              <div className="card">
                <div className="card-title">Topics Needing Coverage</div>
                {(() => {
                  const empty = homeData.coverage.filter(t => t.active_source_rows === 0);
                  if (empty.length === 0) return <p className="text-muted">All topics have at least one row 🎉</p>;
                  const byDomain = empty.reduce((acc, t) => {
                    (acc[t.domain] = acc[t.domain] || []).push(t);
                    return acc;
                  }, {});
                  return Object.entries(byDomain).map(([dom, topics]) => (
                    <div className="domain-group" key={dom}>
                      <div className="domain-header" style={{ cursor: "default" }}>
                        {DOMAINS.find(d => d.slug === dom)?.label || dom}
                        <span className="domain-count">{topics.length}</span>
                      </div>
                      <div className="topic-chips">
                        {topics.map(t => (
                          <div className="topic-chip" key={t.topic_id} title={"ID: " + t.topic_id}>{t.topic_display_name}</div>
                        ))}
                      </div>
                    </div>
                  ));
                })()}
              </div>

              {/* Pending sessions */}
              {homeData.sessions.length > 0 && (
                <div className="card">
                  <div className="card-title">Pending Sessions</div>
                  {homeData.sessions.map(sess => (
                    <div className="session-card" key={sess.session_id} onClick={() => resumeSession(sess)}>
                      <div className="session-card-top">
                        <div>
                          <div className="session-card-desc">{sess.source_description}</div>
                          <div className="session-card-meta">{sess.date} · {sess.source_type} · {sess.status}</div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                          <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: sess.status === "pending-review" ? "#1D4ED8" : "#6B7280", background: sess.status === "pending-review" ? "#DBEAFE" : "#F3F4F6", padding: "2px 8px", borderRadius: 10 }}>{sess.status}</span>
                          {staleWarning(sess.preview_generated_at) && (
                            <span style={{ fontSize: "0.75rem", color: "#92400E", background: "#FFFBEB", padding: "2px 6px", borderRadius: 10, fontWeight: 700 }}>STALE</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button className="btn btn-primary btn-full mt-16" onClick={() => {
                resetSession();
                setStage(0);
              }}>
                + Start New Session
              </button>
            </>
          )}
        </div>
      )}

    </>
  );
}
