import { DOMAINS } from "../../constants.js";
import { SourceRowsPanel } from "../SourceRowsPanel.jsx";

export default function TopicDetailPanel({ selectedTopic, setSelectedTopic, config, allScholars, allTopics }) {
  if (!selectedTopic) return null;

  const domainLabel = DOMAINS.find(d => d.slug === selectedTopic.domain)?.label || selectedTopic.domain;
  const adjacentTopics = (selectedTopic.adjacent_topic_ids || [])
    .map(id => allTopics?.find(t => t.topic_id === id))
    .filter(Boolean);

  return (
    <>
      <div className="panel-overlay" onClick={() => setSelectedTopic(null)} />
      <div className="panel-sheet">
        <div className="panel-header">
          <span className="panel-title">{selectedTopic.topic_display_name}</span>
          <button className="panel-close" onClick={() => setSelectedTopic(null)}>×</button>
        </div>
        <div className="panel-body">

          {/* Badges */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
            <span style={{ fontSize: "0.8125rem", background: "#EFF6FF", color: "#1E40AF", padding: "2px 8px", borderRadius: 10, fontWeight: 700 }}>
              {domainLabel}
            </span>
            <span style={{ fontSize: "0.8125rem", background: "#F3F4F6", color: "#6B7280", padding: "2px 8px", borderRadius: 10 }}>
              {selectedTopic.topic_name}
            </span>
            {!selectedTopic.is_active && (
              <span style={{ fontSize: "0.8125rem", background: "#FEE2E2", color: "#991B1B", padding: "2px 8px", borderRadius: 10 }}>
                inactive
              </span>
            )}
          </div>

          {/* Description */}
          {selectedTopic.topic_description && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: "0.8125rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6B7280", marginBottom: 4 }}>Description</div>
              <div style={{ fontSize: "1rem", color: "#374151", lineHeight: 1.6 }}>{selectedTopic.topic_description}</div>
            </div>
          )}

          {/* Adjacent topics */}
          {adjacentTopics.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: "0.8125rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6B7280", marginBottom: 6 }}>Adjacent Topics</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {adjacentTopics.map(t => (
                  <span key={t.topic_id} style={{ fontSize: "0.875rem", background: "#F3F4F6", color: "#374151", padding: "2px 8px", borderRadius: 10 }}>
                    {t.topic_display_name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Topic ID */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: "0.8125rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6B7280", marginBottom: 4 }}>Topic ID</div>
            <div style={{ fontSize: "0.9375rem", color: "#6B7280" }}>{selectedTopic.topic_id}</div>
          </div>

          {/* Source rows */}
          {config?.anthropicKey && config?.supabaseKey && (
            <SourceRowsPanel
              key={"topic-" + selectedTopic.topic_id}
              queryFilter={"topic_ids=cs.{" + selectedTopic.topic_id + "}"}
              labelField="author"
              config={config}
              allScholars={allScholars}
              allTopics={allTopics}
            />
          )}
        </div>
      </div>
    </>
  );
}
