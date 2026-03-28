import { useState } from "react";
import { DOMAINS } from "../../constants.js";
import TopicList from "../TopicList.jsx";
import TopicDetailPanel from "./TopicDetailPanel.jsx";

export default function TopicsTab(props) {
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
  suggestTopicDescriptionAndDomain, suggestAdjacentTopics, suggestTopicAll,
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

  const [selectedTopic, setSelectedTopic] = useState(null);

  return (
    <>
      {/*  Topics Tab  */}
      {stage === -1 && activeTab === "topics" && (
        <div className="page">
          <div className="page-title">Topics</div>
          <div className="page-subtitle">Manage the theological topic taxonomy</div>

          {topicsError && (
            <div className="alert alert-error">
              ⚠️ {topicsError}
              <button onClick={() => setTopicsError("")} style={{ float: "right", background: "none", border: "none", cursor: "pointer", color: "#991B1B", fontWeight: 700 }}>×</button>
            </div>
          )}

          <button className="btn btn-primary btn-full mb-16" onClick={() => {
            setAddTopicOpen(v => !v);
            if (!addTopicOpen) {
              setNewTopic({ topic_display_name: "", topic_name: "", topic_description: "", domain: "galilean-ministry" });
              setNewTopicAdjacent([]);
              setAdjacentSuggested(false);
              setAddTopicPrefill(null);
            }
          }}>
            {addTopicOpen ? "Cancel" : "+ Add Topic"}
          </button>

          {addTopicOpen && (
            <div className="card" style={{ borderColor: "#3B82F6" }}>
              <div className="card-title">New Topic</div>
              {addTopicPrefill && (
                <div className="alert alert-info mb-8">Pre-filled from preview flag: "{addTopicPrefill}"</div>
              )}
              <div className="field">
                <label className="label">Display Name *</label>
                <input className="input" type="text" placeholder="e.g. Kingdom of God"
                  value={newTopic.topic_display_name}
                  onChange={e => {
                    const display = e.target.value;
                    setNewTopic(t => ({ ...t, topic_display_name: display, topic_name: slugify(display) }));
                    setAdjacentSuggested(false);
                  }} />
              </div>
              <div className="field">
                <label className="label">Slug (auto-generated, editable) *</label>
                <input className="input" type="text" placeholder="e.g. kingdom-of-god"
                  value={newTopic.topic_name}
                  onChange={e => setNewTopic(t => ({ ...t, topic_name: slugify(e.target.value) }))} />
              </div>
              {/* Single combined suggest button */}
              <div className="field">
                <button className="btn btn-primary btn-full"
                  disabled={!newTopic.topic_display_name || suggestingDescription}
                  onClick={() => suggestTopicAll(newTopic.topic_display_name, allTopicsManaged, (result) => {
                    setNewTopic(t => ({ ...t, topic_description: result.description, domain: result.domain }));
                    setNewTopicAdjacent(result.adjacentIds);
                    if (result.allFetchedTopics && result.allFetchedTopics.length > 0) {
                      setAllTopicsManaged(result.allFetchedTopics);
                    }
                    setAdjacentSuggested(true);
                  }, setSuggestingDescription)}>
                  {suggestingDescription ? "Asking Claude…" : "✦ Get suggestions (description + adjacent topics)"}
                </button>
              </div>

              <div className="field">
                <label className="label">Description * <span style={{ fontWeight: 300, textTransform: "none", letterSpacing: 0 }}>(one sentence — or use ✦ Get suggestions above)</span></label>
                <textarea className="input textarea" style={{ minHeight: 70 }} placeholder="e.g. Jesus's proclamation of God's reign as both present reality and future hope."
                  value={newTopic.topic_description}
                  onChange={e => setNewTopic(t => ({ ...t, topic_description: e.target.value }))} />
              </div>

              <div className="field">
                <label className="label">Domain *</label>
                <select className="input" value={newTopic.domain} onChange={e => setNewTopic(t => ({ ...t, domain: e.target.value }))}>
                  {DOMAINS.map(d => <option key={d.slug} value={d.slug}>{d.label}</option>)}
                </select>
              </div>

              {/* Adjacent topics — only suggested ones, not the full list */}
              {adjacentSuggested && (
                <div className="field">
                  <label className="label">Adjacent Topics</label>
                  {newTopicAdjacent.length === 0 ? (
                    <div style={{ fontSize: "0.875rem", color: "#9CA3AF", padding: "4px 0" }}>
                      Claude suggested no adjacent topics for this topic.
                    </div>
                  ) : (
                    <>
                      <div style={{ fontSize: "0.875rem", color: "#6B7280", marginBottom: 6 }}>
                        Claude suggested {newTopicAdjacent.length} adjacent topic{newTopicAdjacent.length !== 1 ? "s" : ""}. Uncheck any that don't apply.
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {allTopicsManaged.filter(t => newTopicAdjacent.includes(t.topic_id)).map(t => (
                          <label key={t.topic_id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.9375rem", cursor: "pointer", padding: "3px 0" }}>
                            <input type="checkbox" checked={newTopicAdjacent.includes(t.topic_id)}
                              onChange={e => setNewTopicAdjacent(ids => e.target.checked ? [...ids, t.topic_id] : ids.filter(id => id !== t.topic_id))} />
                            <span style={{ fontWeight: 700 }}>{t.topic_display_name}</span>
                            <span style={{ fontSize: "0.8125rem", color: "#9CA3AF" }}>{t.domain}</span>
                          </label>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              <button className="btn btn-primary" onClick={addTopic}>Add Topic</button>
            </div>
          )}

          {/* Filter and search */}
          {!topicsLoading && allTopicsManaged.length > 0 && (
            <TopicList
              topics={allTopicsManaged}
              allTopics={allTopicsManaged}
              editingTopic={editingTopic}
              editTopicData={editTopicData}
              editTopicAdjacent={editTopicAdjacent}
              editSuggestingAdjacent={editSuggestingAdjacent}
              onStartEdit={(t) => {
                setEditingTopic(t.topic_id);
                setEditTopicData({ topic_display_name: t.topic_display_name, topic_name: t.topic_name, topic_description: t.topic_description, domain: t.domain });
                setEditTopicAdjacent(t.adjacent_topic_ids || []);
              }}
              onCancelEdit={() => { setEditingTopic(null); setEditTopicData({}); setEditTopicAdjacent([]); }}
              onSaveEdit={saveTopicEdit}
              onToggleActive={toggleTopicActive}
              onEditDataChange={(field, val) => setEditTopicData(d => ({ ...d, [field]: val }))}
              onEditAdjacentChange={setEditTopicAdjacent}
              onSuggestEditAdjacent={(t) => suggestAdjacentTopics(
                editTopicData.topic_display_name || t.topic_display_name,
                editTopicData.topic_description || t.topic_description,
                editTopicData.domain || t.domain,
                allTopicsManaged.filter(x => x.topic_id !== t.topic_id),
                (ids) => setEditTopicAdjacent(ids),
                setEditSuggestingAdjacent
              )}
              onSelectTopic={setSelectedTopic}
              allSources={allSources}
              config={config}
            />
          )}

          {topicsLoading && (
            <div className="loading-state"><div className="spinner"></div><div className="loading-msg">Loading topics…</div></div>
          )}
        </div>
      )}

      {/* Topic detail slide-up panel */}
      {selectedTopic && (
        <TopicDetailPanel
          selectedTopic={selectedTopic}
          setSelectedTopic={setSelectedTopic}
          config={config}
          allScholars={allScholars}
          allTopics={allTopics}
        />
      )}
    </>
  );
}
