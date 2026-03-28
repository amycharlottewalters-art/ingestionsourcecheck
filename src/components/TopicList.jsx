import { useState } from "react";
import { DOMAINS } from "../constants.js";

export default function TopicList({
  topics, allTopics, editingTopic, editTopicData, editTopicAdjacent,
  editSuggestingAdjacent, onStartEdit, onCancelEdit, onSaveEdit,
  onToggleActive, onEditDataChange, onEditAdjacentChange,
  onSuggestEditAdjacent, onSelectTopic, config,
  // allSources used to compute which topics have rows
  allSources = [],
}) {
  const [search, setSearch] = useState("");
  const [filterDomain, setFilterDomain] = useState("all");
  const [filterActive, setFilterActive] = useState("active");
  const [filterSources, setFilterSources] = useState("all"); // "all" | "has-sources" | "empty"

  // Build a set of topic_ids that have at least one active source row.
  const topicsWithSources = new Set(
    allSources.flatMap(s => s.topic_ids || [])
  );

  const filtered = topics.filter(t => {
    const matchSearch = t.topic_display_name.toLowerCase().includes(search.toLowerCase()) ||
      (t.topic_description || "").toLowerCase().includes(search.toLowerCase());
    const matchDomain = filterDomain === "all" || t.domain === filterDomain;
    const matchActive = filterActive === "all" ? true : filterActive === "active" ? t.is_active : !t.is_active;
    const matchSources = filterSources === "all" ? true
      : filterSources === "has-sources" ? topicsWithSources.has(t.topic_id)
      : !topicsWithSources.has(t.topic_id);
    return matchSearch && matchDomain && matchActive && matchSources;
  });

  const topicName = (id) => {
    const t = allTopics.find(x => x.topic_id === id);
    return t ? t.topic_display_name : "ID " + id;
  };

  return (
    <div>
      <input className="scholar-search" type="text" placeholder="Search topics…"
        value={search} onChange={e => setSearch(e.target.value)} />

      <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
        {/* Domain filter */}
        <select style={{ border: "1.5px solid #E5E7EB", borderRadius: 8, padding: "6px 10px", fontSize: "0.875rem", fontFamily: "Lato, sans-serif", color: "#374151", background: "#fff", minHeight: 36 }}
          value={filterDomain} onChange={e => setFilterDomain(e.target.value)}>
          <option value="all">All domains</option>
          {DOMAINS.map(d => <option key={d.slug} value={d.slug}>{d.label}</option>)}
        </select>

        {/* Active filter */}
        {["active", "inactive", "all"].map(f => (
          <button key={f} className={"btn btn-sm " + (filterActive === f ? "btn-primary" : "btn-secondary")}
            onClick={() => setFilterActive(f)} style={{ textTransform: "capitalize" }}>{f}</button>
        ))}

        {/* Sources filter */}
        <button className={"btn btn-sm " + (filterSources === "has-sources" ? "btn-primary" : "btn-secondary")}
          onClick={() => setFilterSources(v => v === "has-sources" ? "all" : "has-sources")}
          title={"Topics with at least one source row (" + topicsWithSources.size + ")"}>
          Has sources ({topicsWithSources.size})
        </button>
        <button className={"btn btn-sm " + (filterSources === "empty" ? "btn-primary" : "btn-secondary")}
          onClick={() => setFilterSources(v => v === "empty" ? "all" : "empty")}
          title="Topics with no source rows">
          Empty ({topics.filter(t => !topicsWithSources.has(t.topic_id)).length})
        </button>

        <span style={{ marginLeft: "auto", fontSize: "0.875rem", color: "#6B7280", alignSelf: "center" }}>
          {filtered.length} of {topics.length}
        </span>
      </div>

      {filtered.map(t => {
        const isEditing = editingTopic === t.topic_id;
        const hasSources = topicsWithSources.has(t.topic_id);
        return (
          <div key={t.topic_id} style={{ borderBottom: "1px solid #F3F4F6", padding: "12px 0", opacity: t.is_active ? 1 : 0.45 }}>
            {isEditing ? (
              <div>
                <div className="field">
                  <label className="label">Display Name</label>
                  <input className="input" type="text" value={editTopicData.topic_display_name || ""}
                    onChange={e => onEditDataChange("topic_display_name", e.target.value)} />
                </div>
                <div className="field">
                  <label className="label">Slug</label>
                  <input className="input" type="text" value={editTopicData.topic_name || ""}
                    onChange={e => onEditDataChange("topic_name", e.target.value)} />
                </div>
                <div className="field">
                  <label className="label">Description</label>
                  <textarea className="input textarea" style={{ minHeight: 70 }} value={editTopicData.topic_description || ""}
                    onChange={e => onEditDataChange("topic_description", e.target.value)} />
                </div>
                <div className="field">
                  <label className="label">Domain</label>
                  <select className="input" value={editTopicData.domain || t.domain}
                    onChange={e => onEditDataChange("domain", e.target.value)}>
                    {DOMAINS.map(d => <option key={d.slug} value={d.slug}>{d.label}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label className="label">Adjacent Topics</label>
                  <button className="btn btn-secondary btn-sm" style={{ marginBottom: 8 }}
                    disabled={editSuggestingAdjacent}
                    onClick={() => onSuggestEditAdjacent(t)}>
                    {editSuggestingAdjacent ? "Asking Claude…" : "✦ Re-suggest with Claude"}
                  </button>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 200, overflowY: "auto" }}>
                    {allTopics.filter(x => x.topic_id !== t.topic_id && x.is_active).map(x => (
                      <label key={x.topic_id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.9375rem", cursor: "pointer" }}>
                        <input type="checkbox" checked={editTopicAdjacent.includes(x.topic_id)}
                          onChange={e => onEditAdjacentChange(ids => e.target.checked ? [...ids, x.topic_id] : ids.filter(id => id !== x.topic_id))} />
                        <span style={{ fontWeight: editTopicAdjacent.includes(x.topic_id) ? 700 : 400 }}>{x.topic_display_name}</span>
                        <span style={{ fontSize: "0.8125rem", color: "#9CA3AF" }}>{x.domain}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <button className="btn btn-success btn-sm" onClick={() => onSaveEdit(t.topic_id)}>Save</button>
                  <button className="btn btn-secondary btn-sm" onClick={onCancelEdit}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                {/* Tappable info area */}
                <div style={{ flex: 1, cursor: onSelectTopic ? "pointer" : "default", minWidth: 0 }}
                  onClick={() => onSelectTopic && onSelectTopic(t)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 2 }}>
                    <span style={{ fontSize: "1rem", fontWeight: 700, color: "#111" }}>{t.topic_display_name}</span>
                    <span style={{ fontSize: "0.75rem", background: "#EFF6FF", color: "#1E40AF", padding: "1px 7px", borderRadius: 10 }}>
                      {DOMAINS.find(d => d.slug === t.domain)?.label || t.domain}
                    </span>
                    {hasSources ? (
                      <span style={{ fontSize: "0.75rem", background: "#DCFCE7", color: "#166534", padding: "1px 6px", borderRadius: 8, fontWeight: 700 }}>
                        has sources
                      </span>
                    ) : (
                      <span style={{ fontSize: "0.75rem", background: "#FEF3C7", color: "#92400E", padding: "1px 6px", borderRadius: 8 }}>
                        empty
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "0.8125rem", color: "#6B7280", marginTop: 1 }}>
                    {t.topic_id} · {t.topic_name}
                  </div>
                  {t.topic_description && (
                    <div style={{ fontSize: "0.9375rem", color: "#4B5563", marginTop: 4, lineHeight: 1.4 }}>{t.topic_description}</div>
                  )}
                  {t.adjacent_topic_ids?.length > 0 && (
                    <div style={{ marginTop: 5, display: "flex", flexWrap: "wrap", gap: 4 }}>
                      <span style={{ fontSize: "0.8125rem", color: "#9CA3AF", marginRight: 2 }}>Adjacent:</span>
                      {t.adjacent_topic_ids.map(id => (
                        <span key={id} className="tag" style={{ fontSize: "0.8125rem" }}>{topicName(id)}</span>
                      ))}
                    </div>
                  )}
                  {onSelectTopic && (
                    <div style={{ fontSize: "0.8125rem", color: "#D1D5DB", marginTop: 2 }}>Tap for source rows</div>
                  )}
                </div>
                {/* Action buttons */}
                <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                  <button className="btn btn-secondary btn-sm" onClick={e => { e.stopPropagation(); onStartEdit(t); }}>Edit</button>
                  <button className={"btn btn-sm " + (t.is_active ? "btn-danger" : "btn-success")}
                    onClick={e => { e.stopPropagation(); onToggleActive(t); }}>
                    {t.is_active ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
