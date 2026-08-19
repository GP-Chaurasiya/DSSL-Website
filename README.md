# DSSPL Website

Official website and live-scoring platform for **DSSL — Dev Sanskriti School League**, an inter-Mandal sports tournament. The repository is named `DSSPL-Website` and the current edition is branded **DSSL 2026**.

The project is a single Express server that serves the public marketing/results pages, a role-based admin dashboard, a real-time scoreboard app, and a registration analytics dashboard — all backed by PostgreSQL via Prisma and pushed live over Socket.IO.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [NPM Scripts](#npm-scripts)
- [Project Structure](#project-structure)
- [Application Routes](#application-routes)
- [User Roles](#user-roles)
- [API Reference](#api-reference)
- [Real-Time Events](#real-time-events)
- [Data Model](#data-model)
- [Google Sheets Integration](#google-sheets-integration)
- [File Uploads](#file-uploads)
- [Deployment](#deployment)
- [Bundled Sub-Projects](#bundled-sub-projects)
- [Troubleshooting](#troubleshooting)

---

## Features

- **Public site** — home, sports, schedule, results, leaderboard, medal tally, mandals, gallery, and about pages.
- **Live scoreboard** — a single-page app under `/scoreboard` that receives score, timer, and status updates instantly via WebSockets.
- **Role-based admin dashboard** — create/edit matches, control the match clock, update scores, publish news, and manage media at `/admin`.
- **Registration analytics** — dashboards for mandal, gender, course, semester, and sport distribution, plus registration trends and CSV export at `/analytics`.
- **Google Sheets sync** — reads 19 per-sport registration tabs live for player counts and can bulk-import them into the database.
- **Media library** — image/video uploads with automatic image optimisation (Sharp) and HTTP range support for video seeking.
- **Site-wide notifications** — toast notifications driven by the same Socket.IO stream (`notifications.js` / `notifications.css`).
- **Registration toggles** — master and per-sport registration switches, editable from the admin UI.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Runtime | Node.js 22 (tested on v22.19.0) |
| Server | Express 4, `compression` |
| Realtime | Socket.IO 4 (with per-message deflate) |
| Database | PostgreSQL via Prisma 5 (`@prisma/client`) |
| Auth | JSON Web Tokens (`jsonwebtoken`) + `bcryptjs` password hashing |
| Uploads | `multer` (disk storage) + `sharp` (image optimisation) |
| Frontend | Vanilla HTML/CSS/JS for the public pages, `/admin`, and `/analytics`; prebuilt Vite bundles for `/scoreboard` and `/register` |
| Config | `dotenv` |

## Getting Started

### Prerequisites

- Node.js **18+** (22.x recommended)
- A PostgreSQL database (local or hosted, e.g. Supabase/Neon)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/GP-Chaurasiya/DSSPL-Website.git
cd DSSPL-Website

# 2. Install dependencies
npm install

# 3. Create a .env file in the project root (see Environment Variables below)

# 4. Generate the Prisma client
npx prisma generate

# 5. Push the schema to your database
npx prisma db push

# 6. Seed the 7 Mandals and the default admin users
node prisma/seed.js

# 7. Start the server
npm start
```

The site is then available at **http://localhost:3000**.

### Default Seeded Accounts

`prisma/seed.js` creates one account per role, each with a well-known development password defined in that file.

| Username | Role |
| --- | --- |
| `admin` | `SUPER_ADMIN` |
| `organiser` | `ORGANISER_TEAM` |
| `creator` | `CREATOR_TEAM` |
| `media` | `MEDIA_TEAM` |

> ⚠️ These are development credentials only. Change every password (and set a real `JWT_SECRET`) before exposing the site publicly.

## Environment Variables

Create a `.env` file in the project root:

```env
# PostgreSQL connection string used by the Prisma client (pooled connection is fine)
DATABASE_URL="postgresql://user:password@host:5432/dsspl"

# Direct (non-pooled) connection, used by Prisma for migrations
DIRECT_URL="postgresql://user:password@host:5432/dsspl"

# Secret used to sign JWTs — set a long random value in production
JWT_SECRET="replace-with-a-long-random-secret"

# Port the Express server listens on (defaults to 3000)
PORT=3000
```

> ⚠️ `server.js` falls back to a hard-coded development `JWT_SECRET` if the variable is missing. Always set `JWT_SECRET` explicitly in production.

## NPM Scripts

| Command | Description |
| --- | --- |
| `npm start` | Start the Express + Socket.IO server |
| `npm run dev` | Same as `start` (no watcher configured) |
| `npm run build` | Runs `prisma generate` — used by the hosting platform's build step |

### Additional Utilities

| Command | Description |
| --- | --- |
| `node prisma/seed.js` | Seed the 7 Mandals and the four default role accounts |
| `node api-health-check.js` | Ping every public API route against `http://127.0.0.1:3000` and print status codes |
| `check-api.cmd` | Windows shortcut for the health check above |
| `npx prisma studio` | Browse and edit the database in a GUI |
| `npx prisma db push` | Sync `schema.prisma` to the database without migrations |
| `add_notif.ps1` | One-off PowerShell script that injected the notification assets into each HTML page (contains a hard-coded absolute path to the nested `DSSPL Website/` folder, so it needs editing before re-use) |

## Project Structure

```
.
├── server.js                   # Express app: all APIs, static hosting, Socket.IO
├── analytics-routes.js         # Player + analytics API routes (mounted by server.js)
├── prisma/
│   ├── schema.prisma           # PostgreSQL data model
│   ├── seed.js                 # Mandal + admin user seeding
│   ├── planned-match.sql       # Raw SQL helper for the PlannedMatch table
│   └── dev.db                  # Unused SQLite leftover (the datasource is PostgreSQL)
│
├── index.html                  # Public pages
├── sports.html · schedule.html · results.html · leaderboard.html
├── mandals.html · match-details.html · gallery.html · about.html
├── index.css                   # Shared site styles
├── notifications.js/.css       # Socket.IO-driven toast notifications
├── register-popup.js           # Registration call-to-action modal
├── sheet-sync.js               # Browser-side live Mandal player counts from Google Sheets
│
├── admin/                      # Role-based admin dashboard (login.html, index.html, admin.js)
├── scoreboard/                 # Prebuilt live scoreboard SPA
├── analytics/                  # Registration analytics dashboard (plain HTML/JS)
├── register/                   # Prebuilt registration SPA
│
├── uploads/                    # Uploaded media (created at runtime, git-ignored)
├── images/ · favicon/          # Static assets
├── *.png / *.jpg               # Mandal logos and banners
│
├── events.json                 # Static fallback fixtures
├── results.json                # Static fallback results
├── live-score.json             # Static fallback live score
├── registration_settings.json  # Persisted registration on/off toggles
└── vercel.json                 # Hosting config (clean URLs)
```

## Application Routes

| Path | Description |
| --- | --- |
| `/` | Public home page |
| `/sports.html`, `/schedule.html`, `/results.html`, `/leaderboard.html`, `/mandals.html`, `/match-details.html`, `/gallery.html`, `/about.html` | Public pages |
| `/admin` | Admin dashboard (login required) |
| `/scoreboard/*` | Live scoreboard SPA (client-side routing fallback) |
| `/analytics/*` | Analytics dashboard (unmatched paths fall back to `analytics/index.html`) |
| `/register` | Player/team registration app |
| `/uploads/*` | Uploaded media, served with `Accept-Ranges` for video seeking |

## User Roles

Access is enforced by the `authenticateToken` + `requireRole` middleware pair in `server.js`.

| Role | Capabilities |
| --- | --- |
| `SUPER_ADMIN` | Full access, including all delete operations |
| `ORGANISER_TEAM` | Create/update matches, scores, timers, mandals, players, analytics, registration settings |
| `CREATOR_TEAM` | Upload and delete gallery media |
| `MEDIA_TEAM` | Create and delete news posts |

Authenticate with `POST /api/auth/login`, then send the returned token as `Authorization: Bearer <token>`. Tokens expire after 7 days.

## API Reference

All responses are JSON. 🔒 marks routes that require a bearer token.

### Auth

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/api/auth/login` | Public | Exchange `{ username, password }` for a JWT |
| `GET` | `/api/auth/me` | 🔒 Any | Return the decoded token payload |

### Mandals (Teams)

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/api/mandals` | Public | List all Mandals (falls back to 7 defaults if the table is empty) |
| `POST` | `/api/mandals` | 🔒 Super Admin, Organiser | Create a Mandal |

### Matches

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/api/matches` | Public | All matches, newest first |
| `GET` | `/api/matches/live` | Public | Matches with status `live` |
| `GET` | `/api/matches/upcoming?limit=10` | Public | Scheduled matches |
| `GET` | `/api/matches/recent?limit=5` | Public | Completed matches |
| `GET` | `/api/matches/stats` | Public | Counts by status plus today's total |
| `GET` | `/api/matches/:id` | Public | A single match |
| `POST` | `/api/matches` | 🔒 Super Admin, Organiser | Create a match (`isLive: true` starts it immediately) |
| `PATCH` | `/api/matches/:id` | 🔒 Super Admin, Organiser | Update arbitrary match fields |
| `DELETE` | `/api/matches/:id` | 🔒 Super Admin | Delete a match |
| `POST` | `/api/matches/:id/score` | 🔒 Super Admin, Organiser | Adjust a score with `{ side: "A" \| "B", delta }` |
| `POST` | `/api/matches/:id/status` | 🔒 Super Admin, Organiser | `live`, `paused`, `completed`, `scheduled`, or `reset_timer` |
| `POST` | `/api/matches/:id/cricket` | 🔒 Super Admin, Organiser | Update overs, wickets, batsman, bowler, run rate, result, banner |

### Planned Matches (Fixtures)

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/api/planned-matches` | Public | Scheduled fixtures ordered by start time |
| `POST` | `/api/planned-matches` | 🔒 Super Admin, Organiser | Create a fixture |
| `DELETE` | `/api/planned-matches/:id` | 🔒 Super Admin | Delete a fixture |

### Standings

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/api/leaderboard` | Public | Points table (win = 3, draw = 1) with win percentage |
| `GET` | `/api/medals` | Public | Gold/silver/bronze tally derived from completed matches |

### News

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/api/news` | Public | All posts with author usernames |
| `POST` | `/api/news` | 🔒 Super Admin, Media | Create a post |
| `DELETE` | `/api/news/:id` | 🔒 Super Admin, Media | Delete a post |

### Media

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/api/media` | Public | List media metadata (binary excluded) |
| `GET` | `/api/media/file/:id` | Public | Stream a media file, with graceful logo/banner fallback |
| `POST` | `/api/upload` | 🔒 Any | General-purpose single-file upload (`file` field) |
| `POST` | `/api/media/upload` | 🔒 Super Admin, Creator | Upload to the gallery |
| `DELETE` | `/api/media/:id` | 🔒 Super Admin, Creator | Delete a media record |

### Players

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/api/players/register` | 🔒 Super Admin, Organiser | Register one player or a `players[]` batch |
| `GET` | `/api/players` | 🔒 Super Admin, Organiser | Paginated, filterable list (`mandal`, `course`, `semester`, `gender`, `sport`, `search`, `page`, `limit`) |
| `GET` | `/api/players/:id` | 🔒 Super Admin, Organiser | A single player |

### Analytics

All analytics routes require Super Admin or Organiser.

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/analytics/overview` | Live totals read straight from the Google Sheet, plus DB match counts |
| `GET` | `/api/analytics/mandal-distribution` | Registrations per Mandal |
| `GET` | `/api/analytics/gender-distribution` | Registrations per gender |
| `GET` | `/api/analytics/course-distribution` | Registrations per course |
| `GET` | `/api/analytics/semester-distribution` | Registrations per semester |
| `GET` | `/api/analytics/sport-distribution` | Registrations per sport |
| `GET` | `/api/analytics/registration-trend?days=30` | Daily registration counts (max 90 days) |
| `GET` | `/api/analytics/cross/mandal-gender` | Mandal × gender cross-tab |
| `GET` | `/api/analytics/team-stats` | Per-Mandal record, points, and player count |
| `GET` | `/api/analytics/export` | CSV export of up to 5,000 filtered players |
| `POST` | `/api/admin/import-sheets` | Bulk upsert players from all 19 Google Sheet sport tabs |

### Registration Settings

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/api/settings/registration` | Public | Current master and per-sport toggles |
| `POST` | `/api/settings/registration` | 🔒 Super Admin, Organiser | Update toggles (persisted to `registration_settings.json`) |

## Real-Time Events

The server broadcasts these Socket.IO events to every connected client:

| Event | Payload | Emitted when |
| --- | --- | --- |
| `matchUpdate` | Serialized match | A match is created, updated, scored, or its status/timer changes |
| `matchDelete` | Match ID (string) | A match is deleted |
| `plannedMatchUpdate` | Serialized fixture | A fixture is created |
| `plannedMatchDelete` | Fixture ID (string) | A fixture is deleted |
| `newsUpdate` | News post | A post is published |
| `newsDelete` | Post ID | A post is deleted |
| `mediaUpdate` | Media record (or empty) | Media is uploaded or deleted |
| `registrationSettingsUpdate` | Settings object | Registration toggles change |

Client usage:

```html
<script src="/socket.io/socket.io.js"></script>
<script>
  const socket = io();
  socket.on("matchUpdate", (match) => console.log(match.scoreA, match.scoreB));
</script>
```

Serialized matches convert IDs to strings, expose `duration` (from `durationMinutes`), return timestamps as epoch milliseconds, and always include hydrated `dalA`/`dalB` team objects.

## Data Model

Defined in `prisma/schema.prisma`:

- **User** — admin accounts (`username`, `passwordHash`, `role`).
- **Mandal** — the 7 competing teams, each with a colour, abbreviation, and logo.
- **Player** — registrations, keyed by a unique `scholarNo`, optionally linked to a Mandal.
- **Match** — a live/completed match with scores, a server-authoritative timer (`elapsedSeconds`, `timerRunning`, `timerStartedAt`), and cricket-specific fields.
- **PlannedMatch** — a scheduled fixture without live scoring state.
- **Media** — gallery images and videos (URL on disk, optional inline `Bytes`).
- **NewsPost** — announcements linked to an author.
- **RegistrationSettings** — a table for the registration toggles that is currently unused; the live toggles are read from and written to `registration_settings.json`.

The seven Mandals are: **Vashishta, Vishwamitra, Atrey, Gautam, Bharadwaj, Jamdagni, and Kashyap.**

## Google Sheets Integration

Registrations are collected in a Google Sheet with one tab per sport (Chess, Table Tennis, Badminton, Basketball, Volleyball, Football, Cricket, Kho Kho, Tug Of War, Relay Race, Athletics 100/200/400 m, Long Jump, High Jump, Javelin Throw, Discus Throw, Shot Put, 7 Stones).

- **`sheet-sync.js`** runs in the browser, reads every tab through the Google Visualization API, tallies players per Mandal, updates the `#<mandal>-count` elements, refreshes every 10 seconds, and dispatches a `dsslPlayerCountsUpdated` event. Call `window.refreshDsslPlayerCounts()` to force a refresh.
- **`GET /api/analytics/overview`** performs the same read server-side for live totals.
- **`POST /api/admin/import-sheets`** upserts every row into the `Player` table, using the tab name as the player's sport.

The sheet ID and tab list are currently hard-coded in `sheet-sync.js` and `analytics-routes.js` — update both places if the sheet changes.

## File Uploads

- Files land in `uploads/` with a timestamped unique filename; the directory is created on boot.
- The limit is generous (50 GB) to accommodate long match videos.
- Images are resized to fit within 1920×1080 by Sharp; failures fall back to the original file.
- `/uploads` is registered **before** the compression middleware so HTTP range requests (video seeking) keep working.
- Missing files degrade gracefully to `dssl_banner.jpg`, then `DSSL_LOGO.png`, instead of a hard 404.

## Deployment

`vercel.json` enables clean URLs. On any Node host:

1. Set `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, and `PORT`.
2. Build with `npm run build` (runs `prisma generate`).
3. Start with `npm start`.

Notes for production:

- Replace the seeded passwords and set a strong `JWT_SECRET`.
- `Access-Control-Allow-Origin` is currently `*` — tighten it if the API should not be public.
- Static assets are served with `no-store` for instant updates during development; enable caching for production traffic.
- `uploads/` is local disk, so use persistent storage or an object store on ephemeral platforms.

## Bundled Sub-Projects

Several related repositories are checked in alongside the main site:

| Folder | Purpose |
| --- | --- |
| `Dssl-Analytics-main/` | Standalone analytics server (port 4000) with its own Prisma schema and sheet importer; its `index.html` + `analytics.js` are the source of the `analytics/` dashboard |
| `Scoreboard-main/Scoreboard/` | Source project for the scoreboard app (Vite frontend + backend API) |
| `SRS-main/` | Sports Registration System — React + Vite + Tailwind registration front end |
| `DSSPL Website/` | Nested snapshot of this project |
| `DSSPL Website.worktrees/` | Git worktrees from earlier feature branches |

`scoreboard/` and `register/` contain the compiled Vite output of `Scoreboard-main/` and `SRS-main/`, while `analytics/` is a direct copy of the plain HTML/JS dashboard from `Dssl-Analytics-main/`.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Port 3000 is already in use` | Stop the other process or set a different `PORT` in `.env` |
| Prisma errors on start | Run `npx prisma generate`, then `npx prisma db push` |
| Empty leaderboard or mandal list | Run `node prisma/seed.js` |
| Player counts stuck at 0 | Confirm the Google Sheet is shared publicly and the tab names match the list in `sheet-sync.js` |
| Videos won't seek | Ensure the `/uploads` static handler stays registered before `compression()` |
| `401 Access token required` | Log in again — tokens expire after 7 days |

Run `node api-health-check.js` (with the server running) to verify every public endpoint at once.

---

## License

No license file is currently present in this repository.
