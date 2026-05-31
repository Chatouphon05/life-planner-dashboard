# Life Planner Dashboard — Project Reference

> Authoritative reference for all Claude sessions working on this project.
> Read this file first. Do not assume — verify here.

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
| **Location** | Vientiane, Laos → Brisbane, Australia (departing 7 June 2026) |
| **Program** | QUT Master of Data Science, starting July 2026 |
| **Role** | BI Analyst / Data Engineer → transitioning to Data Scientist |
| **Primary workspace** | Notion |
| **Working style** | Deep single focus. Plans well, executes lightly on low-energy days |
| **Usage mode** | Phone home screen (installable PWA, not Notion embed) |

---

## 3. Live System

| Resource | URL |
|---|---|
| **Dashboard** | https://chatouphon05.github.io/life-planner-dashboard/ |
| **API proxy** | https://life-planner-dashboard.vercel.app/api |
| **GitHub repo** | https://github.com/Chatouphon05/life-planner-dashboard |
| **Notion workspace** | https://www.notion.so/3311e53d8332812bb12de15882223821 |
| **Notion integrations** | https://www.notion.so/my-integrations |

---

## 4. Architecture

```
Phone home screen (installable PWA)
        ↓
GitHub Pages — React app (Vite build, base /life-planner-dashboard/)
        ↓  GET (load)  /  POST (write-back)
Vercel Edge Function — api/index.js
https://life-planner-dashboard.vercel.app/api
        ↓
Notion API v1 (2022-06-28)
Integration: "Life Planner Dashboard"
Token: stored ONLY in Vercel env var NOTION_TOKEN — never in frontend
```

### Why Vercel (not Cloudflare)
`.workers.dev` was blocked on iOS (same WiFi as laptop). `vercel.app` works fine,
and the env-var token is more secure. The old `worker-v2.js` is kept locally
(gitignored, has a hardcoded token) but is no longer the active proxy.

### Key constraints
- GitHub Pages: **static only** — no server-side logic
- Notion embed: **does NOT work** — iframe sandbox blocks external fetch
- Notion token: **never in frontend code** — Vercel env only
- Mobile-first always; **dark theme is non-negotiable** as the default

### Performance & resilience (added May 2026)
- **CDN micro-cache:** GET responses send `Cache-Control: s-maxage=45,
  stale-while-revalidate=120`, so repeat opens within ~45s skip Notion entirely.
- **Timeouts:** each Notion query/patch aborts after 8s (server); the client
  fetch aborts after 12s and shows "Notion is slow — pull down to retry".
- **Cache-bust:** pull-to-refresh appends `?fresh=1` to force live data.
- **SWR cache:** localStorage key `lp-data-v2` shows cached data instantly, then
  refreshes in the background (Hero ● pulses amber while stale).

---

## 5. Notion Databases

All connected to integration "Life Planner Dashboard". IDs live in `DB` in `api/index.js`.

| Database | ID | Write-back? |
|---|---|---|
| ☀️ Daily Tasks (today's tasks + 14-day history) | `c88c5452b1224fc3a8e421c77447e063` | ✅ Done checkbox |
| 📋 Weekly Tasks | `5e77a48652b247ca99a86710e12094bb` | ✅ Status |
| 🗓️ Monthly Tasks | `0eaa802009e147e1ac04425330958f06` | ✅ Status |
| 🔁 Habits | `e00177c934234bbebbcffed9cd847b98` | ✅ Done checkbox |
| ☀️ Daily Journal (mood/energy) | `f35023fab2344a4a8a71f87f6e7d9610` | ✅ Mood + Energy |
| 📋 Weekly Plans | `2682d573db944fcf84c08dac4acc1a02` | ❌ Read only |
| 📆 Monthly Plans | `a24a10e0ad52408ab4fdd70e2768b979` | ❌ Read only |
| 🎯 Goals | `bde57e266a3f43438d5913bf205c10f3` | ❌ Read only |
| 🏁 Milestones | `810fe48f4d1e494c9aa62d38bc62a316` | ❌ Read only (Status set manually in Notion) |
| ✅ Tasks (legacy standalone) | `972a5ee5fce3470796efa210a62ffdcb` | (superseded by Daily Tasks) |

**Task hierarchy:** Monthly Task → Weekly Task → Daily Task (via Notion relations).
The dashboard drills down lazily: tapping a weekly/monthly task fetches its
children via `GET /api?weeklyTask=<id>` or `?monthlyTask=<id>`.

### Key select fields
```
Daily Journal — Mood:   ["🚀 Amazing","😊 Good","😐 Okay","😔 Low","😴 Tired"]
Daily Journal — Energy: ["⚡ High","🔋 Medium","🪫 Low"]
Tasks — Priority:       ["🔴 High","🟡 Medium","🟢 Low"]  (also plain "High" on hierarchy tasks)
Milestones — Category:  ["Transition","Deadline","Look Forward"]; Status: Upcoming/Active/Done
```

---

## 6. Vercel API (api/index.js)

### GET /api
Returns all dashboard data in one call. Shape:
```jsonc
{
  "today":  { "date": "2026-05-31", "mood": "😊 Good", "energy": "🔋 Medium", "dailyId": "..." },
  "tasks":  [{ "id", "task", "done", "priority" }],          // today's daily tasks
  "taskHistory":  [{ "date", "done", "total" }],             // 14 days
  "habits": [{ "id", "habit", "done", "category", "streak" }],
  "habitHistory": { "<habit name>": [null|0|1, ...] },       // 14 days
  "moodHistory":  [{ "date", "mood", "energy" }],            // 14 days
  "week":   { "name", "priorities": [] },
  "month":  { "name", "theme", "focus" },
  "goals":  [{ "id", "name", "area", "progress", "status", "quarter" }],
  "weeklyTasks":  [...], "monthlyTasks": [...],              // current period
  "weeklyHeatmap":  [{ "week",  "done", "total", "isCurrent" }],  // 12 weeks
  "monthlyHeatmap": [{ "month", "done", "total", "isCurrent" }],  // 6 months
  "currentWeek": "W22", "currentMonth": "May",
  "milestones": [{ "id", "name", "date", "start", "category", "status" }]
}
```
`GET /api?weeklyTask=<id>`  → child daily tasks
`GET /api?monthlyTask=<id>` → child weekly tasks (each with their daily tasks)

### POST /api (write-back)
`{ "type", "pageId", "value" }` — types:
`task-done`, `daily-task-done`, `habit-done` (checkbox) ·
`task-status` (Weekly/Monthly select) · `mood`, `energy` (Daily Journal select).
Response: `{ "ok": true, "type", "pageId" }`. POST responses are not cached.

---

## 7. Dashboard Layout (3 tabs)

**Today** — MoodPicker (+ 14-day mood/energy strip) · TodayTasks (14-day amber
heatmap + tasks) · HabitTracker (14-day dot grid)
**Plan** — SundayReview (Sundays only) · WeekPriorities · WeeklyTasks (12-week
heatmap + expandable) · MonthlyFocus · MonthlyTasks (6-month heatmap + expandable)
**Life** — Milestones (countdowns) · Goals (area groups) · TimeRemaining
(week/month/year bars) · NavGrid (6 Notion links)

**Cross-cutting:** Hero (date, mantra, active-milestone strip, city flips to
Brisbane when a Transition milestone is Done) · TabBar · pull-to-refresh ·
dark/light theme toggle · optimistic write-back with revert-on-failure.

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
- Dark dashboard, GitHub Pages hosting, live Notion data
- Write-back: tasks, habits, mood, energy, weekly/monthly status
- **Phase A** — write-back wired in frontend (optimistic + revert)
- **Phase B** — habit tracker, mood/energy picker, milestone countdowns
- **Phase C** — full React rebuild (Vite), component architecture, deploy pipeline
- Task hierarchy (Monthly→Weekly→Daily) with lazy drilldown
- Task heatmaps (daily 14d / weekly 12w / monthly 6m), unified component
- Milestones DB with Active strip + city flip
- **PWA** — installable manifest, icon, service worker (network-first nav)
- **Resilience** — CDN micro-cache + 8s/12s timeouts
- **Phase D** — Sunday review prompt; 14-day mood/energy trend strip

### 🔲 Phase D — remaining
- Study session tracker (MDS-specific, for July 2026 start)

### 🔲 Backlog / ideas
- **Timezone:** `api/index.js` `laosDateStr()` hardcodes UTC+7. After 7 June
  Brisbane is UTC+10 — parameterize the offset before/after the move.
- **Sync layer (if API still feels slow):** cron mirrors Notion → fast store
  (Vercel KV); dashboard reads from cache. `api/cron.js` stub already exists.
- Quick-add task FAB · weekly-priority write-back · offline data fallback.

---

## 10. Instructions for Claude Sessions

1. **Read this file first** — don't assume current state
2. **Develop on a feature branch**, open a PR, squash-merge to `main` (deploys)
3. **Never hardcode the Notion token** — Vercel env only
4. **Mobile-first always**; **dark theme non-negotiable**
5. **Design must survive low-energy days** — if it adds friction, reconsider
6. **Verify with `npm run build`** before pushing
7. **Ask before assuming scope** — confirm which phase/task is active

---

## 11. File Structure

```
life-planner-dashboard/
├── index.html                  # manifest + apple-touch-icon links, font preloads
├── vite.config.js              # base: '/life-planner-dashboard/'
├── public/
│   ├── manifest.webmanifest    # PWA: standalone, dark theme, icon
│   ├── icon.svg                # amber "LP" monogram on navy
│   └── sw.js                   # network-first nav, SWR assets, never caches API
├── api/
│   ├── index.js                # Vercel Edge Function (GET data + drilldown, POST write-back)
│   └── cron.js                 # scheduled-job stub (204) — habit seeder / future sync
├── src/
│   ├── main.jsx                # mounts app + registers service worker
│   ├── app.jsx                 # root: theme, pull-to-refresh, tab routing
│   ├── index.css               # CSS vars (themes), animations
│   ├── tokens.jsx              # legacy token/atom helpers (window globals)
│   ├── hooks/
│   │   └── useNotionData.js    # SWR fetch (12s timeout), writeback, fetchExpand, getLiveDate
│   └── components/
│       ├── Primitives.jsx      # Skeleton, Bullet, SectionHeader, ProgressBar, TaskRow…
│       ├── Hero.jsx  TabBar.jsx  NavGrid.jsx
│       ├── MoodPicker.jsx      # mood/energy chips + 14-day strip
│       ├── TodayTasks.jsx  HabitTracker.jsx
│       ├── TaskHeatmap.jsx     # shared daily/weekly/monthly heatmap
│       ├── WeekPriorities.jsx  WeeklyTasks.jsx
│       ├── MonthlyFocus.jsx    MonthlyTasks.jsx
│       ├── Milestones.jsx  Goals.jsx  TimeRemaining.jsx  SundayReview.jsx
│
└── worker-v2.js                # OLD Cloudflare Worker — gitignored, inactive
```

---

*Last updated: May 31, 2026*
*Active proxy: Vercel Edge Function (api/index.js)*
*Status: Phases A–C done; Phase D in progress (study tracker remaining)*
