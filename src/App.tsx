import { Component, useEffect, useMemo, useState, type ReactNode } from "react";
import { useConvex, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { KeyContext, loadKey, saveKey, useKey } from "./session";
import { byDay, streak } from "./lib/stats";
import { startOfDay, ymd } from "./lib/dates";
import TodayPage from "./pages/TodayPage";
import CallPage, { type CallList } from "./pages/CallPage";
import ProspectsPage from "./pages/ProspectsPage";
import MeetingsPage from "./pages/MeetingsPage";
import StatsPage from "./pages/StatsPage";
import ImportPage from "./pages/ImportPage";
import ScriptsPage from "./pages/ScriptsPage";
import { LibraryProvider } from "./library";
import GoalRing from "./components/GoalRing";

export type Page = "today" | "call" | "prospects" | "meetings" | "scripts" | "stats" | "import";
const PAGES: { id: Page; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "call", label: "Call" },
  { id: "prospects", label: "Prospects" },
  { id: "meetings", label: "Meetings" },
  { id: "scripts", label: "Scripts" },
  { id: "stats", label: "Stats" },
  { id: "import", label: "Import" },
];

function pageFromHash(): Page {
  const h = window.location.hash.replace("#", "");
  return (PAGES.find((p) => p.id === h)?.id ?? "today") as Page;
}

export default function App() {
  const [key, setKey] = useState(loadKey);
  const [verified, setVerified] = useState(false);
  const convex = useConvex();

  useEffect(() => {
    let cancelled = false;
    if (!key) return;
    convex
      .query(api.settings.check, { key })
      .then((r) => {
        if (cancelled) return;
        if (r.ok) setVerified(true);
        else {
          saveKey("");
          setKey("");
        }
      })
      .catch(() => {
        // Offline or deployment hiccup: let the login screen show the error
        if (!cancelled) setVerified(false);
      });
    return () => {
      cancelled = true;
    };
  }, [key, convex]);

  if (!key || !verified) {
    return (
      <Login
        onDone={(k) => {
          saveKey(k);
          setKey(k);
          setVerified(true);
        }}
        checking={!!key && !verified}
      />
    );
  }

  return (
    <KeyContext.Provider value={key}>
      <ErrorBoundary
        onSignOut={() => {
          saveKey("");
          setKey("");
          setVerified(false);
        }}
      >
        <LibraryProvider>
          <Shell
            onSignOut={() => {
              saveKey("");
              setKey("");
              setVerified(false);
            }}
          />
        </LibraryProvider>
      </ErrorBoundary>
    </KeyContext.Provider>
  );
}

function Login({ onDone, checking }: { onDone: (k: string) => void; checking: boolean }) {
  const convex = useConvex();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await convex.query(api.settings.check, { key: code.trim() });
      if (!r.configured) setError("No access code is set on this deployment yet. Run: npx convex env set APP_PASSCODE <code>");
      else if (!r.ok) setError("That code didn't work.");
      else onDone(code.trim());
    } catch {
      setError("Couldn't reach the database. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="center-screen">
      <form className="login-card" onSubmit={submit}>
        <p className="eyebrow">Beyond Belief Web Design</p>
        <h1 className="brand-big">Dial Room</h1>
        <p className="muted">Book the meeting. Not the sale.</p>
        {checking ? (
          <p className="muted">Checking your code…</p>
        ) : (
          <>
            <label className="field">
              <span>Access code</span>
              <input
                type="password"
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoComplete="current-password"
              />
            </label>
            {error && <p className="error-text">{error}</p>}
            <button className="btn btn-primary btn-block" disabled={busy || !code.trim()}>
              {busy ? "Checking…" : "Let's dial"}
            </button>
          </>
        )}
      </form>
    </div>
  );
}

function Shell({ onSignOut }: { onSignOut: () => void }) {
  const key = useKey();
  const [page, setPage] = useState<Page>(pageFromHash);
  const [pinned, setPinned] = useState<Id<"prospects"> | null>(null);
  // Today's call list, kept for the day so a reload doesn't lose your place
  const listKey = `dialroom.callList.${ymd(new Date())}`;
  const [callList, setCallListState] = useState<CallList | null>(() => {
    try {
      return JSON.parse(localStorage.getItem(listKey) ?? "null");
    } catch {
      return null;
    }
  });
  function setCallList(next: CallList | null) {
    setCallListState(next);
    try {
      if (next) localStorage.setItem(listKey, JSON.stringify(next));
      else localStorage.removeItem(listKey);
    } catch {
      /* not critical */
    }
  }

  useEffect(() => {
    const onHash = () => setPage(pageFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  function go(p: Page) {
    window.location.hash = p;
    setPage(p);
  }

  // Header stats: today plus enough history for the streak
  const since = useMemo(() => startOfDay(new Date(Date.now() - 60 * 86400000)).getTime(), []);
  const calls = useQuery(api.calls.since, { key, since });
  const settings = useQuery(api.settings.get, { key });
  const goal = settings?.dailyGoal ?? 15;
  const days = useMemo(() => byDay(calls ?? []), [calls]);
  const today = days.get(ymd(new Date()));
  const run = useMemo(() => streak(days, goal), [days, goal]);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden>
            <svg viewBox="0 0 64 64" width="26" height="26">
              <path d="M22 18c2 0 4 5 4 7s-3 3-3 5c1 4 6 9 10 10 2 0 3-3 5-3s7 2 7 4c0 3-3 6-6 6-11 0-21-10-21-21 0-3 2-8 4-8z" fill="currentColor" />
            </svg>
          </span>
          <span className="brand-name">Dial Room</span>
        </div>
        <nav className="tabs" aria-label="Sections">
          {PAGES.map((p) => (
            <button key={p.id} className={`tab ${page === p.id ? "is-active" : ""}`} onClick={() => go(p.id)}>
              {p.label}
            </button>
          ))}
        </nav>
        <div className="today">
          <GoalRing value={today?.dials ?? 0} goal={goal} />
          <div className="today-stat">
            <strong>{today?.conversations ?? 0}</strong>
            <span>convos</span>
          </div>
          <div className="today-stat">
            <strong className={today?.booked ? "lime" : ""}>{today?.booked ?? 0}</strong>
            <span>booked</span>
          </div>
          <div className="today-stat" title="Days in a row hitting your dial goal (weekends don't count against you)">
            <strong>{run}</strong>
            <span>day streak</span>
          </div>
          <button className="btn btn-ghost btn-small" onClick={onSignOut} title="Sign out">
            Sign out
          </button>
        </div>
      </header>
      <main className="main">
        {page === "today" && (
          <TodayPage
            todayDials={today?.dials ?? 0}
            goal={goal}
            onCall={(id) => {
              setPinned(id);
              go("call");
            }}
            onStartList={(ids) => {
              setPinned(null);
              setCallList({ ids, done: [] });
              go("call");
            }}
          />
        )}
        {page === "call" && (
          <CallPage
            pinned={pinned}
            clearPinned={() => setPinned(null)}
            goal={goal}
            todayDials={today?.dials ?? 0}
            callList={callList}
            onListProgress={(id, done) => {
              if (!callList) return;
              const rest = callList.done.filter((x) => x !== id);
              setCallList({ ...callList, done: done ? [...rest, id] : rest });
            }}
            onExitList={() => setCallList(null)}
          />
        )}
        {page === "prospects" && (
          <ProspectsPage
            onCall={(id) => {
              setPinned(id);
              go("call");
            }}
          />
        )}
        {page === "meetings" && <MeetingsPage />}
        {page === "scripts" && <ScriptsPage />}
        {page === "stats" && <StatsPage calls={calls ?? []} goal={goal} />}
        {page === "import" && <ImportPage />}
      </main>
    </div>
  );
}

class ErrorBoundary extends Component<{ children: ReactNode; onSignOut: () => void }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (!this.state.error) return this.props.children;
    const wrongCode = /Wrong access code/.test(this.state.error.message);
    return (
      <div className="center-screen">
        <div className="login-card">
          <h1 className="brand-big">Hang on</h1>
          <p className="muted">{wrongCode ? "Your access code changed. Sign in again." : this.state.error.message}</p>
          <div className="row gap">
            <button className="btn btn-primary" onClick={() => window.location.reload()}>
              Reload
            </button>
            <button className="btn btn-ghost" onClick={this.props.onSignOut}>
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }
}
