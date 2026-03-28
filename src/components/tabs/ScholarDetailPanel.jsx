import { TIER_COLOURS, TIER_OPTIONS, CONTESTED_AREA_OPTIONS, STRAND_COLOURS } from "../../constants.js";
import ScholarList from "../ScholarList.jsx";
import { SourceRowsPanel } from "../SourceRowsPanel.jsx";


export default function ScholarDetailPanel(props) {
  const {
    selectedScholar, setSelectedScholar, panelOpen, setPanelOpen,
    panelTab, setPanelTab, loadAllScholars, loadAllTopicsManaged,
    setScholarOrTopicAddedSincePreview, allScholars, scholarsLoading,
    editingScholar, setEditingScholar, editScholarData, setEditScholarData,
    saveScholarEdit, toggleScholarActive, enrichSingleScholar,
    singleEnrichResult, setSingleEnrichResult, applySingleEnrichment,
    addTopicOpen, setAddTopicOpen, addTopicPrefill, setAddTopicPrefill,
    enrichingScholarId, activeScholarTool,
    config, allTopics, allSources,
  } = props;
  return (
    <>
          {/* Scholar detail slide-up panel */}
          {selectedScholar && (
            <>
              <div className="panel-overlay" onClick={() => setSelectedScholar(null)} />
              <div className="panel-sheet">
                <div className="panel-header">
                  <span className="panel-title">{selectedScholar.scholar_name}</span>
                  <button className="panel-close" onClick={() => setSelectedScholar(null)}>×</button>
                </div>
                <div className="panel-body">
                  {/* Badges row */}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
                    {(() => {
                      const cols = STRAND_COLOURS[selectedScholar.strand] || STRAND_COLOURS.other;
                      return <span className="strand-badge" style={{ background: cols.bg, color: cols.text }}>{selectedScholar.strand}</span>;
                    })()}
                    {selectedScholar.scholar_tier && TIER_COLOURS[selectedScholar.scholar_tier] && (
                      <span className="strand-badge" style={{ background: TIER_COLOURS[selectedScholar.scholar_tier].bg, color: TIER_COLOURS[selectedScholar.scholar_tier].text }}>
                        {selectedScholar.scholar_tier}
                      </span>
                    )}
                    <span style={{ fontSize: "0.8125rem", background: "#F3F4F6", color: "#6B7280", padding: "2px 8px", borderRadius: 10 }}>{selectedScholar.era}</span>
                    {!selectedScholar.scholar_tier && (
                      <span style={{ fontSize: "0.8125rem", background: "#FEF3C7", color: "#92400E", padding: "2px 8px", borderRadius: 10 }}>not yet enriched</span>
                    )}
                  </div>

                  {/* Details */}
                  {selectedScholar.credentials && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: "0.8125rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6B7280", marginBottom: 4 }}>Credentials</div>
                      <div style={{ fontSize: "1rem", color: "#374151" }}>{selectedScholar.credentials}</div>
                    </div>
                  )}

                  {selectedScholar.scholar_description && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: "0.8125rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6B7280", marginBottom: 4 }}>About</div>
                      <div style={{ fontSize: "1rem", color: "#374151", lineHeight: 1.6 }}>{selectedScholar.scholar_description}</div>
                    </div>
                  )}

                  {selectedScholar.key_works && selectedScholar.key_works.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: "0.8125rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6B7280", marginBottom: 6 }}>Key Works</div>
                      {selectedScholar.key_works.map((work, i) => (
                        <div key={i} style={{ fontSize: "0.9375rem", color: "#374151", padding: "4px 0", borderBottom: "1px solid #F3F4F6", fontStyle: "italic" }}>{work}</div>
                      ))}
                    </div>
                  )}

                  {selectedScholar.contested_areas && selectedScholar.contested_areas.length > 0 && (
                    <div style={{ marginBottom: 12, background: "#FFFBEB", border: "1px solid #FCD34D", borderRadius: 8, padding: 12 }}>
                      <div style={{ fontSize: "0.8125rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#92400E", marginBottom: 6 }}>Contested Areas</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: selectedScholar.contested_note ? 8 : 0 }}>
                        {selectedScholar.contested_areas.map((area, i) => (
                          <span key={i} style={{ fontSize: "0.875rem", background: "#FEF3C7", color: "#92400E", padding: "2px 8px", borderRadius: 10, fontWeight: 700 }}>{area}</span>
                        ))}
                      </div>
                      {selectedScholar.contested_note && (
                        <div style={{ fontSize: "0.9375rem", color: "#92400E", lineHeight: 1.5 }}>{selectedScholar.contested_note}</div>
                      )}
                    </div>
                  )}

                  {selectedScholar.last_used_date && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: "0.8125rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6B7280", marginBottom: 4 }}>Last Used</div>
                      <div style={{ fontSize: "0.9375rem", color: "#374151" }}>{selectedScholar.last_used_date.slice(0, 10)}</div>
                    </div>
                  )}

                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: "0.8125rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6B7280", marginBottom: 4 }}>Scholar ID</div>
                    <div style={{ fontSize: "0.9375rem", color: "#6B7280" }}>{selectedScholar.scholar_id}</div>
                  </div>

                  <div className="action-row" style={{ marginTop: 16 }}>
                    <button className="btn btn-secondary btn-full" onClick={() => {
                      setEditingScholar(selectedScholar.scholar_id);
                      setEditScholarData({ scholar_name: selectedScholar.scholar_name, strand: selectedScholar.strand, era: selectedScholar.era, scholar_tier: selectedScholar.scholar_tier || "", credentials: selectedScholar.credentials || "", scholar_description: selectedScholar.scholar_description || "", key_works: selectedScholar.key_works ? selectedScholar.key_works.join(", ") : "", contested_areas: selectedScholar.contested_areas || [], contested_note: selectedScholar.contested_note || "" });
                      setSelectedScholar(null);
                    }}>Edit this Scholar</button>
                  </div>

                  {/* Source rows section */}
                  {config?.anthropicKey && config?.supabaseKey && (
                    <SourceRowsPanel
                      key={"scholar-" + selectedScholar.scholar_id}
                      queryFilter={"scholar_id=eq." + selectedScholar.scholar_id}
                      labelField={null}
                      config={config}
                      allScholars={allScholars}
                      allTopics={allTopics}
                    />
                  )}
                </div>
              </div>
            </>
          )}

          {scholarsLoading && (
            <div className="loading-state"><div className="spinner"></div><div className="loading-msg">Loading scholars...</div></div>
          )}

          {!scholarsLoading && allScholars.length > 0 && activeScholarTool === null && (
            <ScholarList
              scholars={allScholars}
              editingScholar={editingScholar}
              editScholarData={editScholarData}
              onStartEdit={(sc) => { setEditingScholar(sc.scholar_id); setEditScholarData({ scholar_name: sc.scholar_name, strand: sc.strand, era: sc.era, scholar_tier: sc.scholar_tier || "", credentials: sc.credentials || "", scholar_description: sc.scholar_description || "", key_works: sc.key_works ? sc.key_works.join(", ") : "", contested_areas: sc.contested_areas || [], contested_note: sc.contested_note || "" }); }}
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
              contestedAreaOptions={CONTESTED_AREA_OPTIONS}
              allSources={allSources}
            />
          )}

    </>
  );
}
