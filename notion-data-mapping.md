# Life Planner — Notion → Dashboard Data Mapping

> Paste this whole file into a Claude Chat conversation to give it working
> context on this project. It explains what the app is, how data flows from
> Notion into the UI, and exactly which Notion property ends up in which
> component. Written by reading the actual source (`worker.js`,
> `src/hooks/useNotionData.js`, `src/app.jsx`) rather than copied from older
> planning docs, so treat this as the ground truth if it conflicts with
> anything else in the repo.

---

## 1. What this is

A personal life-planning dashboard (mobile-first PWA) that replaces digging
through Notion with one fast view: today's tasks, habits, mood/energy, and
zoomed-out weekly/monthly/goal context. Notion stays the system of record —
the dashboard is a read/write **lens** on top of it, not a separate database.

## 2. The pipeline, end to end

```
Notion databases (8 databases, see §3)
        ▲  write (PATCH/POST)         │  read (query)
        │                             ▼
┌───────────────────────────────────────────────────┐
│  Cloudflare Worker — worker.js  ("life-planner-api")│
│  https://api.lunkystch.com                          │
│  - holds the NOTION_TOKEN secret (never in frontend) │
│  - fires ~12 Notion queries in parallel per GET      │
│  - flattens Notion's verbose property objects into   │
│    small plain JSON                                  │
│  - also runs a daily cron (6 AM Brisbane) to seed     │
│    tomorrow's habit rows + ensure this week's/month's │
│    Review Anchor rows exist (see §3, §8)              │
└───────────────────────────────────────────────────┘
        │  GET returns one big JSON payload
        ▼
┌───────────────────────────────────────────────────┐
│  src/hooks/useNotionData.js  (React hook)            │
│  - fetches the Worker, caches to localStorage          │
│    (stale-while-revalidate, key lp-data-v3)          │
│  - adaptWorkerData(): light reshaping / defaulting    │
│  - exposes { tasks, habits, today, goals, ... ,        │
│    writeback(), fetchExpand(), refetch() }            │
└───────────────────────────────────────────────────┘
        │  props
        ▼
┌───────────────────────────────────────────────────┐
│  src/app.jsx  → components/*.jsx                     │
│  3 tabs: Daily · Weekly · Monthly (see §6)            │
└───────────────────────────────────────────────────┘
```

Nothing in the browser ever talks to Notion directly — the Worker is the
only thing holding the Notion integration token.

## 3. Notion databases actually in use

This is what `worker.js`'s `DB` map and `getData()` actually query — not
every database that exists in the workspace.

| # | Database | Notion DB ID | Read by dashboard | Write-back |
|---|---|---|---|---|
| 1 | ☀️ Daily Tasks | `c88c5452b1224fc3a8e421c77447e063` | ✅ today's tasks + 14-day history | ✅ `Done` checkbox, create/update/delete |
| 2 | 📋 Weekly Tasks | `5e77a48652b247ca99a86710e12094bb` | ✅ current week + 12-week heatmap + this week's Review Anchor row | ✅ `Status`, `Top 3 Priorities` (on the anchor row), create/update/delete |
| 3 | 🗓️ Monthly Tasks | `0eaa802009e147e1ac04425330958f06` | ✅ current month + 6-month heatmap + this month's Review Anchor row | ✅ `Status`, `Deadline`, `Quarterly Action`, create/update/delete |
| 4 | 🔁 Habits | `e00177c934234bbebbcffed9cd847b98` | ✅ today's habits + 14-day history | ✅ `Done` checkbox (+ cron auto-seed) |
| 5 | ☀️ Daily Journal | `f35023fab2344a4a8a71f87f6e7d9610` | ✅ today's mood/energy + 14-day history | ✅ `Mood`, `Energy`, `Energy Score`, `Focus Score`, `Mood Score` |
| 6 | 🎯 Goals | `bde57e266a3f43438d5913bf205c10f3` | ✅ `Status ∈ {In Progress, On Track}` | ❌ read-only |
| 7 | 🏁 Milestones | `810fe48f4d1e494c9aa62d38bc62a316` | ✅ `Status ∈ {Upcoming, Active}` | ❌ read-only (set manually in Notion) |
| 8 | 📆 Quarterly Actions | `7724898965044601b9fa974d07871a9e` | ✅ all rows, unfiltered (small dataset) | ❌ read-only |

**Retired** (see `plans-to-tasks-migration.md`): **📋 Weekly Plans**
(`2682d573db944fcf84c08dac4acc1a02`) and **📆 Monthly Plans**
(`a24a10e0ad52408ab4fdd70e2768b979`) are no longer read or written by the
Worker as of the anchor-row migration — the `week`/`month` payload now
sources from Weekly/Monthly Tasks instead (see below). The legacy
standalone **✅ Tasks** DB (`972a5ee5fce3470796efa210a62ffdcb`) was already
dead code and was removed from the Worker's `DB` map in the same change.

**Task hierarchy** (via Notion relations, drilled into lazily — see §7):

```
🎯 Goals ← 📆 Quarterly Actions ← 🗓️ Monthly Tasks ← 📋 Weekly Tasks ← ☀️ Daily Tasks
```

Quarterly Actions itself isn't drilled into (no expand UI) — the Worker
fetches all rows flat and the frontend just resolves each Monthly Task's
`quarterlyActionId` to a name/quarter/status for display, same pattern as
`goalId` elsewhere in the app.

### Review Anchor rows

Each of Weekly Tasks / Monthly Tasks carries exactly one extra row per
period tagged `Row Type = "Review Anchor"` (regular tasks have `Row Type`
unset or `"Task"`) — e.g. `📝 Weekly Review — W28` (`Week = "W28"`) and
`📝 Monthly Review — July` (`Month = "July"`). That row is the new home for
the period's forward-looking meta:

- Weekly anchor row: `Top 3 Priorities` (rich_text) — powers `week.priorities`
- Monthly anchor row: `Theme` + `Focus Areas` (rich_text) — powers `month.theme` / `month.focus`

Every query that lists or counts tasks (`weeklyTasks`, `monthlyTasks`, both
heatmaps, the drilldown endpoints) filters `Row Type != "Review Anchor"` so
these rows never show up as a real task or skew completion stats. A daily
cron job (`ensureAnchors()` in `worker.js`, runs alongside the habit
seeder) creates the current period's anchor row if it doesn't exist yet, so
a new week/month never launches without one.

### Properties actually read per database

Only what the code touches — see `worker.js`'s parser functions
(`getTasksByDate`, `getData`, etc.) for the literal property names.

- **Daily Tasks**: `Task` (title), `Done` (checkbox), `Area` (read as plain
  text, not a select, on this DB), `Priority` (select), `Date` (date),
  `Notes` (rich_text), `Goal` (relation), `Weekly Task` (relation)
- **Weekly Tasks**: `Task`, `Status` (select), `Priority`, `Week` (select,
  e.g. `"W24"`), `Notes`, `Goal` (relation), `Monthly Task` (relation),
  `Row Type` (select: unset/`"Task"` vs `"Review Anchor"`), `Top 3
  Priorities` (rich_text, newline-separated — parsed into a list, see §8 —
  only populated on the Review Anchor row)
- **Monthly Tasks**: `Task`, `Status`, `Priority`, `Month` (select, full
  month name e.g. `"June"`), `Notes`, `Goal` (relation), `Deadline` (date),
  `Quarterly Action` (relation), `Row Type` (same as above), `Theme` +
  `Focus Areas` (rich_text, only populated on the Review Anchor row)
- **Habits**: `Habit` (title), `Done` (checkbox), `Date`, `Category`
  (select), `Streak` (number)
- **Daily Journal**: `Date`, `Mood` (select), `Energy` (select),
  `Energy Score` / `Focus Score` / `Mood Score` (number, 1–10 — an
  additive slider check-in alongside the legacy Mood/Energy selects)
- **Goals**: `Goal` (title), `Area` (select), `Progress %` (number),
  `Status` (select), `Quarter` (select)
- **Milestones**: `Name` (title), `Date`, `Start` (date), `Category`
  (select: Transition / Deadline / Look Forward), `Status` (select:
  Upcoming / Active / Done)
- **Quarterly Actions**: `Action` (title), `Quarter` (select: Q1–Q4),
  `Status` (select), `Priority` (select, not currently surfaced), `Goal`
  (relation, not currently surfaced), `Monthly Tasks` (relation, inverse of
  Monthly Tasks' `Quarterly Action` — not queried, the Worker only reads
  the forward direction from Monthly Tasks)

## 4. What the Worker's GET response looks like

One call to `https://api.lunkystch.com` returns everything the dashboard
needs in a single JSON payload:

```jsonc
{
  "today":  { "date": "2026-07-12", "mood": "😊 Good", "energy": "🔋 Medium",
              "energyScore": 7, "focusScore": 6, "moodScore": 8, "dailyId": "..." },
  "tasks":          [{ "id", "task", "done", "area", "priority", "date", "notes", "goalId", "weeklyTaskId" }],
  "taskHistory":    [{ "date", "done", "total" }],           // 14 days
  "habits":         [{ "id", "habit", "done", "category", "streak" }],
  "habitHistory":   { "<habit name>": [null|0|1, ...] },     // 14 days per habit
  "moodHistory":    [{ "date", "mood", "energy" }],          // 14 days
  "week":           { "id", "name", "priorities": [...] },
  "month":          { "name", "theme", "focus" },
  "goals":          [{ "id", "name", "area", "progress", "status", "quarter" }],
  "quarterlyActions": [{ "id", "name", "quarter", "status", "goalId" }],  // all rows, unfiltered
  "weeklyTasks":    [...],   // current ISO week only
  "monthlyTasks":   [...],   // current month only — each has { id, task, status, priority, month, deadline, quarterlyActionId }
  "weeklyHeatmap":  [{ "week", "done", "total", "isCurrent" }],   // 12 weeks
  "monthlyHeatmap": [{ "month", "done", "total", "isCurrent" }],  // 6 months
  "currentWeek": "W28", "currentMonth": "July",
  "milestones": [{ "id", "name", "date", "start", "category", "status" }]
}
```

`tasks`/`taskHistory` come from **Daily Tasks**, not the legacy Tasks DB.
`"today"` comes from **Daily Journal**. `week`/`month` come from each
period's Review Anchor row in Weekly/Monthly Tasks (see §3) — `week.name`
is just the bare ISO week string (`"W28"`) and `month.name` the bare month
name (`"July"`), not a display title; neither is actually rendered by the
frontend (confirmed in §6), so this is a safe internal representation.
Everything else is named after its source DB.

Two lazy drilldown endpoints (used when a Weekly/Monthly task row is
expanded in the UI, not on initial load):
- `GET ?weeklyTask=<id>` → that week task's child Daily Tasks
- `GET ?monthlyTask=<id>` → that month task's child Weekly Tasks, each with
  their own child Daily Tasks nested in

## 5. Frontend: `useNotionData.js`

- Fetches the Worker on mount, every 5 minutes, and whenever the tab
  regains visibility.
- **Stale-while-revalidate**: last successful payload is cached to
  `localStorage['lp-data-v3']`. On load, cached data renders instantly
  (`stale: true`) while a fresh fetch runs in the background — this is why
  the Hero's `●` dot pulses amber during a refresh.
- `adaptWorkerData(raw)` is a thin reshape step — mostly defaulting missing
  fields (`?? null` / `|| []`), not real transformation, **except**:
  - `priorities`: turns the `week.priorities` array into `{ n, task }` rows
  - `milestones`: computes `daysLeft` and `progress` client-side from
    `date`/`start`, since those depend on "now" not on Notion state
- Exposes `writeback(type, pageId, value)` — the single write-back function
  every component calls — and `fetchExpand(type, id)` for drilldowns.

`src/app.jsx` reads the hook's output and does two more overrides before
handing data to components:
- **City**: shows "Brisbane" instead of "Vientiane" once any Milestone with
  `category = "Transition"` has `status = "Done"` in Notion — a one-shot
  flag flipped by editing Notion, not a dashboard setting.
- **Mantra**: shows the current month's Review Anchor `Theme` field if set,
  otherwise falls back to a hardcoded yearly mantra string in the frontend.

## 6. Tabs → components → Notion source

The app has 3 tabs: **Daily**, **Weekly**, **Monthly** (`src/app.jsx`,
`<TabBar>` / `.lp-pane[data-pane=...]`).

| Tab | Component | Reads (from the hook) | Notion source | Write-back |
|---|---|---|---|---|
| Daily | `MoodPicker` | `today` | Daily Journal (today's row) | `mood`, `energy`, `energy-score`, `focus-score`, `mood-score` |
| Daily | `TodayTasks` | `tasks`, `taskHistory`, `goals`, `weeklyTasks` | Daily Tasks (today + 14d) | `task-done` / `daily-task-done`, `create-task`, `update-task`, `delete-task` |
| Daily | `HabitTracker` | `habits`, `habitHistory` | Habits (today + 14d) | `habit-done` |
| Daily | `Books` | — | **local only** (`localStorage`), no Notion DB backs it yet | — |
| Weekly | `WeekStatsRow` | `habits`, `weeklyHeatmap` | derived, no direct write | — |
| Weekly | `SundayReview` | `today.date`, `weekId` | Weekly Tasks (current week's Review Anchor row) | `set-weekly-priorities` |
| Weekly | `WeekPriorities` | `priorities` | Weekly Tasks Review Anchor → `Top 3 Priorities` | — |
| Weekly | `WeeklyTasks` | `weeklyTasks`, `weeklyHeatmap`, `monthlyTasks`, `goals` | Weekly Tasks (current week + 12w heatmap, Review Anchor row excluded) | `task-status`, `daily-task-done` (via drilldown), create/update/delete |
| Weekly | `TimeRemaining` | `liveDate.time` | **not from Notion** — computed client-side from the current date | — |
| Monthly | `MonthlyFocus` | `monthly` | Monthly Tasks (current month's Review Anchor row) | — |
| Monthly | `MonthlyTasks` | `monthlyTasks`, `monthlyHeatmap`, `goals`, `quarterlyActions` | Monthly Tasks (current month + 6mo heatmap, Review Anchor row excluded); each row's `quarterlyActionId` resolved against `quarterlyActions` client-side for display | `task-status`, `daily-task-done` (via drilldown), create/update/delete (now incl. `deadline`, `quarterlyActionId`) |
| Monthly | `Goals` | `goals` | Goals (`Status ∈ {In Progress, On Track}`) | — |
| Monthly | `Milestones` | `milestones` | Milestones (`Status ∈ {Upcoming, Active}`) | — |
| Monthly | `NavGrid` | — | static links out to Notion pages | — |
| (all tabs) | `Hero` | `liveDate`, `milestones` | date computed client-side; active-milestone strip from Milestones | — |
| (FAB) | `QuickCapture` | — | writes straight to Daily Tasks | `create-task` |

## 7. Drilldown / lazy loading

Weekly and Monthly task rows show a count but not their children by
default. Tapping to expand a row calls `fetchExpand('weeklyTask', id)` or
`fetchExpand('monthlyTask', id)`, which hits the Worker with
`?weeklyTask=<id>` / `?monthlyTask=<id>&fresh=1` — a **separate, cache-busted
Notion query** scoped to just that item's children, not part of the initial
page-load payload. This keeps the first load fast (one flat query per DB)
while still allowing full hierarchy drill-down on demand.

## 8. Non-obvious mapping logic worth knowing

- **Timezone**: the Worker computes "today" as Brisbane time
  (`UTC_OFFSET_HOURS = 10`, hardcoded), not the visitor's browser timezone.
  All date filters (`Date = today`, 14-day history windows) are anchored to
  this. The frontend's Hero date display also prefers the Worker's date
  string over the browser's local date, so they never disagree.
- **`week`/`month` priorities+theme are date-based now, not Status-based.**
  Before the anchor-row migration, the Worker picked the *first* Weekly Plan
  page with `Status = In Progress` and the first Monthly Plan page with
  `Status ∈ {In Progress, Not Started}` — a footgun that silently showed
  stale content whenever nobody remembered to flip a Notion page's Status.
  Now the Worker queries the Review Anchor row tagged with the *computed*
  current ISO week (`"W28"`) / month (`"July"`) — same date-driven matching
  Weekly/Monthly Tasks already used for everything else, so there's only
  one "what's current" rule in the whole system now, not two.
- **Anchor row missing** (e.g. very start of a new week/month before the
  daily cron has run) → `week.priorities` is `[]`, `month.theme`/`focus`
  are `""`, `week.id` is `null` — never an error. `SundayReview.jsx` only
  shows its "set priorities" UI when `weekId` is non-null, so on the rare
  day an anchor row hasn't been created yet, that control just doesn't
  render rather than writing to nothing.
- **Heatmaps** (`weeklyHeatmap` / `monthlyHeatmap`) are built by fetching
  *all* Weekly/Monthly Tasks whose `Week`/`Month` falls in the last 12
  weeks / 6 months in one query (an `OR` of equality filters), then
  bucketing and counting `done` vs `total` per period in the Worker —
  no per-period Notion queries.
- **Goals progress bars** read `Progress %`, a plain number property
  someone edits by hand in Notion — it is not computed from linked tasks.
- **Milestone countdown/progress** (`daysLeft`, `progress` %) is computed
  in the frontend from `date`/`start`, evaluated against the current
  instant — it changes every time the page loads/refreshes even though
  Notion's stored value doesn't change.
- **`task-done` vs `daily-task-done`**: both write-back types hit the exact
  same code path in the Worker (toggle the `Done` checkbox by page ID) —
  they're interchangeable today. `daily-task-done` is the more accurate
  name; `task-done` is a holdover name still used by `TodayTasks.jsx`.
- **Books** section has no Notion database at all — it's `localStorage`
  only, so it won't appear in the Worker payload and won't sync across
  devices.

## 9. Write-back reference (UI action → Notion effect)

All write-backs go through one function: `writeback(type, pageId, value)`
→ `POST https://api.lunkystch.com` with `{ type, pageId, value }` →
`handlePatch()` in `worker.js` → a single `PATCH`/`POST` to the Notion API.
Writes are optimistic in the UI (checkbox flips immediately) and revert if
the Worker returns an error.

| `type` | Notion effect |
|---|---|
| `task-done` / `daily-task-done` | `Done` checkbox on a Daily Task |
| `habit-done` | `Done` checkbox on a Habit |
| `task-status` | `Status` select on a Weekly or Monthly Task |
| `mood` / `energy` | `Mood` / `Energy` select on today's Daily Journal row |
| `energy-score` / `focus-score` / `mood-score` | number property on today's Daily Journal row |
| `create-task` / `update-task` / `delete-task` | create, edit, or archive a Daily Task |
| `create-weekly-task` / `update-weekly-task` | create or edit a Weekly Task |
| `create-monthly-task` / `update-monthly-task` | create or edit a Monthly Task |
| `set-weekly-priorities` | overwrites `Top 3 Priorities` rich_text on the current week's Weekly Tasks Review Anchor row |

Notion has no hard delete via API — "delete" archives the page
(`archived: true`), which removes it from all future queries.

---

*This file reflects the code as of the commit where it was written. If the
mapping ever looks wrong, `worker.js` (source of Notion queries + parsing)
and `src/hooks/useNotionData.js` (source of frontend shaping) are the
ground truth — re-derive from there rather than trusting this doc blindly
after major changes.*
