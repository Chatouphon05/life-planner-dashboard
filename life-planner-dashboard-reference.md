# Life Planner Dashboard — Project Reference

> Authoritative reference for all Claude sessions working on this project.
> Read this file first. Do not assume — verify here.
>
> ⚠️ **Partially superseded (July 2026):** §5's Weekly Plans/Monthly Plans
> rows are retired — see `plans-to-tasks-migration.md` and
> `notion-data-mapping.md` for the current model (Review Anchor rows inside
> Weekly/Monthly Tasks power `week.priorities`/`month.theme`/`month.focus`
> now). Everything else here is still accurate.

---

## 1. Project Vision

A personal life OS dashboard that surfaces the right information at the right time.
Replaces deep Notion navigation with one beautiful, mobile-first view that makes
Lunk *want* to open it every day — even on low-energy days.

**2026 theme:** *"Becoming more stable, clearer, and braver as who I already am."*

**Core design principle:** Survive low-energy days. Frictionless to open, instant to act on.

---

## 2. Owner Context

| Field | Detail |
|---|---|
| **Name** | Lunk (Chatouphon) |
| **Location** | Brisbane, Australia (moved from Vientiane, Laos on 7 June 2026) |
| **Program** | QUT Master of Data Science, starting July 2026 |
| **Role** | BI Analyst / Data Engineer → transitioning to Data Scientist |
| **Primary workspace** | Notion |
| **Working style** | Deep single focus. Plans well, executes lightly on low-energy days |
| **Usage mode** | Phone home screen (installable PWA, not Notion embed) |

---

## 3. Live System

| Resource | URL |
|---|---|
| **Dashboard** | https://lunkystch.com (also www.lunkystch.com) — Cloudflare Pages |
| **API proxy** | https://api.lunkystch.com — Cloudflare Worker `life-planner-api` |
| **GitHub repo** | https://github.com/Chatouphon05/life-planner-dashboard |
| **Notion workspace** | https://www.notion.so/3311e53d8332812bb12de15882223821 |
| **Notion integrations** | https://www.notion.so/my-integrations |

---

## 4. Architecture

```
Phone home screen (installable PWA)
        ↓
Cloudflare Pages — React app (Vite build, base '/')
https://lunkystch.com  (auto-builds from main branch)
        ↓  GET (load)  /  POST (write-back)
Cloudflare Worker — worker.js  ("life-planner-api")
https://api.lunkystch.com  (deploy: npx wrangler deploy)
        ↓
Notion API v1 (2022-06-28)
Integration: "Life Planner Dashboard"
Token: stored ONLY as Worker secret NOTION_TOKEN — never in frontend
```

### Hosting history (why Cloudflare + custom domain)
1. **Cloudflare `.workers.dev`** (v1) — blocked by home-WiFi DNS → moved to Vercel
2. **Vercel** (May 2026) — account-level `host_not_allowed` 403 broke everything,
   unfixable from project settings → moved back to Cloudflare
3. **Cloudflare + own domain `lunkystch.com`** (June 2026, current) — custom
   domains bypass the `.workers.dev` DNS blocks. Stable on every network.

The Worker deploys via Wrangler CLI from the repo root (`worker.js` +
`wrangler.toml`). Pages auto-builds from git on every push to `main`
(build: `npm run build`, output: `dist`).

### Key constraints
- Notion embed: **does NOT work** — iframe sandbox blocks external fetch
- Notion token: **never in frontend code** — Worker secret only
  (`npx wrangler secret put NOTION_TOKEN`)
- CORS allowlist in `worker.js`: `lunkystch.com` + `www.lunkystch.com` only
- Mobile-first always; **dark theme is non-negotiable** as the default
- **Timezone:** `UTC_OFFSET_HOURS = 10` (Brisbane) in `worker.js`; cron
  `0 20 * * *` UTC = 6 AM Brisbane in `wrangler.toml`

### Performance & resilience
- **Timeouts:** each Notion query/patch aborts after 8s (Worker); client fetch
  aborts after 12s and shows "Notion is slow — pull down to retry"; drilldown
  expand aborts after 12s.
- **Cache-bust:** pull-to-refresh and drilldown append `?fresh=1`.
- **SWR cache:** localStorage key `lp-data-v2` shows cached data instantly, then
  refreshes in the background (Hero ● pulses amber while stale).
- **Cron resilience:** habit seeder uses `Promise.allSettled` + per-call
  timeouts; reports per-habit failures.
- **Error boundaries:** each tab section is wrapped so one crash doesn't
  blank the whole app.

---

## 5. Notion Databases

All connected to integration "Life Planner Dashboard". IDs live in `DB` in `worker.js`.

| Database | ID | Write-back? |
|---|---|---|
| ☀️ Daily Tasks (today's tasks + 14-day history) | `c88c5452b1224fc3a8e421c77447e063` | ✅ Done checkbox · ✅ create (quick-add) |
| 📋 Weekly Tasks | `5e77a48652b247ca99a86710e12094bb` | ✅ Status |
| 🗓️ Monthly Tasks | `0eaa802009e147e1ac04425330958f06` | ✅ Status |
| 🔁 Habits | `e00177c934234bbebbcffed9cd847b98` | ✅ Done checkbox (+ cron auto-seed) |
| ☀️ Daily Journal (mood/energy) | `f35023fab2344a4a8a71f87f6e7d9610` | ✅ Mood + Energy |
| 🎯 Goals | `bde57e266a3f43438d5913bf205c10f3` | ❌ Read only |
| 🏁 Milestones | `810fe48f4d1e494c9aa62d38bc62a316` | ❌ Read only (Status set manually in Notion) |

**Retired** (July 2026, see `plans-to-tasks-migration.md`): 📋 Weekly Plans
(`2682d573db944fcf84c08dac4acc1a02`) and 📆 Monthly Plans
(`a24a10e0ad52408ab4fdd70e2768b979`) — replaced by a Review Anchor row
(`Row Type = "Review Anchor"`) inside Weekly/Monthly Tasks per period,
which now carries `Top 3 Priorities` / `Theme` / `Focus Areas`. The legacy
standalone ✅ Tasks DB (`972a5ee5fce3470796efa210a62ffdcb`) was already dead
code (superseded by Daily Tasks) and was dropped from `worker.js`'s `DB`
map in the same change.

**Task hierarchy:** Monthly Task → Weekly Task → Daily Task (via Notion relations).
The dashboard drills down lazily: tapping a weekly/monthly task fetches its
children via `GET ?weeklyTask=<id>` or `?monthlyTask=<id>`.

### Key select fields
```
Daily Journal — Mood:   ["🚀 Amazing","😊 Good","😐 Okay","😔 Low","😴 Tired"]
Daily Journal — Energy: ["⚡ High","🔋 Medium","🪫 Low"]
Tasks — Priority:       ["🔴 High","🟡 Medium","🟢 Low"]  (also plain "High" on hierarchy tasks)
Milestones — Category:  ["Transition","Deadline","Look Forward"]; Status: Upcoming/Active/Done
```

---

## 6. Worker API (worker.js)

### GET https://api.lunkystch.com
Returns all dashboard data in one call. Shape:
```jsonc
{
  "today":  { "date": "2026-06-10", "mood": "😊 Good", "energy": "🔋 Medium", "dailyId": "..." },
  "tasks":  [{ "id", "task", "done", "priority" }],          // today's daily tasks
  "taskHistory":  [{ "date", "done", "total" }],             // 14 days
  "habits": [{ "id", "habit", "done", "category", "streak" }],
  "habitHistory": { "<habit name>": [null|0|1, ...] },       // 14 days
  "moodHistory":  [{ "date", "mood", "energy" }],            // 14 days
  "week":   { "id", "name", "priorities": [] },
  "month":  { "name", "theme", "focus" },
  "goals":  [{ "id", "name", "area", "progress", "status", "quarter" }],
  "weeklyTasks":  [...], "monthlyTasks": [...],              // current period
  "weeklyHeatmap":  [{ "week",  "done", "total", "isCurrent" }],  // 12 weeks
  "monthlyHeatmap": [{ "month", "done", "total", "isCurrent" }],  // 6 months
  "currentWeek": "W24", "currentMonth": "June",
  "milestones": [{ "id", "name", "date", "start", "category", "status" }]
}
```
`GET ?weeklyTask=<id>`  → child daily tasks
`GET ?monthlyTask=<id>` → child weekly tasks (each with their daily tasks)

### POST https://api.lunkystch.com (write-back)
`{ "type", "pageId", "value" }` — types:
`task-done`, `daily-task-done`, `habit-done` (checkbox) ·
`task-status` (Weekly/Monthly select) · `mood`, `energy` (Daily Journal select) ·
`create-task` (quick-add daily task) · `set-weekly-priorities` (Sunday Review).
Response: `{ "ok": true, "type", "pageId" }`.
POST is origin-checked against the CORS allowlist.

### Scheduled (cron `0 20 * * *` UTC = 6 AM Brisbane)
`seedHabits()` copies yesterday's habits into today (`Done=false`), streak =
`done ? streak+1 : 0`. Uses `Promise.allSettled` — one failure doesn't abort
the batch.

---

## 7. Dashboard Layout (3 tabs)

**Today** — MoodPicker (+ 14-day mood/energy strip) · TodayTasks (14-day amber
heatmap + tasks + quick-add) · HabitTracker (14-day dot grid) · Books
(now-reading card + on-deck queue, local-only — see §9)
**Plan** — WeekStatsRow (stats summary) · SundayReview (Sundays only, writes Top
3 Priorities back) · WeekPriorities · WeeklyTasks (12-week heatmap + expandable)
· MonthlyFocus · MonthlyTasks (6-month heatmap + expandable)
**Life** — Milestones (countdowns) · Goals (area groups) · TimeRemaining
(week/month/year bars) · NavGrid (6 Notion links)

**Cross-cutting:** Hero (date, mantra, active-milestone strip, city flips to
Brisbane when a Transition milestone is Done) · TabBar · pull-to-refresh ·
dark/light theme toggle · optimistic write-back with revert-on-failure ·
per-section error boundaries · 2-column grid at ≥900px desktop.

All three task heatmaps share one component (`TaskHeatmap.jsx`, types
`daily | weekly | monthly`): amber tiles, period labels, tap-a-tile for detail.

---

## 8. Design System

Colors are defined as CSS vars in `src/index.css` with hex/rgba fallbacks and
oklch overrides behind `@supports`. Dark navy palette is the default.

| Token | Dark value (oklch) |
|---|---|
| `--bg` | `oklch(0.14 0.04 240)` (navy, fallback `#080e1c`) |
| `--bg-2` / `--bg-3` | card / raised surfaces |
| `--text` | `oklch(0.94 0.014 225)` |
| `--accent` | `oklch(0.80 0.11 70)` — amber (today / now / energy) |
| `--accent2` | `oklch(0.72 0.07 150)` — sage (done / progress) |

Fonts: **Newsreader** (display/italic), **Geist** (body), **JetBrains Mono** (mono/eyebrows).
A light "parchment" theme exists via `html[data-theme="light"]`.
**Dark theme is non-negotiable** — it's core to why this feels good to open.

---

## 9. Roadmap

### ✅ Done
- Dark dashboard, live Notion data, custom domain `lunkystch.com`
- Write-back: tasks, habits, mood, energy, weekly/monthly status,
  weekly priorities, quick-add task
- **Phase A** — write-back wired in frontend (optimistic + revert)
- **Phase B** — habit tracker, mood/energy picker, milestone countdowns
- **Phase C** — full React rebuild (Vite), component architecture, deploy pipeline
- Task hierarchy (Monthly→Weekly→Daily) with lazy drilldown
- Task heatmaps (daily 14d / weekly 12w / monthly 6m), unified component
- Milestones DB with Active strip + city flip
- **PWA** — installable manifest, icon, service worker (network-first nav)
- **Resilience** — timeouts everywhere, cron allSettled, error boundaries
- **Phase D** — Sunday review (+ priorities write-back); mood/energy strip;
  weekly stats row; quick-add task; desktop 2-column grid
- **Migration** — Vercel → Cloudflare Workers + Pages on `lunkystch.com`
- **Timezone** — flipped to UTC+10 Brisbane (June 2026)

### ✅ Done (cont'd)
- **Books / reading tracker** — now-reading card (title, author, progress,
  last-opened) + on-deck queue + yearly finished/goal counter. Matches the
  Claude Design mockup's visual treatment exactly (spine card, amber accent
  bar, numbered queue). **Local-only** — persisted to `localStorage`
  (`lp-books-v1`), no Notion database backs it yet, so it doesn't sync across
  devices. Edited inline via the ✎ pencil in the section header.

### 🔲 Phase D — remaining
- Study session tracker (MDS-specific, for July 2026 start)
- Optional: back Books with a real Notion database + Worker write-back so it
  syncs across devices like everything else (would need a new DB + `worker.js`
  endpoint + manual `wrangler deploy`)

### 🔲 Backlog / ideas
- **Auth:** Cloudflare Access (Zero Trust) in front of `lunkystch.com` —
  free for 1 user, no code changes (discussed, not yet enabled)
- Month-end review card (mirrors SundayReview, last 2 days of month)
- Habit streak summary (best streak / most-missed this month)
- Offline data fallback

---

## 10. Instructions for Claude Sessions

1. **Read this file first** — don't assume current state
2. **Develop on a feature branch**, open a PR, squash-merge to `main`
   (Pages auto-deploys the frontend)
3. **Worker changes need a manual deploy** — `npx wrangler deploy` on Lunk's PC
   (changes to `worker.js` or `wrangler.toml` do NOT go live on git push)
4. **Never hardcode the Notion token** — Worker secret only
5. **Mobile-first always**; **dark theme non-negotiable**
6. **Design must survive low-energy days** — if it adds friction, reconsider
7. **Verify with `npm run build`** before pushing
8. **Ask before assuming scope** — confirm which phase/task is active

---

## 11. File Structure

```
life-planner-dashboard/
├── index.html                  # manifest + apple-touch-icon links, font preloads
├── vite.config.js              # base: '/'
├── worker.js                   # Cloudflare Worker: GET data + drilldown, POST write-back, cron seeder
├── wrangler.toml               # Worker config: name, cron 0 20 * * * (6 AM Brisbane)
├── public/
│   ├── manifest.webmanifest    # PWA: standalone, dark theme, icon (root scope)
│   ├── icon.svg                # amber "LP" monogram on navy
│   └── sw.js                   # network-first nav, SWR assets, never caches api.lunkystch.com
├── src/
│   ├── main.jsx                # mounts app + registers /sw.js
│   ├── app.jsx                 # root: theme, pull-to-refresh, tab routing, desktop grid
│   ├── index.css               # CSS vars (themes), animations
│   ├── tokens.jsx              # legacy token/atom helpers (window globals)
│   ├── hooks/
│   │   └── useNotionData.js    # SWR fetch (12s timeout), writeback, fetchExpand, getLiveDate
│   └── components/
│       ├── Primitives.jsx      # Skeleton, Bullet, SectionHeader, ProgressBar, TaskRow…
│       ├── ErrorBoundary.jsx   # per-section crash isolation
│       ├── Hero.jsx  TabBar.jsx  NavGrid.jsx
│       ├── MoodPicker.jsx      # mood/energy chips + 14-day strip
│       ├── TodayTasks.jsx  HabitTracker.jsx
│       ├── TaskHeatmap.jsx     # shared daily/weekly/monthly heatmap
│       ├── WeekStatsRow.jsx    # Plan-tab stats summary
│       ├── WeekPriorities.jsx  WeeklyTasks.jsx
│       ├── MonthlyFocus.jsx    MonthlyTasks.jsx
│       ├── Milestones.jsx  Goals.jsx  TimeRemaining.jsx  SundayReview.jsx
│       ├── Books.jsx           # now-reading + queue, local-only (localStorage)
│
└── worker-v2.js                # OLD Cloudflare Worker — gitignored, inactive
```

Removed (June 2026): `api/` (Vercel functions), `vercel.json`,
`.github/workflows/deploy.yml` (GitHub Pages deploy).

---

*Last updated: June 10, 2026*
*Active stack: Cloudflare Pages (lunkystch.com) + Cloudflare Worker (api.lunkystch.com)*
*Status: Phases A–D nearly done (study tracker remaining); timezone = Brisbane UTC+10*
