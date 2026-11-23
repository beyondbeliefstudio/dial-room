import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { useKey } from "../session";
import { STATUS_LABEL } from "../lib/labels";
import { fromLocalInput, relative, toLocalInput } from "../lib/dates";
import { hasPriorTouch } from "../lib/script";
import Modal from "../components/Modal";
import { History, NoteBox, PhoneBlock, ProspectFacts, ProspectLinks } from "../components/ProspectInfo";
import { freeNotes } from "../lib/timeline";

type SortKey = "business" | "next" | "attempts" | "fit";
const FIT_RANK: Record<string, number> = { Strong: 0, Good: 1, Lower: 2, Skip: 3 };

export default function ProspectsPage({ onCall }: { onCall: (id: Id<"prospects">) => void }) {
  const key = useKey();
  const all = useQuery(api.prospects.list, { key });
  const [q, setQ] = useState("");
  const [county, setCounty] = useState("");
  const [industry, setIndustry] = useState("");
  const [status, setStatus] = useState("");
  const [concept, setConcept] = useState("");
  const [sort, setSort] = useState<SortKey>("fit");
  const [openId, setOpenId] = useState<Id<"prospects"> | null>(null);
  const [adding, setAdding] = useState(false);

  const counties = useMemo(() => [...new Set((all ?? []).map((p) => p.county).filter(Boolean))].sort(), [all]);
  const industries = useMemo(() => [...new Set((all ?? []).map((p) => p.industry).filter(Boolean))].sort(), [all]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = (all ?? []).filter((p) => {
      if (county && p.county !== county) return false;
      if (industry && p.industry !== industry) return false;
      if (status && p.callStatus !== status) return false;
      if (concept === "yes" && !p.conceptBuilt) return false;
      if (concept === "no" && p.conceptBuilt) return false;
      if (needle) {
        const hay = `${p.business} ${p.town} ${p.ownerName} ${p.phone} ${p.email} ${p.website}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
    list.sort((a, b) => {
      if (sort === "business") return a.business.localeCompare(b.business);
      if (sort === "attempts") return b.attempts - a.attempts;
      if (sort === "next") return a.nextCallAt - b.nextCallAt;
      return (FIT_RANK[a.fit] ?? 9) - (FIT_RANK[b.fit] ?? 9) || a.business.localeCompare(b.business);
    });
    return list;
  }, [all, q, county, industry, status, concept, sort]);

  const open = rows.find((p) => p._id === openId) ?? (all ?? []).find((p) => p._id === openId) ?? null;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Prospects</h1>
          <p className="muted">
            {all === undefined ? "Loading…" : `${rows.length} of ${all.length} showing`}
          </p>
        </div>
        <button className="btn" onClick={() => setAdding(true)}>
          Add a prospect
        </button>
      </div>
      <div className="filters">
        <input className="search" placeholder="Search name, town, owner, phone" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={county} onChange={(e) => setCounty(e.target.value)} aria-label="County">
          <option value="">All counties</option>
          {counties.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select value={industry} onChange={(e) => setIndustry(e.target.value)} aria-label="Industry">
          <option value="">All industries</option>
          {industries.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Call status">
          <option value="">Any status</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select value={concept} onChange={(e) => setConcept(e.target.value)} aria-label="Homepage concept">
          <option value="">Concept: any</option>
          <option value="yes">Concept built</option>
          <option value="no">No concept yet</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Sort">
          <option value="fit">Sort: fit</option>
          <option value="business">Sort: name</option>
          <option value="next">Sort: next call</option>
          <option value="attempts">Sort: most attempts</option>
        </select>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Business</th>
              <th>Fit</th>
              <th>Town</th>
              <th>Phone</th>
              <th>Outreach</th>
              <th>Calls</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p._id} onClick={() => setOpenId(p._id)} className={openId === p._id ? "is-open" : ""}>
                <td>
                  <strong>{p.business}</strong>
                  <div className="muted small">
                    {p.industry}
                    {p.conceptBuilt && <span className="tag-lime"> · concept built</span>}
                  </div>
                </td>
                <td>
                  <span className={`badge fit-${p.fit.toLowerCase() || "none"}`}>{p.fit || "?"}</span>
                </td>
                <td>{p.town}</td>
                <td className="nowrap">{p.phone}</td>
                <td className="small">{hasPriorTouch(p) ? p.sheetStatus : <span className="muted">None</span>}</td>
                <td>{p.attempts}</td>
                <td className="small">
                  {STATUS_LABEL[p.callStatus]}
                  {p.callStatus === "callback" && <div className="muted">{relative(p.nextCallAt)}</div>}
                </td>
                <td>
                  <button
                    className="btn btn-small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCall(p._id);
                    }}
                    disabled={!p.phone}
                  >
                    Call now
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open && <ProspectDrawer p={open} onClose={() => setOpenId(null)} onCall={() => onCall(open._id)} />}
      {adding && <AddProspect onClose={() => setAdding(false)} counties={counties} industries={industries} />}
    </div>
  );
}

export function ProspectDrawer({ p, onClose, onCall }: { p: Doc<"prospects">; onClose: () => void; onCall: () => void }) {
  const key = useKey();
  const update = useMutation(api.prospects.update);
  const history = useQuery(api.calls.forProspect, { key, prospectId: p._id });
  const meetings = useQuery(api.meetings.forProspect, { key, prospectId: p._id });
  const [draft, setDraft] = useState({
    ownerName: p.ownerName,
    phone: p.phone,
    email: p.email,
    website: p.website,
    facebook: p.facebook,
    conceptBuilt: p.conceptBuilt,
    conceptUrl: p.conceptUrl,
    fit: p.fit,
    callStatus: p.callStatus,
    nextCallAt: p.nextCallAt ? toLocalInput(p.nextCallAt) : "",
    callNotes: p.callNotes,
    sheetStatus: p.sheetStatus,
    dateSent: p.dateSent,
    firstChannel: p.firstChannel,
    followUpDue: p.followUpDue,
    switchChannelOn: p.switchChannelOn,
    secondChannel: p.secondChannel,
    sheetNotes: p.sheetNotes,
  });
  const [saved, setSaved] = useState(false);

  // Keep the outreach fields in step when they're logged with the one-click buttons
  useEffect(() => {
    setDraft((d) => ({
      ...d,
      sheetStatus: p.sheetStatus,
      dateSent: p.dateSent,
      firstChannel: p.firstChannel,
      followUpDue: p.followUpDue,
      switchChannelOn: p.switchChannelOn,
      secondChannel: p.secondChannel,
      sheetNotes: p.sheetNotes,
    }));
  }, [p.sheetStatus, p.dateSent, p.firstChannel, p.followUpDue, p.switchChannelOn, p.secondChannel, p.sheetNotes]);

  async function save() {
    await update({
      key,
      id: p._id,
      patch: {
        ownerName: draft.ownerName.trim(),
        phone: draft.phone.trim(),
        email: draft.email.trim(),
        website: draft.website.trim(),
        facebook: draft.facebook.trim(),
        conceptBuilt: draft.conceptBuilt,
        conceptUrl: draft.conceptUrl.trim(),
        fit: draft.fit,
        callStatus: draft.callStatus,
        nextCallAt: draft.nextCallAt ? fromLocalInput(draft.nextCallAt) : 0,
        callNotes: draft.callNotes,
        sheetStatus: draft.sheetStatus.trim(),
        dateSent: draft.dateSent.trim(),
        firstChannel: draft.firstChannel.trim(),
        followUpDue: draft.followUpDue.trim(),
        switchChannelOn: draft.switchChannelOn.trim(),
        secondChannel: draft.secondChannel.trim(),
        sheetNotes: draft.sheetNotes,
      },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <Modal title={p.business} onClose={onClose} size="xl">
      <div className="drawer-meta">
        <div className="badges">
          <span className={`badge fit-${p.fit.toLowerCase() || "none"}`}>{p.fit || "No fit"}</span>
          <span className="badge">{STATUS_LABEL[p.callStatus]}</span>
          {p.conceptBuilt && <span className="badge fit-strong">Concept built</span>}
          {p.callStatus === "callback" && <span className="badge is-due">Callback {relative(p.nextCallAt)}</span>}
        </div>
        <p className="muted">
          {[p.industry, p.town, p.county].filter(Boolean).join(" · ")}
          {p.ownerName && ` · Ask for ${p.ownerName}`}
        </p>
      </div>
      <div className="drawer-grid">
        <div className="drawer-info">
          <PhoneBlock p={p} />
          <ProspectLinks p={p} />
          <NoteBox label="Your angle" text={p.whatToMention} lime />
          <History p={p} calls={history} meetings={meetings} />
          <NoteBox label="Notes" text={freeNotes(p.sheetNotes)} />
          <ProspectFacts p={p} />
        </div>
        <div className="drawer-edit">
          <h3 className="edit-title">Edit</h3>
          <label className="field">
            <span>Owner / ask for</span>
            <input value={draft.ownerName} placeholder="Check the Google listing reviews" onChange={(e) => setDraft({ ...draft, ownerName: e.target.value })} />
          </label>
          <label className="field">
            <span>Phone</span>
            <input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
          </label>
          <label className="field">
            <span>Email</span>
            <input value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
          </label>
          <label className="field">
            <span>Website</span>
            <input value={draft.website} placeholder="example.com" onChange={(e) => setDraft({ ...draft, website: e.target.value })} />
          </label>
          <label className="field">
            <span>Facebook (paste the page link)</span>
            <input value={draft.facebook} placeholder="https://facebook.com/…" onChange={(e) => setDraft({ ...draft, facebook: e.target.value })} />
          </label>
          <div className="grid-2">
            <label className="field">
              <span>Fit</span>
              <select value={draft.fit} onChange={(e) => setDraft({ ...draft, fit: e.target.value })}>
                {["Strong", "Good", "Lower", "Skip"].map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Call status</span>
              <select
                value={draft.callStatus}
                onChange={(e) => setDraft({ ...draft, callStatus: e.target.value as Doc<"prospects">["callStatus"] })}
              >
                {Object.entries(STATUS_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="field">
            <span>Next call (blank = any time)</span>
            <input type="datetime-local" value={draft.nextCallAt} onChange={(e) => setDraft({ ...draft, nextCallAt: e.target.value })} />
          </label>
          <label className="check">
            <input type="checkbox" checked={draft.conceptBuilt} onChange={(e) => setDraft({ ...draft, conceptBuilt: e.target.checked })} />
            Homepage concept built
          </label>
          <label className="field">
            <span>Concept link</span>
            <input value={draft.conceptUrl} placeholder="Netlify preview or screen recording" onChange={(e) => setDraft({ ...draft, conceptUrl: e.target.value })} />
          </label>
          <label className="field">
            <span>Call notes</span>
            <textarea rows={4} value={draft.callNotes} onChange={(e) => setDraft({ ...draft, callNotes: e.target.value })} />
          </label>
          <h3 className="edit-title">Outreach</h3>
          <div className="grid-2">
            <label className="field">
              <span>Status</span>
              <input list="outreach-status" value={draft.sheetStatus} onChange={(e) => setDraft({ ...draft, sheetStatus: e.target.value })} />
              <datalist id="outreach-status">
                {["Not contacted", "Emailed", "Email F1 sent", "Email F2 sent", "Email sequence done", "Messaged on Facebook", "Followed up", "Texted", "Replied", "Not right now", "Call booked", "Won", "Not interested"].map((o) => (
                  <option key={o} value={o} />
                ))}
              </datalist>
            </label>
            <label className="field">
              <span>Date sent</span>
              <input value={draft.dateSent} placeholder="Nov 20, 2026" onChange={(e) => setDraft({ ...draft, dateSent: e.target.value })} />
            </label>
            <label className="field">
              <span>First channel</span>
              <input value={draft.firstChannel} placeholder="Email or Facebook" onChange={(e) => setDraft({ ...draft, firstChannel: e.target.value })} />
            </label>
            <label className="field">
              <span>Follow-up due</span>
              <input value={draft.followUpDue} onChange={(e) => setDraft({ ...draft, followUpDue: e.target.value })} />
            </label>
            <label className="field">
              <span>Switch channel on</span>
              <input value={draft.switchChannelOn} onChange={(e) => setDraft({ ...draft, switchChannelOn: e.target.value })} />
            </label>
            <label className="field">
              <span>Second channel</span>
              <input value={draft.secondChannel} onChange={(e) => setDraft({ ...draft, secondChannel: e.target.value })} />
            </label>
          </div>
          <label className="field">
            <span>Notes</span>
            <textarea rows={4} value={draft.sheetNotes} onChange={(e) => setDraft({ ...draft, sheetNotes: e.target.value })} />
          </label>
          <div className="row gap end">
            <button className="btn btn-ghost" onClick={onCall} disabled={!p.phone}>
              Call now
            </button>
            <button className="btn btn-primary" onClick={save}>
              {saved ? "Saved" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function AddProspect({ onClose, counties, industries }: { onClose: () => void; counties: string[]; industries: string[] }) {
  const key = useKey();
  const add = useMutation(api.prospects.add);
  const [f, setF] = useState({ business: "", industry: industries[0] ?? "", town: "", county: counties[0] ?? "", phone: "", website: "", ownerName: "" });
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await add({ key, ...f });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message.replace(/^.*Uncaught ConvexError: /, "") : "Couldn't add it");
    }
  }
  return (
    <Modal title="Add a prospect" onClose={onClose}>
      <form onSubmit={submit} className="stack">
        <label className="field">
          <span>Business</span>
          <input required value={f.business} onChange={(e) => setF({ ...f, business: e.target.value })} />
        </label>
        <div className="grid-2">
          <label className="field">
            <span>Industry</span>
            <input list="industries" value={f.industry} onChange={(e) => setF({ ...f, industry: e.target.value })} />
            <datalist id="industries">
              {industries.map((i) => (
                <option key={i} value={i} />
              ))}
            </datalist>
          </label>
          <label className="field">
            <span>County</span>
            <input list="counties" value={f.county} onChange={(e) => setF({ ...f, county: e.target.value })} />
            <datalist id="counties">
              {counties.map((i) => (
                <option key={i} value={i} />
              ))}
            </datalist>
          </label>
          <label className="field">
            <span>Town</span>
            <input value={f.town} onChange={(e) => setF({ ...f, town: e.target.value })} />
          </label>
          <label className="field">
            <span>Phone</span>
            <input required value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          </label>
          <label className="field">
            <span>Website</span>
            <input value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} />
          </label>
          <label className="field">
            <span>Owner</span>
            <input value={f.ownerName} onChange={(e) => setF({ ...f, ownerName: e.target.value })} />
          </label>
        </div>
        {error && <p className="error-text">{error}</p>}
        <div className="row gap end">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary">Add</button>
        </div>
      </form>
    </Modal>
  );
}
