# ToDo_App

A ToDo list application with a React frontend, an Express REST API, and file-backed
storage. Add, edit, delete, complete, filter, search and sort your tasks.

![Light and dark themes](docs/screenshot-light.png)

## Features

- **Full task CRUD** — create, read, update and delete tasks through a REST API.
- **Mark complete** — one click to complete or reopen, plus bulk *Complete all* and
  *Clear completed*.
- **Task details** — title, priority (low / normal / high) and an optional due date,
  all editable in place.
- **Filter, search and sort** — filter by all / active / completed, search titles and
  notes, and sort by date added, due date, priority or A–Z.
- **At-a-glance progress** — remaining count, completion bar, and overdue / due-today
  flags.
- **Modern, clean design** — responsive card layout, light and dark themes, keyboard
  accessible, with loading and empty states.
- **Durable storage** — tasks persist to a JSON file via atomic writes.

## Getting started

Requires Node.js 20 or newer.

```bash
npm install          # installs both workspaces
npm run dev          # starts the API on :4000 and the app on :5173
```

Open <http://localhost:5173>. The Vite dev server proxies `/api` to the backend, so
the browser only ever talks to one origin.

### Other commands

| Command | What it does |
| --- | --- |
| `npm test` | Runs all 61 tests (server + browser backend). |
| `npm run build` | Builds the production frontend into `client/dist`. |
| `npm run build:pages` | Builds the browser-only version for GitHub Pages. |
| `npm start` | Runs the API alone (serve `client/dist` with any static host). |

## Project layout

```
shared/model.js         Task rules used by the server AND the browser build
client/                 React frontend (Vite)
  src/App.jsx           Screen composition and app-level state
  src/api.js            Picks a backend: HTTP, or browser-only for Pages
  src/backends/         http.js (REST API) and local.js (localStorage)
  src/hooks/useTasks.js All task state and server calls
  src/components/       Composer, toolbar, list, item, stats
  src/lib/dates.js      Due-date formatting
  src/styles.css        Design tokens and component styles
server/                 Express REST API
  src/app.js            Routes, error handling, static frontend in production
  src/store.js          JSON-file repository (atomic writes) + in-memory store
  test/                 Model and HTTP tests
scripts/dev.js          Runs both services with one command
```

The API layer stays thin: every rule about what a valid task is lives in
`server/src/model.js` as pure functions, which is what makes the test suite fast and
the route handlers short.

## API

Base URL `http://localhost:4000/api`. All responses are JSON; errors take the shape
`{ "error": { "message": "…", "details": { "field": "…" } } }`.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | Liveness check. |
| `GET` | `/tasks` | List tasks. Query: `filter=all\|active\|completed`, `q=text`, `sort=created\|due\|priority\|alpha`. Returns `{ tasks, stats }`. |
| `POST` | `/tasks` | Create a task. Body: `{ title, priority?, dueDate?, notes? }`. → `201 { task }`. |
| `GET` | `/tasks/:id` | Fetch one task. |
| `PATCH` | `/tasks/:id` | Update any subset of `title`, `notes`, `priority`, `dueDate`, `completed`. |
| `DELETE` | `/tasks/:id` | Delete a task. → `204`. |
| `POST` | `/tasks/complete-all` | Body: `{ completed: boolean }`. Completes or reopens everything. |
| `POST` | `/tasks/clear-completed` | Removes every completed task. |

`stats` accompanies list responses and always describes the whole list, not the
filtered view: `{ total, completed, active, overdue, dueToday }`.

### Task shape

```json
{
  "id": "0f0c2b1e-…",
  "title": "Renew passport",
  "notes": "",
  "completed": false,
  "priority": "high",
  "dueDate": "2026-08-20",
  "createdAt": "2026-08-24T18:30:37.772Z",
  "updatedAt": "2026-08-24T18:30:37.772Z",
  "completedAt": null
}
```

Due dates are plain `YYYY-MM-DD` calendar dates so they never shift across time
zones. Send `"dueDate": null` to clear one.

### Example

```bash
curl -X POST localhost:4000/api/tasks \
  -H 'content-type: application/json' \
  -d '{"title":"Renew passport","priority":"high","dueDate":"2026-08-20"}'
```

## Deploying (getting a public URL)

There are two ways to publish this app, and they differ in where tasks are kept:

| | GitHub Pages | Render |
| --- | --- | --- |
| Runs the API | No | Yes |
| Tasks stored | In each visitor's browser | On the server, shared by everyone |
| Cost | Free | Free tier |
| Downside | Lists are per-person | Sleeps when idle; free disk resets |

For the full-stack option the Express server serves the built React app as well
as the API, so it is **one service on one URL** — no separate frontend host, no
CORS setup.

Test that locally before deploying:

```bash
npm run build     # builds the frontend into client/dist
npm start         # serves app + API together on http://localhost:4000
```

### GitHub Pages (free, no server)

GitHub Pages serves static files only — it cannot run the Express API. So the
Pages build swaps the HTTP backend for one that keeps tasks in the visitor's own
browser (`client/src/backends/local.js`). Both backends implement the same
contract and share the same task rules from `shared/model.js`, so the app behaves
identically; the difference is where tasks live.

- Each visitor gets their own list, private to their browser, and it persists.
- No cold starts, no sleeping, nothing to pay for.
- Tasks are *not* shared between people or devices. If you need one shared list,
  deploy the full-stack version instead.

To turn it on:

1. Merge this to `main`.
2. On GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Push to `main`. The workflow in `.github/workflows/deploy-pages.yml` runs the
   tests, builds, and publishes to `https://<username>.github.io/ToDo_App/`.

Renaming the repository? Update `VITE_BASE` in `client/.env.pages` to match, or
the deployed page will request its assets from the wrong path.

Build it locally to check it first:

```bash
npm run build:pages
npx serve client/dist    # or any static file server
```

### Render (free, with the real API)

`render.yaml` in this repo is a Render Blueprint, so Render configures itself:

1. Sign up at [render.com](https://render.com) with your GitHub account.
2. **New → Blueprint**, pick this repository, click **Apply**.
3. Wait for the first build (2–5 minutes). Render gives you a public address like
   `https://todo-app-xxxx.onrender.com` — that is the link to share.

Deploying by hand instead of via the blueprint? Use these settings:

| Setting | Value |
| --- | --- |
| Build command | `npm install --include=dev && npm run build` |
| Start command | `npm start` |
| Environment | Node |

**Storage on free hosting:** tasks live in a JSON file, and free plans wipe the
disk on restart and on every deploy, so tasks reset from time to time. Free
services also sleep after ~15 minutes idle, making the next visit slow to load.
For tasks that persist, attach a persistent disk (paid) or move storage to a
database — `server/src/store.js` is the only file that touches storage, and it
already defines the interface a database version would implement.

## Configuration

| Variable | Default | Used by |
| --- | --- | --- |
| `PORT` | `4000` | API listen port. |
| `TASKS_FILE` | `server/data/tasks.json` | Where tasks are stored. |
| `CLIENT_DIR` | `client/dist` | Built frontend served in production. |
| `API_URL` | `http://localhost:4000` | Backend the Vite dev server proxies to. |

## Tests

```bash
npm test
```

61 tests, run across both workspaces:

- **Server (46)** — task rules (validation, filtering, sorting, stats,
  stored-data repair) and the HTTP layer end to end (status codes, validation
  errors, 404s, bulk routes) against the real Express app.
- **Client (15)** — the browser-only backend, asserting it honours the same
  contract as the API, including rejections, 404s and surviving unusable
  storage.
