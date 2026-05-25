# Life Planner Dashboard — Project Reference

> This document is the authoritative reference for the Life Planner Dashboard project.
> Any Claude session working on this project should read this file first before proceeding.

---

## 1. Project Vision

A personal life operating system dashboard that surfaces the right information at the right time — replacing the friction of navigating deep Notion pages with a single, beautiful, mobile-first view that makes Lunk *want* to open it every day.

**2026 theme:** *"Becoming more stable, clearer, and braver as who I already am."*

**Core design principle:** The dashboard must survive low-energy days — it should be so frictionless and visually motivating that opening it feels effortless even when motivation is low.

---

## 2. Owner Context

| Field | Detail |
|---|---|
| **Name** | Lunk (Chatouphon) |
| **Current location** | Vientiane, Laos — departing 7 June 2026 |
| **Next location** | Brisbane, Australia (QUT MDS program, July 2026) |
| **Role** | BI Analyst / Data Engineer → transitioning to Data Scientist |
| **Primary workspace** | Notion (life planner, weekly plans, goals, daily journal) |
| **Working style** | Deep single focus, plans well, executes lightly on low-energy days |

---

## 3. Current State (as of May 2026)

### What's Built
- **Dashboard page:** Dark-themed, mobile-first HTML dashboard
- **Hosting:** GitHub Pages — `https://chatouphon05.github.io/life-planner-dashboard/`
- **Data proxy:** Cloudflare Worker — `https://life-planner-proxy.chatouphonstch.workers.dev/`
- **Usage mode:** Standalone web app (bookmarked to phone home screen)

### What's Working
- Live time progress bars (week, month, year) — auto-calculated from current date
- Live Notion data via Cloudflare Worker proxy:
  - Today's tasks (from Daily Journal)
  - This week's priorities (from Weekly Plans)
  - Monthly focus/theme (from Monthly Plans)
  - Active goals with progress % (from Goals database)
- Quick nav cards linking directly to Notion databases
- Tappable task checkboxes (session-only, resets on reload)
- Dark atmospheric aesthetic with purple/night theme

### Known Limitations
- Tasks checked off reset on page reload (no persistence)
- Cannot be embedded in Notion iframe (Notion sandbox blocks external fetch)
- Monthly focus empty if Notion Monthly Plan has no Theme field filled
- No Spotify widget yet
- No calendar view yet
- No habit tracker yet
- Static layout — not yet built with a component framework

---

## 4. Technical Architecture

```
Phone Home Screen (bookmark)
        ↓
GitHub Pages — index.html
(HTML + CSS + vanilla JS)
        ↓
Cloudflare Worker (CORS proxy)
https://life-planner-proxy.chatouphonstch.workers.dev/
        ↓
Notion API (v1)
Notion Integration: "Life Planner Dashboard"
Token: secret_... (stored only in Cloudflare Worker env)
```

### Notion Databases Connected

| Database | ID | Fields Used |
|---|---|---|
| ☀️ Daily Journal | `f35023fab2344a4a8a71f87f6e7d9610` | `To Do List`, `Date` |
| 📋 Weekly Plans | `2682d573db944fcf84c08dac4acc1a02` | `Top 3 Priorities`, `Status`, `Week` |
| 📆 Monthly Plans | `a24a10e0ad52408ab4fdd70e2768b979` | `Theme`, `Focus Areas`, `Month`, `Status` |
| 🎯 Goals | `bde57e266a3f43438d5913bf205c10f3` | `Goal`, `Area`, `Progress %`, `Status`, `Quarter` |

### Cloudflare Worker Logic
- Receives GET request from dashboard
- Queries all 4 Notion databases in parallel (`Promise.all`)
- Filters: Daily by today's date, Weekly/Monthly by `In Progress` status, Goals by `In Progress` or `On Track`
- Returns unified JSON response
- Handles CORS for browser access

### GitHub Repository
- **Repo:** `https://github.com/chatouphon05/life-planner-dashboard`
- **Branch:** `main`
- **Entry point:** `index.html` (single file, vanilla HTML/CSS/JS)
- **Pages URL:** `https://chatouphon05.github.io/life-planner-dashboard/`

---

## 5. Design Reference

### Visual Direction
- **Inspiration:** Dark purple/night aesthetic, atmospheric, city-at-night feel
- **Color palette:**
  - Background: `#0d0d14`
  - Card background: `#16152a`
  - Primary accent: `#9b87f5` (purple)
  - Secondary accent: `#6dd5a8` (green)
  - Tertiary accent: `#f0a070` (orange)
  - Text primary: `rgba(230,225,255,0.85)`
  - Text muted: `rgba(180,170,255,0.5)`
- **Typography:** Syne (headings, numbers) + DM Sans (body)
- **Border style:** `0.5px solid rgba(255,255,255,0.07)` — subtle, not harsh
- **Border radius:** 12–14px cards, 4px bars

### Current Sections (top to bottom)
1. Hero — title + live date
2. Quick nav — 6 cards linking to Notion databases
3. Time remaining — week / month / year progress bars
4. Today's focus — live tasks from Daily Journal
5. This week's priorities — live from Weekly Plans
6. Monthly focus — live from Monthly Plans
7. Active goals — live from Goals with progress bars
8. Quote — 2026 theme

---

## 6. Next Phase Roadmap

### Phase A — Visual Redesign
- [ ] Upgrade hero section with AI-generated or curated atmospheric image
- [ ] Add image cards for nav (gallery style like the original inspiration)
- [ ] Improve mobile typography and spacing
- [ ] Add subtle animations (fade-in on load, bar fill animation)
- [ ] Add avatar / profile element in hero

### Phase B — Feature Additions
- [ ] **Spotify widget** — show currently playing track (requires Spotify API)
- [ ] **Calendar view** — upcoming events for the week
- [ ] **Habit tracker** — daily checkboxes that persist across sessions
- [ ] **Countdown** — days until Brisbane departure / MDS start
- [ ] **Task persistence** — checked tasks stay checked until midnight (localStorage or Notion write-back)

### Phase C — Framework Rebuild
- [ ] Migrate from vanilla HTML to **React** (Vite + GitHub Pages deploy)
- [ ] Component-based architecture: `HeroSection`, `NavGrid`, `TimeTracker`, `TaskList`, `GoalCard`, etc.
- [ ] Proper state management for task completion
- [ ] PWA support — installable as app, offline fallback
- [ ] Dark/light theme toggle (default dark)

### Phase D — Data Expansion
- [ ] Write-back to Notion — mark tasks done from dashboard
- [ ] Pull energy/mood from Daily Journal and display as status indicator
- [ ] Weekly review prompt on Sundays
- [ ] Study session tracker (relevant for MDS phase)

---

## 7. File Structure (current)

```
life-planner-dashboard/
├── index.html          # Single-file dashboard (HTML + CSS + JS)
worker.js               # Cloudflare Worker source (deploy separately)
life-planner-dashboard-reference.md  # This file
```

### Phase C target structure (React)
```
life-planner-dashboard/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── HeroSection.jsx
│   │   ├── NavGrid.jsx
│   │   ├── TimeTracker.jsx
│   │   ├── TaskList.jsx
│   │   ├── WeekPriorities.jsx
│   │   ├── MonthlyFocus.jsx
│   │   ├── GoalCard.jsx
│   │   └── SpotifyWidget.jsx
│   ├── hooks/
│   │   └── useNotionData.js
│   ├── App.jsx
│   └── main.jsx
├── worker.js
└── vite.config.js
```

---

## 8. Instructions for Claude Sessions

When a new Claude session picks up this project:

1. **Read this file first** — don't assume, verify current state here
2. **Check the live URL** before making changes: `https://chatouphon05.github.io/life-planner-dashboard/`
3. **Never hardcode the Notion token** — it lives only in the Cloudflare Worker
4. **Design decisions** must survive low-energy days — if it adds friction, reconsider
5. **Mobile-first always** — Lunk uses this primarily on his phone
6. **Dark theme is non-negotiable** — it's core to why this feels good to open
7. **Ask before assuming scope** — Lunk works in deep single focus; confirm what phase/task is active before building

### Key constraints
- Notion API token: stored in Cloudflare Worker only (never in frontend code)
- GitHub Pages: static hosting only — no server-side logic
- Cloudflare Worker: free tier — keep API calls minimal and batched
- Notion embed: does NOT work (iframe sandbox blocks external fetch) — use standalone URL only

---

## 9. Useful Links

| Resource | URL |
|---|---|
| Live dashboard | https://chatouphon05.github.io/life-planner-dashboard/ |
| GitHub repo | https://github.com/chatouphon05/life-planner-dashboard |
| Cloudflare Worker | https://dash.cloudflare.com (Workers & Pages → life-planner-proxy) |
| Notion workspace | https://www.notion.so/3311e53d8332812bb12de15882223821 |
| Notion integrations | https://www.notion.so/my-integrations |
| Notion API docs | https://developers.notion.com |
| Cloudflare Workers docs | https://developers.cloudflare.com/workers |

---

*Last updated: May 25, 2026*
*Built with: HTML/CSS/JS → Cloudflare Worker → Notion API*
*Next milestone: Phase A visual redesign + Phase B feature additions*
