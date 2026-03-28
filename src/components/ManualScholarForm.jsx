import { useState } from "react";
import { guessEraFromName, guessStrandFromName, STRAND_COLOURS } from "../constants.js";

export default function ManualScholarForm({ scholars, onAdd }) {
  const [scholarId, setScholarId] = useState("");
  const [title, setTitle] = useState("");
  const [year, setYear] = useState("");

  function add() {
    const sc = scholars.find(s => s.scholar_id === parseInt(scholarId, 10));
    if (!sc) return;
    onAdd({
      scholar_id: sc.scholar_id,
      scholar_name: sc.scholar_name,
      strand: sc.strand,
      source_title: title,
      source_year: year,
      included: true,
      selectedTopics: {},
      confidence: "medium",
    });
    setScholarId(""); setTitle(""); setYear("");
  }

  return (
    <div>
      <div className="field">
        <label className="label">Scholar</label>
        <select className="input" value={scholarId} onChange={e => setScholarId(e.target.value)}>
          <option value="">Select scholar…</option>
          {scholars.map(s => <option key={s.scholar_id} value={s.scholar_id}>{s.scholar_name}</option>)}
        </select>
      </div>
      <div className="field">
        <label className="label">Source Title (optional)</label>
        <input className="input" type="text" value={title} onChange={e => setTitle(e.target.value)} />
      </div>
      <div className="field">
        <label className="label">Year (optional)</label>
        <input className="input" type="number" value={year} onChange={e => setYear(e.target.value)} style={{ maxWidth: 120 }} />
      </div>
      <button className="btn btn-secondary" onClick={add} disabled={!scholarId}>+ Add Scholar Card</button>
    </div>
  );
}
