import { useState } from "react";
import { callClaudeFull } from "../lib/claude.js";
import { makeSupabase } from "../lib/supabase.js";
import { buildQualityCheckPrompt } from "../lib/prompts.js";

// Strip JSON fences and parse.
function parseJsonResult(raw) {
  return JSON.parse(raw.replace(/```json|```/g, "").trim());
}

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

// Compact before/after diff with changed words highlighted in green.
function MiniDiff({ original, suggestion, onApply, onDismiss }) {
  const origWords = new Set((original || "").toLowerCase().split(/\s+/).filter(Boolean));
  const sugWords = (suggestion || "").split(/\s+/);
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>
        <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 5, padding: "5px 7px" }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#991B1B", marginBottom: 2 }}>Original</div>
          <div style={{ fontSize: "0.8125rem", color: "#374151", lineHeight: 1.4 }}>{original}</div>
        </div>
        <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: 5, padding: "5px 7px" }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#166534", marginBottom: 2 }}>
            {suggestion ? "Suggested" : "Delete"}
          </div>
          {suggestion ? (
            <div style={{ fontSize: "0.8125rem", lineHeight: 1.4 }}>
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
            <div style={{ fontSize: "0.8125rem", color: "#991B1B", fontStyle: "italic" }}>Delete this item</div>
          )}
        </div>
      </div>
      <div style={{ display: "flex", gap: 5 }}>
        <button className="btn btn-success btn-sm" onClick={onApply}>
          {suggestion ? "Apply" : "Delete"}
        </button>
        <button className="btn btn-secondary btn-sm" onClick={onDismiss}>Dismiss</button>
      </div>
    </div>
  );
}

// Renders claim and angle flags for a single source row.
function RowCheckResult({ result, rowIdx, onResolve }) {
  const unresolvedClaims = (result.claim_flags || []).filter(f => !f.resolution);
  const unresolvedAngles = (result.angle_flags || []).filter(f => !f.resolution);
  const unresolvedConsistency = (result.consistency_flags || []).filter(f => !f.resolution);
  const total = unresolvedClaims.length + unresolvedAngles.length + unresolvedConsistency.length;

  if (total === 0 && result.overall === "clean" && !result.consistency_flags?.length) return null;

  return (
    <div style={{ borderTop: "1px solid #E5E7EB", paddingTop: 10, marginTop: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: "0.8125rem", fontWeight: 700,
          color: result.overall === "significant-issues" ? "#991B1B" : result.overall === "clean" ? "#166534" : "#92400E",
          background: result.overall === "significant-issues" ? "#FEE2E2" : result.overall === "clean" ? "#DCFCE7" : "#FFFBEB",
          padding: "2px 8px", borderRadius: 10 }}>
          {result.overall === "significant-issues" ? "Significant issues" : result.overall === "clean" ? "Clean" : "Minor issues"}
        </span>
        {total > 0 && <span style={{ fontSize: "0.75rem", color: "#6B7280" }}>{total} unresolved</span>}
      </div>

      {(result.claim_flags || []).map((flag, fi) => (
        <div key={flag.id || fi} style={{
          background: flag.resolution ? "#F9FAFB" : "#FFFBEB",
          border: "1px solid " + (flag.resolution ? "#E5E7EB" : "#FCD34D"),
          borderRadius: 7, padding: "8px 10px", marginBottom: 6,
          opacity: flag.resolution ? 0.6 : 1,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#92400E" }}>
              Claim {flag.claim_index} · {flag.action === "delete" ? "Recommend deletion" : "Rewrite"}
            </span>
            {flag.resolution && (
              <span style={{ fontSize: "0.75rem", padding: "1px 6px", borderRadius: 8, fontWeight: 700,
                color: flag.resolution === "applied" ? "#166534" : "#6B7280",
                background: flag.resolution === "applied" ? "#DCFCE7" : "#F3F4F6" }}>
                {flag.resolution === "applied" ? "Applied" : "Dismissed"}
              </span>
            )}
          </div>
          <div style={{ fontSize: "0.8125rem", color: "#374151", fontStyle: "italic", marginBottom: flag.resolution ? 0 : 6 }}>{flag.issue}</div>
          {!flag.resolution && (
            <MiniDiff
              original={flag.original}
              suggestion={flag.suggestion}
              onApply={() => onResolve(rowIdx, "claim", flag.id, "applied")}
              onDismiss={() => onResolve(rowIdx, "claim", flag.id, "dismissed")}
            />
          )}
        </div>
      ))}

      {(result.angle_flags || []).map((flag, fi) => {
        const cols = CHECK_COLOURS[flag.check] || CHECK_COLOURS.depth;
        return (
          <div key={flag.id || fi} style={{
            background: flag.resolution ? "#F9FAFB" : "#FFF",
            border: "1px solid " + (flag.resolution ? "#E5E7EB" : (flag.check === "discrimination" || flag.check === "harm" ? "#FECACA" : "#FCD34D")),
            borderRadius: 7, padding: "8px 10px", marginBottom: 6,
            opacity: flag.resolution ? 0.6 : 1,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, padding: "1px 7px", borderRadius: 10, background: cols.bg, color: cols.text }}>
                  {CHECK_LABELS[flag.check] || flag.check}
                </span>
                <span style={{ fontSize: "0.8125rem", color: "#6B7280" }}>Angle {flag.angle_index}</span>
              </div>
              {flag.resolution && (
                <span style={{ fontSize: "0.75rem", padding: "1px 6px", borderRadius: 8, fontWeight: 700,
                  color: flag.resolution === "applied" ? "#166534" : "#6B7280",
                  background: flag.resolution === "applied" ? "#DCFCE7" : "#F3F4F6" }}>
                  {flag.resolution === "applied" ? "Applied" : "Dismissed"}
                </span>
              )}
            </div>
            <div style={{ fontSize: "0.8125rem", color: "#374151", fontStyle: "italic", marginBottom: flag.resolution ? 0 : 6 }}>{flag.issue}</div>
            {!flag.resolution && (
              <MiniDiff
                original={flag.original}
                suggestion={flag.suggestion}
                onApply={() => onResolve(rowIdx, "angle", flag.id, "applied")}
                onDismiss={() => onResolve(rowIdx, "angle", flag.id, "dismissed")}
              />
            )}
          </div>
        );
      })}

      {(result.consistency_flags || []).map((flag, fi) => (
        <div key={fi} style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "10px 12px", marginBottom: 6 }}>
          <div style={{ fontSize: "0.875rem", color: "#1E40AF" }}>
            Consistency conflict with another source row: {flag.issue}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main exported component ───────────────────────────────────────────────────
//
// queryFilter: Supabase REST filter string appended to the sources query.
//   For scholar: "scholar_id=eq.42"
//   For topic:   "topic_ids=cs.{101}"
//
// labelField: string shown in the row header alongside source title.
//   For scholar view: scholar name not needed (already in context).
//   For topic view: show author_name so you know whose claim this is.
//
export function SourceRowsPanel({ queryFilter, labelField = null, config, allScholars, allTopics }) {
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checkingIdx, setCheckingIdx] = useState(null);
  const [rowErrors, setRowErrors] = useState({});

  const db = () => makeSupabase(config?.supabaseUrl, config?.supabaseKey);

  async function loadRows() {
    setLoading(true);
    setRowErrors({});
    try {
      const data = await db().get(
        "/rest/v1/sources?select=source_id,scholar_id,author_name,source_title,source_year,content_summary,devotional_angles,theological_themes,topic_ids,citation_confidence,health_check_status,quality_check_result&" +
        queryFilter +
        "&is_active=eq.true&is_default_library=eq.true&order=topic_ids"
      );
      setRows(data);
    } catch (e) {
      setRowErrors(prev => ({ ...prev, load: e.message }));
    }
    setLoading(false);
  }

  async function checkRow(rowIdx) {
    const row = rows[rowIdx];
    if (!row) return;
    setCheckingIdx(rowIdx);
    setRowErrors(prev => ({ ...prev, [rowIdx]: null }));
    try {
      const scholarMeta = allScholars.find(sc => sc.scholar_id === row.scholar_id) || null;
      const raw = await callClaudeFull(config.anthropicKey, {
        messages: [{ role: "user", content: buildQualityCheckPrompt(row, scholarMeta) }],
        max_tokens: 2500, temperature: 0.2,
      });
      const parsed = parseJsonResult(raw);
      const result = {
        ...parsed,
        checked_at: new Date().toISOString(),
        claim_flags: (parsed.claim_flags || []).map((f, fi) => ({ ...f, id: "cf_" + fi, resolution: null })),
        angle_flags: (parsed.angle_flags || []).map((f, fi) => ({ ...f, id: "af_" + fi, resolution: null })),
      };
      try {
        await db().patch("/rest/v1/sources?source_id=eq." + row.source_id, {
          health_check_status: result.overall === "clean" ? "clean" : "flagged",
          quality_check_result: result,
        });
      } catch {}
      setRows(prev => prev.map((r, i) => i === rowIdx
        ? { ...r, quality_check_result: result, health_check_status: result.overall === "clean" ? "clean" : "flagged" }
        : r));
    } catch (e) {
      setRowErrors(prev => ({ ...prev, [rowIdx]: e.message }));
    }
    setCheckingIdx(null);
  }

  async function applyFlagResolution(rowIdx, type, flagId, resolution) {
    const row = rows[rowIdx];
    if (!row?.quality_check_result) return;
    const result = row.quality_check_result;

    let patch = {};
    let updatedResult;

    if (type === "claim") {
      const flag = result.claim_flags.find(f => f.id === flagId);
      if (!flag) return;
      const currentClaims = Array.isArray(row.content_summary)
        ? [...row.content_summary]
        : (row.content_summary || "").split("\n").filter(Boolean);
      const idx = flag.claim_index - 1;
      if (resolution === "applied") {
        patch.content_summary = (flag.action === "delete"
          ? currentClaims.filter((_, i) => i !== idx)
          : currentClaims.map((c, i) => i === idx ? flag.suggestion : c)
        ).join("\n");
      }
      updatedResult = { ...result, claim_flags: result.claim_flags.map(f => f.id === flagId ? { ...f, resolution } : f) };
    } else {
      const flag = result.angle_flags.find(f => f.id === flagId);
      if (!flag) return;
      const currentAngles = [...(row.devotional_angles || [])];
      const idx = flag.angle_index - 1;
      if (resolution === "applied") {
        patch.devotional_angles = currentAngles.map((a, i) => i === idx ? flag.suggestion : a);
      }
      updatedResult = { ...result, angle_flags: result.angle_flags.map(f => f.id === flagId ? { ...f, resolution } : f) };
    }

    const allFlags = [...(updatedResult.claim_flags || []), ...(updatedResult.angle_flags || [])];
    patch.health_check_status = allFlags.every(f => f.resolution) ? "clean" : "flagged";
    patch.quality_check_result = updatedResult;

    try {
      await db().patch("/rest/v1/sources?source_id=eq." + row.source_id, patch);
      setRows(prev => prev.map((r, i) => i === rowIdx ? { ...r, ...patch, quality_check_result: updatedResult } : r));
    } catch (e) {
      setRowErrors(prev => ({ ...prev, [rowIdx]: e.message }));
    }
  }

  // ── Not yet loaded ────────────────────────────────────────────────────────────
  if (rows === null) {
    return (
      <div style={{ marginTop: 20 }}>
        <div style={{ fontSize: "0.8125rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6B7280", marginBottom: 8 }}>Source Rows</div>
        <button className="btn btn-secondary btn-sm" onClick={loadRows} disabled={loading}>
          {loading ? "Loading..." : "Load source rows"}
        </button>
        {rowErrors.load && <div style={{ fontSize: "0.875rem", color: "#991B1B", marginTop: 6 }}>⚠️ {rowErrors.load}</div>}
      </div>
    );
  }

  // ── Empty ─────────────────────────────────────────────────────────────────────
  if (rows.length === 0) {
    return (
      <div style={{ marginTop: 20 }}>
        <div style={{ fontSize: "0.8125rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6B7280", marginBottom: 6 }}>Source Rows</div>
        <div style={{ fontSize: "0.9375rem", color: "#6B7280" }}>No source rows found.</div>
        <button className="btn btn-secondary btn-sm" style={{ marginTop: 8 }} onClick={loadRows} disabled={loading}>↺ Retry</button>
      </div>
    );
  }

  // ── Rows ──────────────────────────────────────────────────────────────────────
  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: "0.8125rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6B7280" }}>
          Source Rows ({rows.length})
        </div>
        <button className="btn btn-secondary btn-sm" onClick={loadRows} disabled={loading}>↺ Refresh</button>
      </div>

      {rows.map((row, rowIdx) => {
        const claims = Array.isArray(row.content_summary)
          ? row.content_summary
          : (row.content_summary || "").split("\n").filter(Boolean);
        const result = row.quality_check_result;
        const isChecking = checkingIdx === rowIdx;
        const topicId = (row.topic_ids || [])[0];
        const topic = allTopics?.find(t => t.topic_id === topicId);

        const statusColour = row.health_check_status === "clean"
          ? { bg: "#DCFCE7", text: "#166534" }
          : row.health_check_status === "flagged"
          ? { bg: "#FEE2E2", text: "#991B1B" }
          : { bg: "#F3F4F6", text: "#6B7280" };

        return (
          <div key={row.source_id} style={{ border: "1px solid #E5E7EB", borderRadius: 10, padding: 12, marginBottom: 10 }}>
            {/* Row header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#111" }}>
                  {row.source_title || "Untitled source"}
                  {row.source_year ? " (" + row.source_year + ")" : ""}
                </div>
                <div style={{ fontSize: "0.8125rem", color: "#6B7280", marginTop: 2 }}>
                  {/* Show author in topic view, topic name in scholar view */}
                  {labelField === "author" ? row.author_name : (topic ? topic.topic_display_name : "topic " + topicId)}
                  {" · "}{row.citation_confidence} confidence
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, padding: "2px 7px", borderRadius: 10,
                  background: statusColour.bg, color: statusColour.text }}>
                  {row.health_check_status || "unchecked"}
                </span>
                <button className="btn btn-secondary btn-sm" style={{ color: "#1D4ED8" }}
                  onClick={() => checkRow(rowIdx)} disabled={isChecking}>
                  {isChecking ? "Checking..." : result ? "Re-check" : "Check row"}
                </button>
              </div>
            </div>

            {/* Claims */}
            <div style={{ marginBottom: result ? 10 : 0 }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#9CA3AF", marginBottom: 4 }}>
                Claims ({claims.length})
              </div>
              {claims.map((claim, ci) => {
                const claimFlag = result?.claim_flags?.find(f => f.claim_index === ci + 1);
                const flagColour = claimFlag
                  ? claimFlag.resolution === "applied" ? "#166534"
                  : claimFlag.resolution === "dismissed" ? "#6B7280"
                  : "#991B1B"
                  : null;
                return (
                  <div key={ci} style={{
                    fontSize: "0.875rem", color: "#374151", padding: "4px 0",
                    borderBottom: "1px solid #F9FAFB", lineHeight: 1.5,
                    borderLeft: flagColour ? "3px solid " + flagColour : "none",
                    paddingLeft: flagColour ? 8 : 0,
                  }}>
                    <span style={{ color: "#9CA3AF", marginRight: 4 }}>{ci + 1}.</span>
                    {claim}
                    {claimFlag && !claimFlag.resolution && (
                      <span style={{ fontSize: "0.75rem", color: "#991B1B", marginLeft: 8, fontWeight: 700 }}>⚑ flagged</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Inline check error */}
            {rowErrors[rowIdx] && (
              <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6, padding: "8px 10px", marginBottom: 8, fontSize: "0.875rem", color: "#991B1B" }}>
                ⚠️ {rowErrors[rowIdx]}
              </div>
            )}

            {result && (
              <RowCheckResult result={result} rowIdx={rowIdx} onResolve={applyFlagResolution} />
            )}
          </div>
        );
      })}
    </div>
  );
}
