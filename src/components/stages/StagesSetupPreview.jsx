import { SOURCE_TYPES, STRAND_COLOURS } from "../../constants.js";
import { confClass, staleWarning, wordCount } from "../../lib/utils.js";

export default function StagesSetupPreview(props) {
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
  function openAddTopicFromFlag(name) {
    setPanelOpen(true);
    setPanelTab("topics");
    setAddTopicPrefill(name);
    setAddTopicOpen(true);
    setNewTopic(t => ({ ...t, topic_display_name: name, topic_name: slugify(name) }));
  }

  function openAddScholarFromFlag(name) {
    setPanelOpen(true);
    setPanelTab("scholars");
    setAddScholarPrefill(name);
    setAddScholarOpen(true);
    setNewScholar(s => ({ ...s, scholar_name: name }));
  }

  return (
    <>
      {/*  Stage 0: Session Setup  */}
      {stage === 0 && (
        <div className="page">
          <div className="page-title">New Session</div>
          <div className="page-subtitle">Describe the source material you're ingesting</div>

          <div className="field">
            <label className="label">Source Description *</label>
            <input
              className="input"
              type="text"
              placeholder="e.g. Wright — Simply Jesus ch. 3–5"
              value={s0.source_description}
              onChange={e => setS0(s => ({ ...s, source_description: e.target.value }))}
            />
          </div>

          <div className="field">
            <label className="label">Source Type *</label>
            <select
              className="input"
              value={s0.source_type}
              onChange={e => setS0(s => ({ ...s, source_type: e.target.value }))}
            >
              {SOURCE_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>



          {s0.source_type === "deep-research" && (
            <div className="alert alert-warn" style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Deep Research source</div>
              All claims will be capped at low confidence and framed with explicit hedging in devotionals. The chain of attribution cannot be verified. Run a source check after ingestion.
            </div>
          )}

          <div className="action-row">
            <button className="btn btn-secondary" onClick={() => setStage(-1)}>← Back</button>
            <button className="btn btn-primary" onClick={createSession} disabled={loading}>
              {loading ? loadingMsg : "Create Session →"}
            </button>
          </div>
        </div>
      )}

      {/*  Stage 1: Source Material  */}
      {stage === 1 && (
        <div className="page">
          <div className="page-title">Source Material</div>
          <div className="page-subtitle">{session?.source_description}</div>

          {!sourceText ? (
            <>
              <div
                className={"upload-area " + (dragOver ? "drag" : "")}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              >
                <div className="upload-icon">📄</div>
                <div className="upload-text">Tap to upload PDF or text file</div>
                <div className="upload-sub">Or drag and drop here</div>
                <input ref={fileInputRef} type="file" accept=".pdf,.txt,.md" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
              </div>

              <div style={{ textAlign: "center", margin: "14px 0", color: "#9CA3AF", fontSize: "0.9375rem" }}>— or paste text —</div>

              <div className="field">
                <textarea
                  className="input textarea"
                  placeholder="Paste source text here…"
                  onBlur={e => { if (e.target.value.trim()) handleTextReady(e.target.value.trim()); }}
                />
              </div>
            </>
          ) : (
            <>
              {loading ? (
                <div className="loading-state">
                  <div className="spinner"></div>
                  <div className="loading-msg">{loadingMsg}</div>
                </div>
              ) : (
                <>
                  <div className="alert alert-info">
                    ✓ Source text loaded · {wordCount(sourceText).toLocaleString()} words
                    {isChunked && (" · Split into " + chunks.length + " chunks")}
                  </div>

                  {isChunked && (
                    <div className="card">
                      <div className="card-title">Document Chunks</div>
                      {chunks.map((c, i) => (
                        <div className="chunk-item" key={i}>
                          <span>Chunk {i + 1} of {chunks.length} · {wordCount(c).toLocaleString()} words</span>
                          <span className={"chunk-status " + (i < currentChunk ? "done" : i === currentChunk ? "current" : "pending")}>
                            {i < currentChunk ? "Done" : i === currentChunk ? "Current" : "Pending"}
                          </span>
                        </div>
                      ))}
                      {documentMap && <div className="alert alert-success mt-12">✓ Document map generated</div>}
                    </div>
                  )}

                  <div className="action-row">
                    <button className="btn btn-secondary" onClick={() => { setSourceText(""); setChunks([]); setIsChunked(false); }}>
                      Change Text
                    </button>
                    <button className="btn btn-primary" onClick={runPreview}>
                      Run Preview →
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/*  Stage 2: Preview  */}
      {stage === 2 && (
        <div className="page">
          <div className="page-title">Preview</div>
          <div className="page-subtitle">
            {isChunked ? "Chunk " + (currentChunk + 1) + " of " + chunks.length + " · " : ""}
            {session?.source_description}
          </div>

          {staleWarning(session?.preview_generated_at) && (
            <div className="alert alert-warn">
              This preview is more than 7 days old. Topic assignments may be stale — consider re-running the preview.
            </div>
          )}

          {!previewOutput && !previewStreaming && (
            <button className="btn btn-primary btn-full" onClick={runPreview}>
              Generate Preview
            </button>
          )}

          {previewStreaming && !previewOutput && (
            <div className="loading-state">
              <div className="spinner"></div>
              <div className="loading-msg">Generating preview… streaming response</div>
            </div>
          )}

          {previewOutput && (
            <>
              <div className="stream-box">{previewOutput}</div>

              {/* Coverage gaps — actioned derived from allTopicsManaged */}
              {parsedProposal?.coverage_gaps?.length > 0 && (() => {
                const knownTopics = new Set((allTopicsManaged || []).map(t => t.topic_display_name.toLowerCase().trim()));
                const items = parsedProposal.coverage_gaps;
                const anyUnactioned = items.some(name => !knownTopics.has(name.toLowerCase().trim()));
                if (!anyUnactioned) return null;
                return (
                  <div className="alert alert-info" style={{ marginBottom: 8 }}>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>⚑ Coverage gaps — possible new topics</div>
                    {items.map((name, i) => {
                      const added = knownTopics.has(name.toLowerCase().trim());
                      return (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4, opacity: added ? 0.45 : 1 }}>
                          <span style={{ fontSize: "0.9375rem" }}>{name}</span>
                          {added
                            ? <span style={{ fontSize: "0.8125rem", color: "#166534", fontWeight: 700, background: "#DCFCE7", padding: "2px 8px", borderRadius: 10 }}>✓ Added</span>
                            : <button className="btn btn-sm btn-secondary" style={{ fontSize: "0.8125rem" }}
                                onClick={() => openAddTopicFromFlag(name)}>
                                + Add as Topic
                              </button>
                          }
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Non-allowed scholars — actioned derived from allScholars */}
              {parsedProposal?.non_allowed_scholars?.length > 0 && (() => {
                const knownNames = new Set((allScholars || []).map(sc => sc.scholar_name.toLowerCase().trim()));
                const items = parsedProposal.non_allowed_scholars;
                const anyUnactioned = items.some(s => !knownNames.has(s.name.toLowerCase().trim()));
                if (!anyUnactioned) return null;
                return (
                  <div className="alert alert-warn" style={{ marginBottom: 8 }}>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>⚑ Scholars referenced but not in allowed list</div>
                    {items.map((s, i) => {
                      const added = knownNames.has(s.name.toLowerCase().trim());
                      return (
                        <div key={i} style={{ marginTop: 6, paddingBottom: 6, borderBottom: i < items.length - 1 ? "1px solid #FCD34D" : "none", opacity: added ? 0.45 : 1 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                            <div>
                              <div style={{ fontSize: "0.9375rem", fontWeight: 700 }}>{s.name}</div>
                              {s.relevance && <div style={{ fontSize: "0.875rem", color: "#92400E", marginTop: 2 }}>{s.relevance}</div>}
                            </div>
                            {added
                              ? <span style={{ fontSize: "0.8125rem", color: "#166534", fontWeight: 700, flexShrink: 0, background: "#DCFCE7", padding: "2px 8px", borderRadius: 10 }}>✓ Added</span>
                              : <button className="btn btn-sm btn-secondary" style={{ fontSize: "0.8125rem", flexShrink: 0 }}
                                  onClick={() => openAddScholarFromFlag(s.name)}>
                                  + Add to Allowed Scholars
                                </button>
                            }
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Raw Proposal — collapsed by default */}
              <div style={{ margin: "12px 0", border: "1px solid #E5E7EB", borderRadius: 8, overflow: "hidden" }}>
                <div
                  className="collapsible-header"
                  style={{ padding: "10px 14px", background: "#F9FAFB" }}
                  onClick={() => setRawProposalCollapsed(v => !v)}
                >
                  <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: 8 }}>
                    Raw Proposal
                    {parsedProposal
                      ? <span style={{ background: "#DCFCE7", color: "#166534", padding: "1px 7px", borderRadius: 10, fontSize: "0.8125rem" }}>✓ {parsedProposal.scholars?.length || 0} scholars parsed</span>
                      : <span style={{ background: "#FEF2F2", color: "#991B1B", padding: "1px 7px", borderRadius: 10, fontSize: "0.8125rem" }}>⚠ not parsed — re-run preview</span>
                    }
                  </span>
                  <span style={{ fontSize: "0.8125rem", color: "#9CA3AF" }}>{rawProposalCollapsed ? "▼ Show" : "▲ Hide"}</span>
                </div>
                {!rawProposalCollapsed && (
                  <div style={{ padding: 14, background: "#fff" }}>
                    <pre style={{ fontSize: "0.875rem", color: "#374151", whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "monospace", lineHeight: 1.5, margin: 0 }}>
                      {parsedProposal
                        ? JSON.stringify(parsedProposal, null, 2)
                        : "No structured proposal found in the preview output. Re-run the preview to generate one."}
                    </pre>
                  </div>
                )}
              </div>

              <div className="action-row mt-12">
                <button className="btn btn-secondary" onClick={runPreview}>↺ Re-run Preview</button>
                <button className="btn btn-primary" onClick={proceedToReview}>Review Decisions →</button>
              </div>
            </>
          )}
        </div>
      )}

    </>
  );
}
