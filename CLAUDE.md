# Dial Room (cold-call-console)

Single-user cold calling console for Beyond Belief Web Design. See README.md for setup.

- Stack: Vite + React 19 + TypeScript, Convex backend, Netlify deploy from GitHub (`npx convex deploy --cmd 'npm run build'`).
- Auth: every Convex function takes `key` and calls `assertKey` (convex/lib.ts) against the `APP_PASSCODE` env var. Keep that on any new public function.
- Data: `prospects` (sheet columns plus app-only calling fields), `calls` (one per logged outcome, with a `prev` snapshot for undo), `meetings`, `settings`.
- Scripts live in `src/lib/script.ts` and follow the Beyond Belief Cold Call Playbook (Connor Murray's Who/Why/What, Value + Current-State, ARA/ACE). Keep the canonical wording; change only the filled-in variables.
- Copy rules: no em dashes anywhere in UI text or scripts. Callouts are tinted boxes with a label, never a colored vertical bar.
- Tests: `npm test` (convex-test for the backend in tests/backend.test.ts, plus parser and script tests). `npm run mock` previews the UI with fixtures in dev/.
