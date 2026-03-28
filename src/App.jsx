import { useState } from "react";
import "./styles.js";
import { useIngestion } from "./hooks/useIngestion.js";
import { useScholars } from "./hooks/useScholars.js";
import { useTopics } from "./hooks/useTopics.js";
import { useSources } from "./hooks/useSources.js";
import LibraryTab from "./components/tabs/LibraryTab.jsx";
import ScholarsTab from "./components/tabs/ScholarsTab.jsx";
import TopicsTab from "./components/tabs/TopicsTab.jsx";
import SourcesTab from "./components/tabs/SourcesTab.jsx";
import StagesSetupPreview from "./components/stages/StagesSetupPreview.jsx";
import StagesReviewApprove from "./components/stages/StagesReviewApprove.jsx";
import ScholarList from "./components/ScholarList.jsx";
import TopicList from "./components/TopicList.jsx";
import { DOMAINS, TIER_COLOURS, TIER_OPTIONS, CONTESTED_AREA_OPTIONS, guessEraFromName, guessStrandFromName } from "./constants.js";
import { slugify } from "./lib/utils.js";

const STAGE_LABELS = ["Setup", "Preview", "Review", "Approve"];

const SUPABASE_URL_DEFAULT = "https://xqwzyfmvnuaeqohbqpda.supabase.co";

export default function IngestionTool() {
  const [config, setConfig] = useState(() => ({
    anthropicKey: localStorage.getItem("ig_anthropic") || "",
    supabaseKey: localStorage.getItem("ig_supabase") || "",
    supabaseUrl: localStorage.getItem("ig_url") || SUPABASE_URL_DEFAULT,
  }));
  const [configOpen, setConfigOpen] = useState(false);
  const [showAnthropicKey, setShowAnthropicKey] = useState(false);
  const [showSupabaseKey, setShowSupabaseKey] = useState(false);
  const [activeTab, setActiveTab] = useState("library");
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelTab, setPanelTab] = useState("scholars");

  const configValid = config.anthropicKey && config.supabaseKey && config.supabaseUrl;
  const configMissing = !configValid;

  function updateConfig(key, val) {
    const next = { ...config, [key]: val };
    setConfig(next);
    localStorage.setItem("ig_anthropic", next.anthropicKey);
    localStorage.setItem("ig_supabase", next.supabaseKey);
    localStorage.setItem("ig_url", next.supabaseUrl);
  }

  // Reference data shared between hooks
  const [scholars, setScholars] = useState([]);
  const [allTopics, setAllTopics] = useState([]);

  const ingestion = useIngestion(config, scholars, allTopics, setScholars, setAllTopics);
  const scholarsHook = useScholars(config);
  const topicsHook = useTopics(config);
  const sourcesHook = useSources(config, scholarsHook.allScholars);

  const { stage, error, setError } = ingestion;

  // All props passed down to tab/stage components
  const allProps = {
    config, configValid,
    activeTab, setActiveTab,
    panelOpen, setPanelOpen,
    panelTab, setPanelTab,
    scholars, allTopics,
    ...ingestion,
    ...scholarsHook,
    ...topicsHook,
    ...sourcesHook,
  };

  // Destructure hook values needed directly in App.jsx JSX
  const {
    loadAllScholars, allScholars, scholarsLoading, scholarsError, setScholarsError,
    addScholarOpen, setAddScholarOpen, addScholarPrefill, setAddScholarPrefill,
    newScholar, setNewScholar, editingScholar, setEditingScholar,
    editScholarData, setEditScholarData, setSelectedScholar, enrichSingleScholar,
    enrichingScholarId, singleEnrichResult, setSingleEnrichResult, applySingleEnrichment,
    saveScholarEdit, toggleScholarActive, addScholar,
  } = scholarsHook;

  const {
    loadAllTopicsManaged, allTopicsManaged, setAllTopicsManaged, topicsLoading, topicsError, setTopicsError,
    addTopicOpen, setAddTopicOpen, addTopicPrefill, setAddTopicPrefill,
    newTopic, setNewTopic, newTopicAdjacent, setNewTopicAdjacent,
    suggestingAdjacent, setSuggestingAdjacent, suggestingDescription, setSuggestingDescription,
    adjacentSuggested, setAdjacentSuggested, editingTopic, setEditingTopic,
    editTopicData, setEditTopicData, editTopicAdjacent, setEditTopicAdjacent,
    editSuggestingAdjacent, setEditSuggestingAdjacent,
    saveTopicEdit, toggleTopicActive, suggestAdjacentTopics, suggestTopicDescriptionAndDomain, suggestTopicAll, addTopic,
    loadReferenceTopics,
  } = topicsHook;

  const { setScholarOrTopicAddedSincePreview } = ingestion;
  const { loadAllSources } = sourcesHook;

  return (
    <div className="app-shell">
      <div className="tool-root">
        {/* Config Panel */}
        <div className="config-panel">
          <div className="config-header" onClick={() => setConfigOpen(o => !o)}>
            <div className="config-header-left">
              <span className={"config-dot " + (configMissing ? "missing" : "")}></span>
              Configuration
            </div>
            <span style={{ fontSize: "0.875rem", color: "#9CA3AF" }}>{configOpen ? "▲ Hide" : "▼ Show"}</span>
          </div>
          {configOpen && (
            <div className="config-body">
            <input type="text" style={{ display: "none" }} autoComplete="username" readOnly />
            <input type="password" style={{ display: "none" }} autoComplete="current-password" readOnly />
            <div className="config-field">
              <div className="config-label">Anthropic API Key</div>
              <div className="config-input-wrap">
                <input
                  className="config-input"
                  type={showAnthropicKey ? "text" : "password"}
                  placeholder="sk-ant-..."
                  value={config.anthropicKey}
                  onChange={e => updateConfig("anthropicKey", e.target.value)}
                  autoComplete="new-password"
                  data-lpignore="true"
                  data-form-type="other"
                />
                <button className="config-eye" onClick={() => setShowAnthropicKey(v => !v)}>
                  {showAnthropicKey ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            <div className="config-field">
              <div className="config-label">Supabase Key</div>
              <div className="config-input-wrap">
                <input
                  className="config-input"
                  type={showSupabaseKey ? "text" : "password"}
                  placeholder="eyJ..."
                  value={config.supabaseKey}
                  onChange={e => updateConfig("supabaseKey", e.target.value)}
                  autoComplete="new-password"
                  data-lpignore="true"
                  data-form-type="other"
                />
                <button className="config-eye" onClick={() => setShowSupabaseKey(v => !v)}>
                  {showSupabaseKey ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            <div className="config-field">
              <div className="config-label">Supabase Project URL</div>
              <input
                className="config-input"
                type="text"
                value={config.supabaseUrl}
                onChange={e => updateConfig("supabaseUrl", e.target.value)}
                autoComplete="off"
                data-form-type="other"
              />
            </div>
          </div>
          )}
        </div>

        {/* Top nav — only on home screens (stage === -1) */}
        {stage === -1 && (
          <div className="top-nav">
            <button className={"top-nav-tab " + (activeTab === "library" ? "active" : "")} onClick={() => setActiveTab("library")}>
              Library
            </button>
            <button className={"top-nav-tab " + (activeTab === "scholars" ? "active" : "")} onClick={() => { setActiveTab("scholars"); loadAllScholars(); }}>
              Scholars
            </button>
            <button className={"top-nav-tab " + (activeTab === "topics" ? "active" : "")} onClick={() => { setActiveTab("topics"); loadAllTopicsManaged(); }}>
              Topics
            </button>
            <button className={"top-nav-tab " + (activeTab === "sources" ? "active" : "")} onClick={() => { setActiveTab("sources"); loadAllSources(); if (allScholars.length === 0) loadAllScholars(); loadReferenceTopics(); }}>
              Sources
            </button>
          </div>
        )}

        {/* Progress bar (only during workflow) */}
        {stage >= 0 && (
          <div className="progress-bar">
            <div className="progress-steps">
              {STAGE_LABELS.map((label, i) => (
                <div key={i} className="progress-step">
                  <div className={"progress-step-dot " + (i < stage ? "done" : i === stage ? "active" : "future")}>
                    {i < stage ? "✓" : i + 1}
                  </div>
                  <span className={"progress-step-label " + (i === stage ? "active" : "")}>{label}</span>
                  {i < STAGE_LABELS.length - 1 && <div className={"progress-line " + (i < stage ? "done" : "")}></div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div style={{ padding: "0 16px", maxWidth: 680, margin: "12px auto 0" }}>
            <div className="alert alert-error">
              ⚠️ {error}
              <button onClick={() => setError("")} style={{ float: "right", background: "none", border: "none", cursor: "pointer", color: "#991B1B", fontWeight: 700 }}>×</button>
            </div>
          </div>
        )}

        {/* Tab content */}
        {stage === -1 && activeTab === "scholars" && <ScholarsTab {...allProps} />}
        {stage === -1 && activeTab === "topics" && <TopicsTab {...allProps} />}
        {stage === -1 && activeTab === "sources" && <SourcesTab {...allProps} />}
        {stage === -1 && activeTab === "library" && <LibraryTab {...allProps} />}

        {/* Ingestion workflow stages 0-2 */}
        {stage >= 0 && stage <= 2 && <StagesSetupPreview {...allProps} />}

        {/* Ingestion workflow stages 3-5 */}
        {stage >= 3 && stage <= 5 && <StagesReviewApprove {...allProps} />}

        {/* Floating action button — visible during workflow stages */}
        {stage >= 0 && (
          <button className="panel-fab" onClick={async () => {
            setPanelOpen(true);
            if (allScholars.length === 0) loadAllScholars();
            // Always load fresh topics when opening the panel
            // so newly added topics are visible immediately
            await loadAllTopicsManaged();
          }}>
            ✦ Scholars & Topics
          </button>
        )}

        {/* Slide-up panel */}
        {panelOpen && (
          <>
            <div className="panel-overlay" onClick={async () => { setPanelOpen(false); await loadAllScholars(); await loadAllTopicsManaged(); }} />
            <div className="panel-sheet">
              <div className="panel-header">
                <span className="panel-title">Manage</span>
                <button className="panel-close" onClick={async () => { setPanelOpen(false); await loadAllScholars(); await loadAllTopicsManaged(); }}>×</button>
              </div>
              <div className="panel-tabs">
                <button className={"panel-tab " + (panelTab === "scholars" ? "active" : "")} onClick={() => setPanelTab("scholars")}>Scholars</button>
                <button className={"panel-tab " + (panelTab === "topics" ? "active" : "")} onClick={() => { setPanelTab("topics"); loadAllTopicsManaged(); }}>Topics</button>
              </div>
              <div className="panel-body">
                {panelTab === "scholars" && (
                  <>
                    {scholarsError && <div className="alert alert-error mb-8">{scholarsError}<button onClick={() => setScholarsError("")} style={{ float: "right", background: "none", border: "none", cursor: "pointer", color: "#991B1B", fontWeight: 700 }}>×</button></div>}
                    <button className="btn btn-primary btn-full mb-16" onClick={() => { setAddScholarOpen(v => !v); if (!addScholarOpen) setNewScholar({ scholar_name: "", strand: "other", era: "contemporary", scholar_tier: "", credentials: "", scholar_description: "", key_works: "", contested_areas: [], contested_note: "" }); }}>
                      {addScholarOpen ? "Cancel" : "+ Add Scholar"}
                    </button>
                    {addScholarOpen && (
                      <div className="card" style={{ borderColor: "#3B82F6" }}>
                        {addScholarPrefill && <div className="alert alert-info mb-8">Pre-filled: "{addScholarPrefill}"</div>}
                        <div className="field">
                          <label className="label">Name *</label>
                          <input className="input" type="text" value={newScholar.scholar_name} onChange={e => {
                            const name = e.target.value;
                            setNewScholar(s => ({
                              ...s,
                              scholar_name: name,
                              era: guessEraFromName(name),
                              strand: s.strand === "other" ? guessStrandFromName(name) : s.strand,
                            }));
                          }} />
                        </div>
                        <div className="field">
                          <label className="label">Strand *</label>
                          <select className="input" value={newScholar.strand} onChange={e => setNewScholar(s => ({ ...s, strand: e.target.value }))}>
                            {"critical evangelical catholic feminist social-prophet patristic jewish orthodox liberation other".split(" ").map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                        <div className="field">
                          <label className="label">Era *</label>
                          <select className="input" value={newScholar.era} onChange={e => setNewScholar(s => ({ ...s, era: e.target.value }))}>
                            <option value="historical">Historical</option>
                            <option value="contemporary">Contemporary</option>
                          </select>
                        </div>
                        <button className="btn btn-primary" onClick={async () => { await addScholar(); setScholarOrTopicAddedSincePreview(true); }}>Add Scholar</button>
                      </div>
                    )}
                    {scholarsLoading
                      ? <div className="loading-state"><div className="spinner"></div><div className="loading-msg">Loading…</div></div>
                      : <ScholarList scholars={allScholars} editingScholar={editingScholar} editScholarData={editScholarData}
                          onStartEdit={sc => { setEditingScholar(sc.scholar_id); setEditScholarData({ scholar_name: sc.scholar_name, strand: sc.strand, era: sc.era, scholar_tier: sc.scholar_tier || "", credentials: sc.credentials || "", scholar_description: sc.scholar_description || "", key_works: sc.key_works ? sc.key_works.join(", ") : "", contested_areas: sc.contested_areas || [], contested_note: sc.contested_note || "" }); }}
                          onCancelEdit={() => { setEditingScholar(null); setEditScholarData({}); }}
                          onSaveEdit={(id, data) => saveScholarEdit(id, data)}
                          onToggleActive={toggleScholarActive}
                          onEditDataChange={(field, val) => setEditScholarData(d => ({ ...d, [field]: val }))}
                          onSelectScholar={setSelectedScholar}
                          onEnrichSingle={enrichSingleScholar}
                          enrichingScholarId={enrichingScholarId}
                          singleEnrichResult={singleEnrichResult}
                          onApplyEnrich={applySingleEnrichment}
                          onDismissEnrich={() => setSingleEnrichResult(null)}
                          tierColours={TIER_COLOURS}
                          tierOptions={TIER_OPTIONS}
                          contestedAreaOptions={CONTESTED_AREA_OPTIONS} />
                    }
                  </>
                )}
                {panelTab === "topics" && (
                  <>
                    {topicsError && <div className="alert alert-error mb-8">{topicsError}<button onClick={() => setTopicsError("")} style={{ float: "right", background: "none", border: "none", cursor: "pointer", color: "#991B1B", fontWeight: 700 }}>×</button></div>}
                    <button className="btn btn-primary btn-full mb-16" onClick={() => {
                      setAddTopicOpen(v => !v);
                      if (!addTopicOpen) { setNewTopic({ topic_display_name: "", topic_name: "", topic_description: "", domain: "galilean-ministry" }); setNewTopicAdjacent([]); setAdjacentSuggested(false); setAddTopicPrefill(null); }
                    }}>
                      {addTopicOpen ? "Cancel" : "+ Add Topic"}
                    </button>
                    {addTopicOpen && (
                      <div className="card" style={{ borderColor: "#3B82F6" }}>
                        {addTopicPrefill && <div className="alert alert-info mb-8">Pre-filled: "{addTopicPrefill}"</div>}
                        <div className="field">
                          <label className="label">Display Name *</label>
                          <input className="input" type="text" value={newTopic.topic_display_name}
                            onChange={e => { const d = e.target.value; setNewTopic(t => ({ ...t, topic_display_name: d, topic_name: slugify(d) })); setAdjacentSuggested(false); }} />
                        </div>
                        <div className="field">
                          <label className="label">Slug *</label>
                          <input className="input" type="text" value={newTopic.topic_name} onChange={e => setNewTopic(t => ({ ...t, topic_name: slugify(e.target.value) }))} />
                        </div>
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
                          <label className="label">Description * <span style={{ fontWeight: 300, textTransform: "none", letterSpacing: 0 }}>(or use ✦ suggestions above)</span></label>
                          <textarea className="input textarea" style={{ minHeight: 60 }} value={newTopic.topic_description}
                            onChange={e => setNewTopic(t => ({ ...t, topic_description: e.target.value }))} />
                        </div>
                        <div className="field">
                          <label className="label">Domain *</label>
                          <select className="input" value={newTopic.domain} onChange={e => setNewTopic(t => ({ ...t, domain: e.target.value }))}>
                            {DOMAINS.map(d => <option key={d.slug} value={d.slug}>{d.label}</option>)}
                          </select>
                        </div>
                        {adjacentSuggested && (
                          <div className="field">
                            <label className="label">Adjacent Topics</label>
                            {newTopicAdjacent.length === 0 ? (
                              <div style={{ fontSize: "0.875rem", color: "#9CA3AF" }}>No adjacent topics suggested.</div>
                            ) : (
                              <>
                                <div style={{ fontSize: "0.8125rem", color: "#6B7280", marginBottom: 5 }}>
                                  Uncheck any that don't apply.
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 160, overflowY: "auto" }}>
                                  {allTopicsManaged.filter(t => newTopicAdjacent.includes(t.topic_id)).map(t => (
                                    <label key={t.topic_id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.9375rem", cursor: "pointer" }}>
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
                        <button className="btn btn-primary" onClick={async () => { await addTopic(); setScholarOrTopicAddedSincePreview(true); }}>Add Topic</button>
                      </div>
                    )}
                    {topicsLoading
                      ? <div className="loading-state"><div className="spinner"></div><div className="loading-msg">Loading…</div></div>
                      : <TopicList topics={allTopicsManaged} allTopics={allTopicsManaged} editingTopic={editingTopic} editTopicData={editTopicData}
                          editTopicAdjacent={editTopicAdjacent} editSuggestingAdjacent={editSuggestingAdjacent}
                          onStartEdit={t => { setEditingTopic(t.topic_id); setEditTopicData({ topic_display_name: t.topic_display_name, topic_name: t.topic_name, topic_description: t.topic_description, domain: t.domain }); setEditTopicAdjacent(t.adjacent_topic_ids || []); }}
                          onCancelEdit={() => { setEditingTopic(null); setEditTopicData({}); setEditTopicAdjacent([]); }}
                          onSaveEdit={saveTopicEdit} onToggleActive={toggleTopicActive}
                          onEditDataChange={(field, val) => setEditTopicData(d => ({ ...d, [field]: val }))}
                          onEditAdjacentChange={setEditTopicAdjacent}
                          onSuggestEditAdjacent={t => suggestAdjacentTopics(editTopicData.topic_display_name || t.topic_display_name, editTopicData.topic_description || t.topic_description, editTopicData.domain || t.domain, allTopicsManaged.filter(x => x.topic_id !== t.topic_id), ids => setEditTopicAdjacent(ids), setEditSuggestingAdjacent)}
                          config={config} />
                    }
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
