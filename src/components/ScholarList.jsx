import { useState } from "react";
import { STRAND_COLOURS, TIER_COLOURS, TIER_OPTIONS, CONTESTED_AREA_OPTIONS } from "../constants.js";

export default function ScholarList({ scholars, editingScholar, editScholarData, onStartEdit, onCancelEdit, onSaveEdit, onToggleActive, onEditDataChange, onSelectScholar, onEnrichSingle, enrichingScholarId = null, singleEnrichResult = null, onApplyEnrich = null, onDismissEnrich = null, tierColours = {}, tierOptions = [], contestedAreaOptions = [], allSources = [] }) {
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState("active");
  const [filterSources, setFilterSources] = useState("all"); // "all" | "has-sources" | "empty"
  const [saveError, setSaveError] = useState(null);
  // Per-scholar enrichment context — keyed by scholar_id so each scholar has its own textarea.
  const [enrichContexts, setEnrichContexts] = useState({});

  // Build a set of scholar_ids that have at least one active source row.
  const scholarsWithSources = new Set(
    allSources.map(s => s.scholar_id).filter(Boolean)
  );

  const filtered = scholars.filter(sc => {
    const matchSearch = sc.scholar_name.toLowerCase().includes(search.toLowerCase()) ||
      (sc.credentials || "").toLowerCase().includes(search.toLowerCase());
    const matchActive = filterActive === "all" ? true : filterActive === "active" ? sc.is_active : !sc.is_active;
    const matchSources = filterSources === "all" ? true
      : filterSources === "has-sources" ? scholarsWithSources.has(sc.scholar_id)
      : !scholarsWithSources.has(sc.scholar_id);
    return matchSearch && matchActive && matchSources;
  });

  return (
    <div>
      <input className="scholar-search" type="text" placeholder="Search scholars..."
        value={search} onChange={e => setSearch(e.target.value)} />
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {["active", "inactive", "all"].map(f => (
          <button key={f} className={"btn btn-sm " + (filterActive === f ? "btn-primary" : "btn-secondary")}
            onClick={() => setFilterActive(f)} style={{ textTransform: "capitalize" }}>{f}</button>
        ))}
        <button className={"btn btn-sm " + (filterSources === "has-sources" ? "btn-primary" : "btn-secondary")}
          onClick={() => setFilterSources(v => v === "has-sources" ? "all" : "has-sources")}
          title={"Scholars with at least one source row (" + scholarsWithSources.size + ")"}>
          Has sources ({scholarsWithSources.size})
        </button>
        <button className={"btn btn-sm " + (filterSources === "empty" ? "btn-primary" : "btn-secondary")}
          onClick={() => setFilterSources(v => v === "empty" ? "all" : "empty")}
          title="Scholars with no source rows">
          Empty ({scholars.filter(sc => !scholarsWithSources.has(sc.scholar_id)).length})
        </button>
        <span style={{ marginLeft: "auto", fontSize: "0.875rem", color: "#6B7280", alignSelf: "center" }}>
          {filtered.length} of {scholars.length}
        </span>
      </div>

      {filtered.map(sc => {
        const cols = STRAND_COLOURS[sc.strand] || STRAND_COLOURS.other;
        const tierCols = sc.scholar_tier && tierColours[sc.scholar_tier] ? tierColours[sc.scholar_tier] : null;
        const isEditing = editingScholar === sc.scholar_id;
        return (
          <div key={sc.scholar_id} style={{ borderBottom: "1px solid #F3F4F6", padding: "10px 0", opacity: sc.is_active ? 1 : 0.45 }}>
            {isEditing ? (
              <div>
                <div className="edit-row" style={{ marginBottom: 6 }}>
                  <input className="edit-input" style={{ flex: 1, minWidth: 160 }}
                    value={editScholarData.scholar_name || ""}
                    onChange={e => onEditDataChange("scholar_name", e.target.value)}
                    placeholder="Name" />
                  <select className="edit-select" value={editScholarData.strand || "other"}
                    onChange={e => onEditDataChange("strand", e.target.value)}>
                    {"critical evangelical catholic feminist social-prophet patristic jewish orthodox liberation other".split(" ").map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select className="edit-select" value={editScholarData.era || "contemporary"}
                    onChange={e => onEditDataChange("era", e.target.value)}>
                    <option value="historical">Historical</option>
                    <option value="contemporary">Contemporary</option>
                  </select>
                  <select className="edit-select" value={editScholarData.scholar_tier || ""}
                    onChange={e => onEditDataChange("scholar_tier", e.target.value)}>
                    <option value="">No tier</option>
                    {tierOptions.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="field" style={{ marginBottom: 6 }}>
                  <input className="edit-input" style={{ width: "100%" }}
                    value={editScholarData.credentials || ""}
                    onChange={e => onEditDataChange("credentials", e.target.value)}
                    placeholder="Credentials / institutional affiliation" />
                </div>
                <div className="field" style={{ marginBottom: 6 }}>
                  <textarea className="edit-input" style={{ width: "100%", minHeight: 60, resize: "vertical" }}
                    value={editScholarData.scholar_description || ""}
                    onChange={e => onEditDataChange("scholar_description", e.target.value)}
                    placeholder="Description" />
                </div>
                <div className="field" style={{ marginBottom: 6 }}>
                  <input className="edit-input" style={{ width: "100%" }}
                    value={editScholarData.key_works || ""}
                    onChange={e => onEditDataChange("key_works", e.target.value)}
                    placeholder="Key works (comma-separated)" />
                </div>
                <div className="field" style={{ marginBottom: 6 }}>
                  <div style={{ fontSize: "0.8125rem", color: "#6B7280", marginBottom: 4 }}>Contested areas:</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {contestedAreaOptions.map(opt => (
                      <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.875rem", cursor: "pointer" }}>
                        <input type="checkbox"
                          checked={(editScholarData.contested_areas || []).includes(opt.value)}
                          onChange={e => onEditDataChange("contested_areas", e.target.checked
                            ? [...(editScholarData.contested_areas || []), opt.value]
                            : (editScholarData.contested_areas || []).filter(x => x !== opt.value)
                          )} />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                  {(editScholarData.contested_areas || []).length > 0 && (
                    <input className="edit-input" style={{ width: "100%", marginTop: 6 }}
                      value={editScholarData.contested_note || ""}
                      onChange={e => onEditDataChange("contested_note", e.target.value)}
                      placeholder="One sentence explaining the dispute" />
                  )}
                </div>
                {saveError && (
                  <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6, padding: "8px 10px", marginBottom: 8, fontSize: "0.875rem", color: "#991B1B" }}>
                    ⚠️ {saveError}
                  </div>
                )}
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="btn btn-success btn-sm" onClick={async () => {
                    setSaveError(null);
                    try { await onSaveEdit(sc.scholar_id, editScholarData); }
                    catch (e) { setSaveError(e.message.replace("saveScholarEdit failed: ", "")); }
                  }}>Save</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => { setSaveError(null); onCancelEdit(); }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                {/* Tappable info area */}
                <div style={{ flex: 1, cursor: "pointer", minWidth: 0 }}
                  onClick={() => onSelectScholar && onSelectScholar(sc)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 2 }}>
                    <span style={{ fontSize: "1rem", fontWeight: 700, color: "#111" }}>{sc.scholar_name}</span>
                    <span className="strand-badge" style={{ background: cols.bg, color: cols.text }}>{sc.strand}</span>
                    {tierCols
                      ? <span className="strand-badge" style={{ background: tierCols.bg, color: tierCols.text }}>{sc.scholar_tier}</span>
                      : <span style={{ fontSize: "0.75rem", color: "#9CA3AF", background: "#F9FAFB", padding: "1px 6px", borderRadius: 8, border: "1px solid #E5E7EB" }}>not enriched</span>
                    }
                    {scholarsWithSources.has(sc.scholar_id) ? (
                      <span style={{ fontSize: "0.75rem", background: "#DCFCE7", color: "#166534", padding: "1px 6px", borderRadius: 8, fontWeight: 700 }}>has sources</span>
                    ) : (
                      <span style={{ fontSize: "0.75rem", background: "#FEF3C7", color: "#92400E", padding: "1px 6px", borderRadius: 8 }}>empty</span>
                    )}
                  </div>
                  {sc.credentials && (
                    <div style={{ fontSize: "0.875rem", color: "#6B7280", marginTop: 1 }}>{sc.credentials}</div>
                  )}
                  {sc.scholar_description && (
                    <div style={{ fontSize: "0.875rem", color: "#9CA3AF", marginTop: 2, lineHeight: 1.4,
                      overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                      {sc.scholar_description}
                    </div>
                  )}
                  {sc.contested_areas && sc.contested_areas.length > 0 && (
                    <div style={{ fontSize: "0.8125rem", color: "#92400E", marginTop: 3 }}>
                      Contested: {sc.contested_areas.join(", ")}
                    </div>
                  )}
                  <div style={{ fontSize: "0.8125rem", color: "#D1D5DB", marginTop: 2 }}>Tap for full details</div>
                </div>
                {/* Action buttons */}
                <div style={{ display: "flex", flexDirection: "column", gap: 5, flexShrink: 0 }}>
                  <button className="btn btn-secondary btn-sm"
                    onClick={e => { e.stopPropagation(); setSaveError(null); onStartEdit(sc); }}>
                    Edit
                  </button>
                  {onEnrichSingle && (
                    <button className="btn btn-secondary btn-sm" style={{ color: "#1D4ED8" }}
                      onClick={e => {
                        e.stopPropagation();
                        onEnrichSingle(sc, enrichContexts[sc.scholar_id] || null);
                      }}>
                      {sc.scholar_tier ? "Re-enrich" : "Enrich"}
                    </button>
                  )}
                  <button className={"btn btn-sm " + (sc.is_active ? "btn-danger" : "btn-success")}
                    onClick={e => { e.stopPropagation(); onToggleActive(sc); }}>
                    {sc.is_active ? "Off" : "On"}
                  </button>
                </div>
              </div>
            )}

            {/* Context textarea for enrichment — shown for all scholars */}
            {onEnrichSingle && enrichingScholarId !== sc.scholar_id && (!singleEnrichResult || singleEnrichResult.scholar_id !== sc.scholar_id) && (
              <div style={{ marginTop: 8, padding: "8px 10px", background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 8 }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6B7280", marginBottom: 4 }}>
                  Additional context for lookup <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span>
                </div>
                <textarea
                  className="input textarea"
                  style={{ minHeight: 48, fontSize: "0.8125rem", marginBottom: 0 }}
                  placeholder="Paste a bio paragraph, publisher page excerpt, or any info Claude may not know about this scholar. Will be used as authoritative."
                  value={enrichContexts[sc.scholar_id] || ""}
                  onClick={e => e.stopPropagation()}
                  onChange={e => setEnrichContexts(prev => ({ ...prev, [sc.scholar_id]: e.target.value }))}
                />
              </div>
            )}

            {/* Inline enrich result for this specific scholar */}
            {enrichingScholarId === sc.scholar_id && (
              <div style={{ marginTop: 10, background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "12px 14px" }}>
                <div className="spinner" style={{ width: 16, height: 16, display: "inline-block", marginRight: 8, borderWidth: 2, verticalAlign: "middle" }}></div>
                <span style={{ fontSize: "0.9375rem", color: "#1D4ED8" }}>Looking up scholar...</span>
              </div>
            )}
            {singleEnrichResult && singleEnrichResult.scholar_id === sc.scholar_id && !enrichingScholarId && (() => {
              // Inline error from enrichSingleScholar or applySingleEnrichment
              if (singleEnrichResult.error && !singleEnrichResult.suggestion) {
                return (
                  <div style={{ marginTop: 10, background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.875rem", color: "#991B1B" }}>⚠️ {singleEnrichResult.error}</span>
                      <button className="btn btn-secondary btn-sm" onClick={() => onDismissEnrich && onDismissEnrich()}>Dismiss</button>
                    </div>
                  </div>
                );
              }
              const s = singleEnrichResult.suggestion;
              const tierCols = s && TIER_COLOURS[s.scholar_tier] ? TIER_COLOURS[s.scholar_tier] : { bg: "#F3F4F6", text: "#374151" };
              return (
                <div style={{ marginTop: 10, background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "12px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {s.scholar_tier && <span className="strand-badge" style={{ background: tierCols.bg, color: tierCols.text }}>{s.scholar_tier}</span>}
                      {s.strand && <span className="strand-badge" style={{ background: "#F3F4F6", color: "#374151" }}>{s.strand}</span>}
                      <span style={{ fontSize: "0.8125rem", color: s.confidence === "low" ? "#991B1B" : "#166534" }}>confidence: {s.confidence}</span>
                    </div>
                    <button className="btn btn-secondary btn-sm" style={{ flexShrink: 0 }} onClick={() => onDismissEnrich && onDismissEnrich()}>Dismiss</button>
                  </div>
                  <div style={{ fontSize: "0.875rem", color: "#374151", lineHeight: 1.5, marginBottom: 10 }}>
                    {s.credentials && <div><strong>Credentials:</strong> {s.credentials}</div>}
                    {s.scholar_description && <div style={{ marginTop: 3 }}>{s.scholar_description}</div>}
                    {s.key_works && s.key_works.length > 0 && <div style={{ marginTop: 3 }}><strong>Key works:</strong> {s.key_works.join(", ")}</div>}
                    {s.contested_areas && s.contested_areas.length > 0 && <div style={{ marginTop: 3 }}><strong>Contested:</strong> {s.contested_areas.join(", ")}{s.contested_note ? " — " + s.contested_note : ""}</div>}
                    {s.confidence_note && <div style={{ marginTop: 3, color: "#92400E" }}><strong>Note:</strong> {s.confidence_note}</div>}
                  </div>
                  {singleEnrichResult.error && singleEnrichResult.suggestion && (
                    <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6, padding: "6px 10px", marginBottom: 8, fontSize: "0.875rem", color: "#991B1B" }}>
                      ⚠️ {singleEnrichResult.error}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-success btn-sm" onClick={() => onApplyEnrich && onApplyEnrich(sc)}>Apply</button>
                    <button className="btn btn-danger btn-sm" onClick={() => onDismissEnrich && onDismissEnrich()}>Skip</button>
                  </div>
                </div>
              );
            })()}
          </div>
        );
      })}
    </div>
  );
}
