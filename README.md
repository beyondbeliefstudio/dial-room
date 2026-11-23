# Dial Room

Beyond Belief's cold calling console. Hit Next, a prospect pops up with their info, your angle, past outreach, and the right Connor Murray script already filled in for them. Log the outcome with one key and the next one loads.

Stack: Vite + React + TypeScript, Convex for the database and backend, Netlify for hosting (deployed from GitHub).

## First-time setup (about 10 minutes)

```bash
cd ~/Documents/Sites/cold-call-console  # repo: beyondbeliefstudio/dial-room
npm install
npx convex dev
```

`npx convex dev` asks you to log in (same Convex account as Village) and set up a project. Choose **create a new project** and name it `cold-call-console`. It writes `.env.local` with your `VITE_CONVEX_URL` and pushes the backend functions. Once it says the functions are ready, press Ctrl+C.

Then pick an access code (it's the app's password) and set it:

```bash
npx convex env set APP_PASSCODE "pick-something-long"
npm run dev
```

Open http://localhost:5173 and enter the code.

## Importing prospects

Each county prospect sheet has an **All prospects** tab that stacks every industry tab and stays up to date as you add rows.

1. Open the sheet, go to **All prospects**, click the top-left corner box of the grid, and press ⌘C.
2. In Dial Room, go to **Import**, pick the county, paste, and import.

Re-importing is safe. Existing businesses get their sheet columns refreshed, and your call data (attempts, notes, owner names, concept links) is never overwritten.

## Deploying (GitHub, then Netlify)

Repo: `beyondbeliefstudio/dial-room` (private). Netlify builds every push to `main` with
`npx convex deploy --cmd 'npm run build'`, which pushes the Convex functions to the
**production** deployment and then builds the site pointed at it. No dev server needed.

One-time setup:

1. Convex dashboard → dial-room → **Production** → Settings → **Generate Production Deploy Key**.
2. Production has its own settings. Set them from this folder:
   ```bash
   npx convex env set APP_PASSCODE "your-code" --prod
   npx convex env set OPENAI_API_KEY "sk-..." --prod
   npx convex env set ANTHROPIC_API_KEY "sk-ant-..." --prod
   ```
3. Copy your data from dev to production (prospects, calls, touches, meetings, scripts, settings):
   ```bash
   npx convex export --path dialroom-dev.zip
   npx convex import --prod --replace-all dialroom-dev.zip
   rm dialroom-dev.zip
   ```
4. Netlify → Add new project → Import an existing project → GitHub → `dial-room`. Build settings
   come from `netlify.toml`. Add the environment variable `CONVEX_DEPLOY_KEY` (from step 1),
   then deploy.

Local work still uses the dev deployment (`npm run dev`), so testing never touches real data.

## Keyboard shortcuts on the Call screen

| Key | Does |
| --- | --- |
| G | Open the number in Google Voice |
| A | No answer |
| V | Voicemail |
| F | Front desk (pick callback time) |
| C | Owner asked for a call back |
| L | Not right now (check back in weeks or months) |
| X | Not interested |
| B | Booked (meeting details and calendar invite) |
| D | Do not call (never shows up again) |
| W | Bad number |
| S | Skip for this session |
| Z | Undo the last call |
| O | Objections (then 1 to 6) |
| 1, 2, 3 | Switch script |
| N | Jump to the call note |

## How the queue decides who's next

Callbacks that are due come first. After that: homepage concept built, then already got an email or Facebook message, then Strong fit over Good, then fewest attempts. Skip fits never show up, and Lower fits only show up if you tick the box. No answer or voicemail brings them back the next day, then every other day, and after 6 tries they're marked "Couldn't reach."

## Development

- `npm run dev` runs Vite and Convex together.
- `npm run mock` previews the UI with sample data and no backend.
- `npm test` runs the backend tests (in-memory Convex) and the script and parser tests.
- Thanksgiving and other holidays are skipped when the scripts and booking screen suggest days. The list is at the top of `src/lib/dates.ts`.
