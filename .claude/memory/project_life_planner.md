---
name: project-life-planner-dashboard
description: "Architecture and current state of the Life Planner Dashboard (Vite+React, May 2026). Component map, proxy setup, deploy pipeline."
metadata: 
  node_type: memory
  type: project
  originSessionId: 4f48990b-c912-4cb2-ad3d-c69e77d6ba10
---

Vite + React dashboard connected to Notion via a serverless proxy. Primary use: phone home screen bookmark (mobile-first).

**Live URLs:**
- Frontend: https://chatouphon05.github.io/life-planner-dashboard/
- API proxy: https://life-planner-dashboard.vercel.app/api
- GitHub repo: https://github.com/Chatouphon05/life-planner-dashboard

**Architecture:**
```
GitHub Pages (frontend)  →  Vercel Edge Function (api/index.js)  →  Notion API
```
- `api/index.js` — Vercel Edge Function, mirrors worker-v2.js exactly. Reads `NOTION_TOKEN` from Vercel env var (never hardcoded). GET returns all dashboard data; POST handles write-back.
- `worker-v2.js` — old Cloudflare Worker kept locally, in .gitignore (has hardcoded token). No longer the active proxy.
- **Why Vercel:** `.workers.dev` domain was blocked on iOS (same WiFi as laptop). `vercel.app` works fine. Env var token is also more secure.
- Vercel settings: Production Branch = `main`; Ignored Build Step = custom bash to skip `gh-pages` branch builds.

**Component map:**
```
src/
  app.jsx              ← root: theme toggle, pull-to-refresh, tab routing
  main.jsx
  index.css            ← CSS vars (dark/light themes), lp-shimmer, lp-pulse animations
  hooks/
    useNotionData.js   ← SWR cache (localStorage lp-data-v1), writeback(), getLiveDate()
  components/
    Primitives.jsx     ← Skeleton, Bullet, Eyebrow, ProgressBar, MetricRow, TaskRow
    Hero.jsx           ← date, Brisbane countdown, pulsing ● when stale
    TabBar.jsx         ← Daily / Weekly / Monthly
    NavGrid.jsx        ← 6 Notion quick-links
    TodayTasks.jsx     ← 14-day heatmap + tasks with optimistic write-back
    HabitTracker.jsx   ← 14-day dot grid per habit, today tap-to-toggle
    MoodPicker.jsx     ← mood/energy chips with write-back to Daily Journal
    WeekPriorities.jsx ← top 3 from Weekly Plans
    TimeRemaining.jsx  ← week/month/year/Brisbane progress bars
    MonthlyFocus.jsx   ← monthly theme from Notion
    Goals.jsx          ← collapsible area groups, progress bars
```

**Tab layout:** Daily = MoodPicker + NavGrid + TodayTasks + HabitTracker. Weekly = WeekPriorities + TimeRemaining. Monthly = MonthlyFocus + Goals.

**Performance:** SWR cache — cached data shows instantly from localStorage, background refresh silently. Hero ● pulses amber during refresh. Shimmer skeletons on first-ever load (no cache).

**Write-back:** Tasks, habits, mood, energy all POST to Vercel API with optimistic UI + revert on failure. Failed items show ⊘ glyph + "sync failed" message.

**Design tokens:** amber accent `oklch(0.80 0.11 70)`, sage accent2, dark purple-tinted bg. Dark/light theme toggle persisted in localStorage. Dark is non-negotiable as default.

**Deploy:** push to `main` → GitHub Actions builds Vite → pushes to `gh-pages` branch → GitHub Pages serves frontend. Vercel auto-deploys `main` branch for the API.

**How to apply:** Read `life-planner-dashboard-reference.md` first. Node at `C:\Program Files\nodejs\` — prefix PATH in PowerShell: `$env:PATH = "C:\Program Files\nodejs\;" + $env:PATH`. Worker URL is in `useNotionData.js` WORKER_URL const — currently points to Vercel.
