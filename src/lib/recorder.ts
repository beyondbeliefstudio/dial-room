// Records calls placed through Google Voice in the browser, as two tracks:
// your headset mic ("me") and the Google Voice tab's audio ("them").
// Share the Google Voice tab once per calling session. Each call records from
// when you hit Call (or turn recording on mid-call) until you log the outcome.

export type CallTracks = { mine: Blob; theirs: Blob; durationSec: number; heardMe: boolean; heardThem: boolean };

type Session = {
  mic: MediaStream;
  tab: MediaStream;
  audio: AudioContext;
  meters: AnalyserNode[]; // [mic, tab]
};

const SOUND = 0.006; // RMS level that counts as hearing someone (built-in mics with noise suppression run quiet)
const PICKUP_WINDOW = 15 * 60_000; // a call you dialed before turning recording on
const MIC_KEY = "dialroom.micId";

// What happened with the last call's recording, shown under the record box
export type RecStatus = { tone: "ok" | "warn" | "error" | "busy"; text: string } | null;
export type RecEvent = { at: number; text: string };

type Active = { recs: MediaRecorder[]; chunks: Blob[][]; startedAt: number };
type Store = {
  session: Session | null;
  active: Active | null;
  held: CallTracks | null; // recorded, waiting for you to log the outcome
  pendingCallAt: number | null; // Call hit while recording was off
  peaks: number[];
  meterTimer: ReturnType<typeof setInterval> | null;
  status: RecStatus;
  events: RecEvent[];
  listeners: Set<() => void>;
};

// Kept on window, not in module variables, so a dev hot reload of this file
// doesn't silently drop a live recording session.
const g = globalThis as unknown as { __dialroomRec?: Store };
const S: Store = (g.__dialroomRec ??= {
  session: null,
  active: null,
  held: null,
  pendingCallAt: null,
  peaks: [0, 0],
  meterTimer: null,
  status: null,
  events: [],
  listeners: new Set(),
});
S.held ??= null;
S.pendingCallAt ??= null;

const notify = () => S.listeners.forEach((l) => l());
export function subscribe(fn: () => void): () => void {
  S.listeners.add(fn);
  return () => S.listeners.delete(fn);
}

/** Step-by-step log of the recorder, shown on the Call screen and in the console. */
export function log(text: string): void {
  S.events = [{ at: Date.now(), text }, ...S.events].slice(0, 12);
  console.info("[Dial Room rec]", text);
  notify();
}
export function events(): RecEvent[] {
  return S.events;
}

export function getStatus(): RecStatus {
  return S.status;
}
export function setStatus(next: RecStatus): void {
  S.status = next;
  if (next) log(next.text);
  else notify();
}
export function hearing(): { me: boolean; them: boolean } {
  return { me: S.peaks[0] > SOUND, them: S.peaks[1] > SOUND };
}
/** A recorded call is waiting for its outcome to be logged. */
export function hasHeldCall(): boolean {
  return !!S.held;
}
/** You hit Call while recording was off, recently enough to still catch the rest. */
export function missedCallStart(): boolean {
  return !!S.pendingCallAt && Date.now() - S.pendingCallAt < PICKUP_WINDOW;
}

function level(a: AnalyserNode): number {
  const buf = new Float32Array(a.fftSize);
  a.getFloatTimeDomainData(buf);
  let sum = 0;
  for (const v of buf) sum += v * v;
  return Math.sqrt(sum / buf.length);
}

export type RecorderState = "off" | "ready" | "recording";
export function state(): RecorderState {
  if (!S.session) return "off";
  return S.active ? "recording" : "ready";
}

export function supported(): boolean {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getDisplayMedia && typeof MediaRecorder !== "undefined";
}

function mimeType(): string {
  for (const t of ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"]) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

// ---------- Mic choice ----------

function savedMic(): string | null {
  try {
    return localStorage.getItem(MIC_KEY);
  } catch {
    return null;
  }
}

async function openMic(deviceId: string | null): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: {
      ...(deviceId ? { deviceId: { ideal: deviceId } } : {}),
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });
}

const isBuiltIn = (label: string) => /built-in|macbook|internal/i.test(label);

export type Mic = { id: string; label: string };
/** Microphones Brave can see (names show once mic access is allowed). */
export async function mics(): Promise<Mic[]> {
  const all = await navigator.mediaDevices.enumerateDevices();
  return all
    .filter((d) => d.kind === "audioinput" && d.deviceId !== "default" && d.deviceId !== "communications")
    .map((d) => ({ id: d.deviceId, label: d.label || "Microphone" }));
}
export function currentMic(): Mic | null {
  const t = S.session?.mic.getAudioTracks()[0];
  return t ? { id: t.getSettings().deviceId ?? "", label: t.label } : null;
}

function meterFor(stream: MediaStream, ctx: AudioContext): AnalyserNode {
  const a = ctx.createAnalyser();
  a.fftSize = 1024;
  ctx.createMediaStreamSource(stream).connect(a);
  return a;
}

/** Switch microphones between calls. */
export async function setMic(id: string): Promise<void> {
  try {
    localStorage.setItem(MIC_KEY, id);
  } catch {
    /* private mode: just use it for now */
  }
  if (!S.session || S.active) return;
  const next = await openMic(id);
  S.session.mic.getTracks().forEach((t) => t.stop());
  S.session.mic = next;
  S.session.meters[0] = meterFor(next, S.session.audio);
  log(`Mic switched to ${next.getAudioTracks()[0]?.label || "the selected mic"}`);
}

// ---------- Session ----------

/** Ask for the headset mic and the Google Voice tab's audio. Throws a readable error. */
export async function startSession(): Promise<void> {
  if (S.session) return;
  if (!supported()) throw new Error("This browser can't record tab audio. Use Chrome or Brave for calling sessions.");
  let mic: MediaStream;
  try {
    mic = await openMic(savedMic());
  } catch (err) {
    log(`Mic blocked: ${err instanceof Error ? err.message : String(err)}`);
    throw new Error("Brave didn't allow the microphone. Allow it for this site (icon in the address bar) and try again.");
  }
  const micLabel = mic.getAudioTracks()[0]?.label || "unknown mic";
  log(`Mic on: ${micLabel}`);
  let display: MediaStream;
  try {
    display = await navigator.mediaDevices.getDisplayMedia({
      video: true, // browsers require video to offer tab sharing; it's dropped right away
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      // Chrome-only hints: start on the tab picker and keep this tab out of it
      preferCurrentTab: false,
      selfBrowserSurface: "exclude",
      surfaceSwitching: "include",
    } as DisplayMediaStreamOptions);
  } catch (err) {
    mic.getTracks().forEach((t) => t.stop());
    log(`Tab share canceled: ${err instanceof Error ? err.message : String(err)}`);
    throw new Error("Sharing was canceled. Pick the Google Voice tab and turn on tab audio.");
  }
  const audio = display.getAudioTracks();
  log(`Shared a tab ${audio.length ? "with" : "WITHOUT"} tab audio`);
  display.getVideoTracks().forEach((t) => t.stop());
  if (!audio.length) {
    mic.getTracks().forEach((t) => t.stop());
    display.getTracks().forEach((t) => t.stop());
    throw new Error('No tab audio came through. Share the Google Voice tab and make sure "Also share tab audio" is on.');
  }
  const tab = new MediaStream(audio);
  // If you stop sharing from the browser bar, end the session cleanly
  audio[0].addEventListener("ended", () => {
    if (S.session?.tab !== tab) return;
    void endSession("tab sharing stopped or the shared tab closed");
  });
  const ctx = new AudioContext();
  S.session = { mic, tab, audio: ctx, meters: [meterFor(mic, ctx), meterFor(tab, ctx)] };

  if (missedCallStart()) {
    startCall();
    setStatus({ tone: "ok", text: "Picked up the call you'd already dialed. Log the outcome when you hang up." });
  } else {
    setStatus({ tone: "ok", text: "Recording is on. Start each call with the Call in Google Voice button (or G)." });
  }
  if (isBuiltIn(micLabel) && (await mics()).some((m) => !isBuiltIn(m.label))) {
    log("Heads up: that's the built-in mic. Pick your headset in the Mic menu.");
  }
}

async function finishActive(): Promise<CallTracks | null> {
  const a = S.active;
  if (!a) return null;
  S.active = null;
  if (S.meterTimer) clearInterval(S.meterTimer);
  S.meterTimer = null;
  const heard = hearing();
  await Promise.all(
    a.recs.map(
      (r) =>
        new Promise<void>((resolve) => {
          if (r.state === "inactive") return resolve();
          r.onstop = () => resolve();
          r.stop();
        }),
    ),
  );
  const type = a.recs[0].mimeType || "audio/webm";
  const out = {
    mine: new Blob(a.chunks[0], { type }),
    theirs: new Blob(a.chunks[1], { type }),
    durationSec: (Date.now() - a.startedAt) / 1000,
    heardMe: heard.me,
    heardThem: heard.them,
  };
  log(
    `Call recording stopped: ${Math.round(out.durationSec)}s, you ${Math.round(out.mine.size / 1024)} KB${heard.me ? "" : " (silent)"}, them ${Math.round(out.theirs.size / 1024)} KB${heard.them ? "" : " (silent)"}`,
  );
  return out;
}

/** Turn recording off. A call in progress is kept and sent once you log its outcome. */
export async function endSession(reason = "Turn off clicked"): Promise<void> {
  if (!S.session) return;
  const session = S.session;
  const tracks = await finishActive();
  if (tracks) {
    S.held = tracks;
    log("Kept the call so far. Log the outcome to send it for review.");
  }
  session.mic.getTracks().forEach((t) => t.stop());
  session.tab.getTracks().forEach((t) => t.stop());
  void session.audio.close();
  S.session = null;
  log(`Recording off (${reason})`);
}

// ---------- Calls ----------

/** Start recording a call. If recording is off, remembers the call so turning it on picks it up. */
export function startCall(): boolean {
  if (!S.session) {
    S.pendingCallAt = Date.now();
    log("Call started while recording was off. Turn recording on now to catch the rest of it.");
    return false;
  }
  if (S.active) {
    log("Call started while a recording was already running; keeping the first one");
    return false;
  }
  if (S.held) {
    S.held = null;
    log("Dropped an earlier recording that was never logged");
  }
  S.pendingCallAt = null;
  const session = S.session;
  const type = mimeType();
  const recs = [session.mic, session.tab].map((s) => new MediaRecorder(s, type ? { mimeType: type, audioBitsPerSecond: 32000 } : undefined));
  const chunks: Blob[][] = [[], []];
  recs.forEach((r, i) => {
    r.ondataavailable = (e) => e.data.size && chunks[i].push(e.data);
    r.start(1000);
  });
  S.active = { recs, chunks, startedAt: Date.now() };
  S.peaks = [0, 0];
  if (S.meterTimer) clearInterval(S.meterTimer);
  void session.audio.resume();
  S.meterTimer = setInterval(() => {
    const before = hearing();
    session.meters.forEach((m, i) => (S.peaks[i] = Math.max(S.peaks[i], level(m))));
    const after = hearing();
    if (before.me !== after.me || before.them !== after.them) notify();
  }, 250);
  S.status = null;
  log(`Call recording started (tab audio ${session.tab.getAudioTracks()[0]?.readyState ?? "missing"})`);
  return true;
}

/** Stop the current call's recording and hand back both tracks (null if nothing was recorded). */
export async function stopCall(): Promise<CallTracks | null> {
  S.pendingCallAt = null;
  if (S.active) return finishActive();
  if (S.held) {
    const held = S.held;
    S.held = null;
    return held;
  }
  log(S.session ? "Call logged, but no call was recording (it wasn't started from Dial Room)" : "Call logged while recording was off");
  return null;
}

/** Throw away the current call's recording. */
export function discardCall(): void {
  S.pendingCallAt = null;
  if (!S.active && !S.held) return;
  if (S.active) {
    S.active.recs.forEach((r) => r.state !== "inactive" && r.stop());
    S.active = null;
    if (S.meterTimer) clearInterval(S.meterTimer);
    S.meterTimer = null;
  }
  S.held = null;
  setStatus({ tone: "warn", text: "That call's recording was thrown away." });
}

/** Record a short test clip without a call, so you can check recording and uploads on their own. */
export async function recordTest(seconds = 10): Promise<CallTracks> {
  if (!S.session) throw new Error("Start recording first.");
  if (S.active) throw new Error("A call is recording right now. Log or discard it first.");
  S.held = null;
  log(`Test: recording ${seconds} seconds. Say something, and have the shared tab play some audio.`);
  startCall();
  await new Promise((r) => setTimeout(r, seconds * 1000));
  const tracks = await finishActive();
  if (!tracks) throw new Error("The test recording was stopped early.");
  return tracks;
}
