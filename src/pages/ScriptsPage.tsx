import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import { useKey } from "../session";
import { useLibrary } from "../library";
import { CATEGORY_LABELS, DEFAULT_SCRIPTS, type ScriptCategory, type ScriptDef } from "../lib/scriptDefaults";
import { buildVars, FLAGS, PLACEHOLDERS, renderLines, renderPlain } from "../lib/templates";
import ScriptView from "../components/ScriptView";

const CATEGORIES: ScriptCategory[] = ["call", "objection", "facebook", "email", "meeting", "other"];
const ADDABLE: ScriptCategory[] = ["objection", "other"];
const PLAIN: ScriptCategory[] = ["facebook", "email", "meeting", "other"];

function blankScript(category: ScriptCategory, order: number): ScriptDef {
  const id = Math.random().toString(36).slice(2, 8);
  return {
    key: `custom.${category}.${id}`,
    category,
    title: category === "objection" ? "New objection" : "New script",
    body: "",
    body2: category === "objection" ? "" : undefined,
    order,
    custom: true,
  };
}

export default function ScriptsPage() {
  const key = useKey();
  const lib = useLibrary();
  const saved = useQuery(api.scripts.list, { key });
  const prospects = useQuery(api.prospects.list, { key });
  const save = useMutation(api.scripts.save);
  const remove = useMutation(api.scripts.remove);

  const [selected, setSelected] = useState("call.followup");
  const [drafts, setDrafts] = useState<Record<string, ScriptDef>>({});
  const [newOnes, setNewOnes] = useState<ScriptDef[]>([]);
  const [previewId, setPreviewId] = useState<string>("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const savedKeys = useMemo(() => new Set((saved ?? []).map((s) => s.key)), [saved]);
  const all = useMemo(() => {
    const unsavedNew = newOnes.filter((n) => !lib.byKey.has(n.key));
    return [...lib.byKey.values(), ...unsavedNew];
  }, [lib, newOnes]);
  const current = drafts[selected] ?? all.find((s) => s.key === selected) ?? lib.get("call.followup");
  const original = lib.byKey.get(current.key);
  const dirty = !!drafts[current.key] && JSON.stringify(drafts[current.key]) !== JSON.stringify(original ?? {});
  const builtIn = DEFAULT_SCRIPTS.some((d) => d.key === current.key);
  const edited = builtIn && savedKeys.has(current.key);

  const sample: Doc<"prospects"> | null = useMemo(() => {
    if (!prospects?.length) return null;
    return (
      prospects.find((p) => p._id === previewId) ??
      prospects.find((p) => p.conceptBuilt) ??
      prospects.find((p) => p.fit === "Strong" && p.ownerName) ??
      prospects.find((p) => p.fit === "Strong") ??
      prospects[0]
    );
  }, [prospects, previewId]);

  function change(patch: Partial<ScriptDef>) {
    setDrafts((d) => ({ ...d, [current.key]: { ...current, ...patch } }));
    setStatus("");
    setError("");
  }

  async function doSave() {
    setError("");
    try {
      const s = drafts[current.key] ?? current;
      await save({
        key,
        script: {
          key: s.key,
          category: s.category,
          title: s.title,
          subject: s.subject,
          body: s.body,
          body2: s.body2,
          note: s.note,
          order: s.order,
          custom: !!s.custom,
        },
      });
      setDrafts((d) => {
        const next = { ...d };
        delete next[s.key];
        return next;
      });
      setNewOnes((n) => n.filter((x) => x.key !== s.key));
      setStatus("Saved. It's live on the Call and Today screens.");
    } catch (err) {
      setError(err instanceof Error ? err.message.replace(/^[\s\S]*ConvexError: /, "").split("\n")[0] : "Couldn't save");
    }
  }

  async function doReset() {
    await remove({ key, scriptKey: current.key });
    setDrafts((d) => {
      const next = { ...d };
      delete next[current.key];
      return next;
    });
    setStatus(current.custom ? "Deleted." : "Back to the default.");
    if (current.custom) setSelected(lib.list(current.category).find((s) => s.key !== current.key)?.key ?? "call.followup");
  }

  function add(category: ScriptCategory) {
    const s = blankScript(category, lib.list(category).length + newOnes.length + 1);
    setNewOnes((n) => [...n, s]);
    setDrafts((d) => ({ ...d, [s.key]: s }));
    setSelected(s.key);
    setStatus("");
  }

  const isPlain = PLAIN.includes(current.category);
  const hasSubject = current.subject !== undefined || current.category === "email" || current.category === "meeting";

  return (
    <div className="page scripts-page">
      <div className="page-head">
        <div>
          <h1>Scripts</h1>
          <p className="muted">Edit any script and it updates everywhere it's used. Built-in scripts can always be reset to the default.</p>
        </div>
      </div>
      <div className="scripts-grid">
        <nav className="panel scripts-nav" aria-label="Scripts">
          {CATEGORIES.map((cat) => {
            const items = [...lib.list(cat), ...newOnes.filter((n) => n.category === cat && !lib.byKey.has(n.key))];
            if (!items.length && !ADDABLE.includes(cat)) return null;
            return (
              <div key={cat} className="scripts-group">
                <h3>{CATEGORY_LABELS[cat]}</h3>
                {items.map((s) => (
                  <button key={s.key} className={`script-item ${s.key === current.key ? "is-on" : ""}`} onClick={() => setSelected(s.key)}>
                    <span>{(drafts[s.key] ?? s).title || "Untitled"}</span>
                    {drafts[s.key] && <span className="dot" title="Unsaved changes" />}
                    {!drafts[s.key] && s.custom && <span className="tag">yours</span>}
                    {!drafts[s.key] && !s.custom && savedKeys.has(s.key) && <span className="tag">edited</span>}
                  </button>
                ))}
                {ADDABLE.includes(cat) && (
                  <button className="link-btn add-script" onClick={() => add(cat)}>
                    + Add {cat === "objection" ? "an objection" : "a script"}
                  </button>
                )}
              </div>
            );
          })}
        </nav>

        <section className="panel scripts-editor">
          <div className="editor-head">
            <span className="eyebrow">{CATEGORY_LABELS[current.category]}</span>
            {edited && <span className="tag">edited</span>}
            {current.custom && <span className="tag">yours</span>}
          </div>
          <label className="field">
            <span>Title</span>
            <input value={current.title} onChange={(e) => change({ title: e.target.value })} />
          </label>
          {hasSubject && (
            <label className="field">
              <span>Subject</span>
              <textarea
                className="script-text"
                rows={Math.max(1, (current.subject ?? "").split("\n").length)}
                value={current.subject ?? ""}
                onChange={(e) => change({ subject: e.target.value })}
              />
            </label>
          )}
          <label className="field">
            <span>{current.category === "objection" ? "ARA: first pushback" : "Script"}</span>
            <textarea className="script-text" rows={current.category === "objection" ? 6 : 16} value={current.body} onChange={(e) => change({ body: e.target.value })} />
          </label>
          {current.category === "objection" && (
            <label className="field">
              <span>ACE: if they keep talking</span>
              <textarea className="script-text" rows={6} value={current.body2 ?? ""} onChange={(e) => change({ body2: e.target.value })} />
            </label>
          )}
          <label className="field">
            <span>Note (shown beside the script)</span>
            <textarea rows={2} value={current.note ?? ""} onChange={(e) => change({ note: e.target.value || undefined })} />
          </label>
          {error && <p className="error-text">{error}</p>}
          {status && <p className="success-text small">{status}</p>}
          <div className="row gap wrap">
            <button className="btn btn-primary" onClick={doSave} disabled={!dirty && !current.custom}>
              Save
            </button>
            {dirty && (
              <button
                className="btn btn-ghost"
                onClick={() =>
                  setDrafts((d) => {
                    const next = { ...d };
                    delete next[current.key];
                    return next;
                  })
                }
              >
                Discard changes
              </button>
            )}
            {edited && (
              <button className="btn btn-ghost" onClick={doReset}>
                Reset to default
              </button>
            )}
            {current.custom && savedKeys.has(current.key) && (
              <button className="btn btn-ghost" onClick={doReset}>
                Delete
              </button>
            )}
          </div>

          <details className="syntax">
            <summary>Placeholders and formatting</summary>
            <p className="small">
              Write <code>{"{business}"}</code> and it fills in for each prospect. Start a line with <code>{"{if:site}"}</code> to only show it when they have a
              website, or <code>{"{if:!site}"}</code> when they don't. On call scripts, a paragraph in parentheses is a stage direction and a paragraph starting
              with <code>[Label]</code> is a branch. Blank lines separate paragraphs.
            </p>
            <div className="syntax-grid">
              <div>
                <h4>Placeholders</h4>
                <ul>
                  {PLACEHOLDERS.map((p) => (
                    <li key={p.name}>
                      <code>{`{${p.name}}`}</code> {p.means}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4>Conditions</h4>
                <ul>
                  {FLAGS.map((f) => (
                    <li key={f.name}>
                      <code>{`{if:${f.name}}`}</code> {f.means}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </details>
        </section>

        <section className="panel scripts-preview">
          <div className="editor-head">
            <span className="eyebrow">Preview</span>
          </div>
          {prospects && prospects.length > 0 && (
            <label className="field">
              <span>As if you're reaching out to</span>
              <select value={sample?._id ?? ""} onChange={(e) => setPreviewId(e.target.value)}>
                {[...prospects]
                  .sort((a, b) => a.business.localeCompare(b.business))
                  .map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.business}
                    </option>
                  ))}
              </select>
            </label>
          )}
          {sample ? <Preview s={current} p={sample} plain={isPlain} /> : <p className="muted">Import prospects to see a preview.</p>}
        </section>
      </div>
    </div>
  );
}

function Preview({ s, p, plain }: { s: ScriptDef; p: Doc<"prospects">; plain: boolean }) {
  const { vars, flags } = buildVars(p, new Date(), s.key === "call.prep" ? { when: "tomorrow" } : {});
  if (plain) {
    const subject = s.subject ? renderPlain(s.subject, vars, flags) : "";
    return (
      <div className="copy-block">
        {subject && (
          <p className="small">
            <strong>Subject:</strong> {subject}
          </p>
        )}
        <pre>{renderPlain(s.body, vars, flags) || " "}</pre>
      </div>
    );
  }
  return (
    <div className="preview-script">
      {s.category === "objection" && <h4 className="obj-h">ARA</h4>}
      <ScriptView lines={renderLines(s.body, vars, flags)} />
      {s.category === "objection" && s.body2?.trim() && (
        <>
          <h4 className="obj-h">ACE</h4>
          <ScriptView lines={renderLines(s.body2, vars, flags)} />
        </>
      )}
    </div>
  );
}
