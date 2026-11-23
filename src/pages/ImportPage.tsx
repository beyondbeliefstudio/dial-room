import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useKey } from "../session";
import { toSheetRows } from "../lib/tsv";

const KNOWN_COUNTIES = ["Union County", "Cabarrus County", "Lancaster County", "Stanly County", "Mecklenburg County"];

export default function ImportPage() {
  const key = useKey();
  const facets = useQuery(api.prospects.facets, { key });
  const importRows = useMutation(api.importer.importRows);
  const [county, setCounty] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<null | { added: number; updated: number; skipped: number }>(null);
  const [error, setError] = useState("");

  const parsed = useMemo(() => (text.trim() ? toSheetRows(text) : null), [text]);
  const counties = useMemo(
    () => [...new Set([...KNOWN_COUNTIES, ...(facets?.counties.map((c) => c.name) ?? [])])].sort(),
    [facets],
  );

  async function run() {
    if (!parsed || !county.trim()) return;
    setBusy(true);
    setError("");
    setResult(null);
    const total = { added: 0, updated: 0, skipped: 0 };
    try {
      for (let i = 0; i < parsed.rows.length; i += 100) {
        const r = await importRows({ key, county: county.trim(), rows: parsed.rows.slice(i, i + 100) });
        total.added += r.added;
        total.updated += r.updated;
        total.skipped += r.skipped;
      }
      setResult(total);
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page narrow">
      <div className="page-head">
        <div>
          <h1>Import prospects</h1>
          <p className="muted">{facets ? `${facets.total} prospects in the app right now` : "…"}</p>
        </div>
      </div>

      <ol className="steps">
        <li>
          Open a county prospect sheet and go to its <strong>All prospects</strong> tab (or any single industry tab).
        </li>
        <li>
          Click the box in the top-left corner of the grid to select everything, then press <kbd>⌘</kbd> <kbd>C</kbd>.
        </li>
        <li>Pick the county below and paste into the box.</li>
      </ol>
      <p className="muted small">
        Re-importing is safe. Matching businesses get their sheet columns refreshed (status, notes, what to mention), and your call
        history, owner names and concept links stay put.
      </p>

      <label className="field">
        <span>County</span>
        <input list="county-list" value={county} onChange={(e) => setCounty(e.target.value)} placeholder="Union County" />
        <datalist id="county-list">
          {counties.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </label>

      <label className="field">
        <span>Paste from Google Sheets</span>
        <textarea
          className="paste"
          rows={10}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setResult(null);
          }}
          placeholder="Business	Industry	Town	Fit	Status	…"
        />
      </label>

      {parsed && (
        <div className="panel preview">
          <p>
            <strong>{parsed.rows.length}</strong> businesses found
            {!parsed.headerFound && " (no header row, so the standard prospect sheet column order is assumed)"}.
          </p>
          {parsed.unknownHeaders.length > 0 && (
            <p className="muted small">Ignored columns: {parsed.unknownHeaders.join(", ")}</p>
          )}
          {parsed.headerFound && parsed.missingHeaders.length > 0 && (
            <p className="muted small">Not in this paste: {parsed.missingHeaders.join(", ")}</p>
          )}
          <ul className="sample">
            {parsed.rows.slice(0, 6).map((r, i) => (
              <li key={i}>
                <strong>{r.business}</strong> · {r.industry} · {r.town} · {r.fit || "no fit"} · {r.phone || "no phone"}
              </li>
            ))}
            {parsed.rows.length > 6 && <li className="muted">and {parsed.rows.length - 6} more</li>}
          </ul>
        </div>
      )}

      {error && <p className="error-text">{error}</p>}
      {result && (
        <p className="success-text">
          Done. {result.added} added, {result.updated} updated{result.skipped ? `, ${result.skipped} skipped` : ""}.
        </p>
      )}

      <button className="btn btn-primary btn-big" disabled={!parsed?.rows.length || !county.trim() || busy} onClick={run}>
        {busy ? "Importing…" : parsed?.rows.length ? `Import ${parsed.rows.length} into ${county || "…"}` : "Import"}
      </button>
    </div>
  );
}
