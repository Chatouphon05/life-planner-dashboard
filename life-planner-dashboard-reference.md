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
| **Usage mode** | Phone home screen bookmark (standalone, not Notion embed) |

---

## 3. Live System

| Resource | URL |
|---|---|
| **Dashboard** | https://chatouphon05.github.io/life-planner-dashboard/ |
| **GitHub repo** | https://github.com/chatouphon05/life-planner-dashboard |
| **Cloudflare Worker** | https://life-planner-proxy.chatouphonstch.workers.dev/ |
| **Notion workspace** | https://www.notion.so/3311e53d8332812bb12de15882223821 |
| **Notion integrations** | https://www.notion.so/my-integrations |

---

## 4. Architecture

```
Phone Home Screen (bookmark)
        ↓
GitHub Pages — index.html
(HTML + CSS + vanilla JS → React in Phase C)
        ↓  GET (load)  /  POST (write-back)
Cloudflare Worker v2
https://life-planner-proxy.chatouphonstch.workers.dev/
        ↓
Notion API v1 (2022-06-28)
Integration: "Life Planner Dashboard"
Token: secret_... (stored ONLY in Cloudflare Worker env — never in frontend)
```

### Key constraints
- GitHub Pages: **static only** — no server-side logic
- Cloudflare Worker: **free tier** — batch reads, minimize calls
- Notion embed: **does NOT work** — Notion iframe sandbox blocks external fetch
- Notion token: **never in frontend code** — Worker only

---

## 5. Notion Databases

### Connected to integration "Life Planner Dashboard"

| Database | ID | Key Fields | Write-back? |
|---|---|---|---|
| ✅ Tasks | `972a5ee5fce3470796efa210a62ffdcb` | Task, Done, Date, Area, Priority | ✅ Yes — Done checkbox |
| 🔁 Habits | `e00177c934234bbebbcffed9cd847b98` | Habit, Done, Date, Category, Streak | ✅ Yes — Done checkbox |
| ☀️ Daily Journal | `f35023fab2344a4a8a71f87f6e7d9610` | Mood (select), Energy (select), Date | ✅ Yes — Mood + Energy |
| 📋 Weekly Plans | `2682d573db944fcf84c08dac4acc1a02` | Week, Top 3 Priorities, Status | ❌ Read only |
| 📆 Monthly Plans | `a24a10e0ad52408ab4fdd70e2768b979` | Month, Theme, Focus Areas, Status | ❌ Read only |
| 🎯 Goals | `bde57e266a3f43438d5913bf205c10f3` | Goal, Area, Progress %, Status, Quarter | ❌ Read only |

### Daily Journal schema (key fields)
```
Mood:   select → ["🚀 Amazing", "😊 Good", "😐 Okay", "😔 Low", "😴 Tired"]
Energy: select → ["⚡ High", "🔋 Medium", "🪫 Low"]
Date:   date
```

### Tasks schema (new — replaces To Do List text field)
```
Task:     title
Done:     checkbox  ← write-back target
Date:     date      ← filter by today
Area:     select → ["🎓 Learning", "💼 Work", "🌿 Life", "💪 Health", "🧠 Mental", "🤝 Relationships"]
Priority: select → ["🔴 High", "🟡 Medium", "🟢 Low"]
Notes:    rich_text
```

### Habits schema (new)
```
Habit:    title
Done:     checkbox  ← write-back target
Date:     date      ← filter by today
Category: select → ["🧠 Mind", "💪 Body", "📚 Learning", "🌿 Life", "😴 Rest"]
Streak:   number
Notes:    rich_text
```

---

## 6. Cloudflare Worker v2 API

### GET /
Returns all dashboard data in one call.

```json
{
  "today":  { "date": "2026-05-25", "mood": "😊 Good", "energy": "🔋 Medium", "dailyId": "abc123" },
  "tasks":  [{ "id": "...", "task": "...", "done": false, "area": "🎓 Learning", "priority": "🔴 High" }],
  "habits": [{ "id": "...", "habit": "...", "done": false, "category": "🧠 Mind", "streak": 3 }],
  "week":   { "name": "W21", "priorities": ["...", "...", "..."] },
  "month":  { "name": "May 2026", "theme": "...", "focus": "..." },
  "goals":  [{ "id": "...", "name": "...", "area": "...", "progress": 40, "status": "In Progress", "quarter": "Q2" }]
}
```

### POST / (write-back)
Body schema — `type` determines what's written:

```json
// Toggle task done
{ "type": "task-done",  "pageId": "notion-page-id", "value": true }

// Toggle habit done
{ "type": "habit-done", "pageId": "notion-page-id", "value": true }

// Set mood on today's Daily Journal
{ "type": "mood",   "pageId": "daily-journal-page-id", "value": "😊 Good" }

// Set energy on today's Daily Journal
{ "type": "energy", "pageId": "daily-journal-page-id", "value": "⚡ High" }
```

Response: `{ "ok": true, "type": "...", "pageId": "..." }`

---

## 7. Current Dashboard Sections

Top to bottom:
1. **Hero** — title + live date (auto-calculated)
2. **Quick nav** — 6 cards linking to Notion databases
3. **Time remaining** — week / month / year progress bars (live JS)
4. **Today's focus** — tasks from Tasks DB, tappable with write-back
5. **This week's priorities** — from Weekly Plans (read only)
6. **Monthly focus** — theme + focus areas from Monthly Plans (read only)
7. **Active goals** — from Goals DB with progress bars (read only)
8. **Quote** — 2026 theme

### Not yet implemented
- Habit tracker section (Habits DB is ready)
- Mood + Energy selector (Daily Journal fields ready)
- Spotify "Now Playing" widget
- Brisbane/MDS departure countdown
- Calendar view

---

## 8. Design System

| Token | Value |
|---|---|
| Background | `#0d0d14` |
| Card background | `#16152a` |
| Card hover | `#1e1c38` |
| Primary accent (purple) | `#9b87f5` |
| Secondary accent (green) | `#6dd5a8` |
| Tertiary accent (orange) | `#f0a070` |
| Text primary | `rgba(230,225,255,0.85)` |
| Text muted | `rgba(180,170,255,0.5)` |
| Border | `0.5px solid rgba(255,255,255,0.07)` |
| Border radius (cards) | `12–14px` |
| Border radius (bars) | `4px` |
| Heading font | Syne (600/700) |
| Body font | DM Sans (300/400/500) |

**Dark theme is non-negotiable.** It's core to why this feels good to open.

---

## 9. Roadmap

### ✅ Done
- Dark atmospheric dashboard (HTML/CSS/JS)
- GitHub Pages hosting
- Cloudflare Worker proxy (v1 → read only)
- Live Notion data: tasks, weekly priorities, monthly focus, goals
- Time progress bars (week/month/year)
- Quick nav cards
- New Tasks database (replaces text field)
- New Habits database
- Worker v2 (read + write-back: tasks, habits, mood, energy)

### 🔲 Phase A — Connect write-back in frontend
- Wire task checkboxes → POST worker (task-done)
- Wire habit checkboxes → POST worker (habit-done)
- Add Mood selector → POST worker (mood)
- Add Energy selector → POST worker (energy)
- Optimistic UI with revert on failure

### 🔲 Phase B — New sections
- Habit tracker section (reads from Habits DB)
- Mood + Energy display/picker in hero or daily section
- Brisbane departure countdown (days until 7 June 2026)
- MDS start countdown (days until July 2026)
- Spotify "Now Playing" widget

### 🔲 Phase C — React rebuild (Claude Code)
- Migrate from vanilla HTML to React (Vite + GitHub Pages)
- Component architecture: HeroSection, NavGrid, TimeTracker,
  TaskList, HabitTracker, MoodPicker, GoalCard, SpotifyWidget
- `useNotionData.js` hook for data fetching + write-back
- PWA support — installable, offline fallback
- Use Claude Design output (app.jsx, sections.jsx, tokens.jsx) as base

### 🔲 Phase D — Intelligence layer
- Weekly review prompt on Sundays
- Study session tracker (MDS-specific)
- Mood/energy trend display (7-day rolling)

---

## 10. Instructions for Claude Sessions

1. **Read this file first** — don't assume current state
2. **Check live URL** before changes: https://chatouphon05.github.io/life-planner-dashboard/
3. **Never hardcode Notion token** — Worker env only
4. **Mobile-first always** — primary use is phone
5. **Dark theme non-negotiable**
6. **Design must survive low-energy days** — if it adds friction, reconsider
7. **Ask before assuming scope** — confirm which phase/task is active

### Starting a Phase A/B session
Provide: this file + current index.html from GitHub repo

### Starting a Phase C session (React rebuild)
Provide: this file + Claude Design files (app.jsx, sections.jsx, tokens.jsx, Life Planner.html)

---

## 11. File Structure

### Current (vanilla)
```
GitHub repo: chatouphon05/life-planner-dashboard
├── index.html                          # Single-file dashboard
└── life-planner-dashboard-reference.md # This file

Cloudflare Worker (separate deploy):
└── worker-v2.js                        # v2 with write-back support
```

### Phase C target (React)
```
├── public/index.html
├── src/
│   ├── components/
│   │   ├── HeroSection.jsx
│   │   ├── NavGrid.jsx
│   │   ├── TimeTracker.jsx
│   │   ├── TaskList.jsx
│   │   ├── HabitTracker.jsx
│   │   ├── MoodPicker.jsx
│   │   ├── WeekPriorities.jsx
│   │   ├── MonthlyFocus.jsx
│   │   ├── GoalCard.jsx
│   │   └── SpotifyWidget.jsx
│   ├── hooks/
│   │   └── useNotionData.js
│   ├── App.jsx
│   └── main.jsx
├── worker-v2.js
└── vite.config.js
```

---

*Last updated: May 25, 2026*
*Worker version: v2 (read + write-back)*
*Next milestone: Phase A — wire write-back in frontend*