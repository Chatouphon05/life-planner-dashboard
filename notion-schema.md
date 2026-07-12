# Notion Schema — Life Planner Dashboard
> Read this file before touching any Notion-related code.
> This is the authoritative reference for all database IDs, schemas, and relationships.
> Last updated: May 26, 2026
>
> ⚠️ **Partially superseded (July 2026):** 📋 Weekly Plans and 📆 Monthly
> Plans are retired — see `plans-to-tasks-migration.md` and
> `notion-data-mapping.md` for the current model (Review Anchor rows inside
> Weekly/Monthly Tasks). The legacy standalone ✅ Tasks DB described below
> was also removed from `worker.js`'s `DB` map (it was already dead code).
> Everything else on this page is still accurate.

---

## Architecture reminder

The dashboard NEVER talks to Notion directly.

```
React frontend (src/)
    ↓ fetch
Cloudflare Worker (worker-v2.js)
    ↓ Notion API
Notion databases
```

The Notion token lives ONLY in the Cloudflare Worker env. Never in frontend code.

---

## Hierarchy

Every task in this system is linked upward through a chain:

```
🎯 Goals
    ↓ relation: "Goal"
📆 Quarterly Actions
    ↓ relation: "Quarterly Action"
🗓️ Monthly Tasks          ← top-level task groupings per month
    ↓ relation: "Monthly Task"
📋 Weekly Tasks           ← tasks scoped to a specific week
    ↓ relation: "Weekly Task"
☀️ Daily Tasks            ← daily actionable items with Done checkbox
```

The dashboard primarily reads from **☀️ Daily Tasks** (filtered by today's date)
and surfaces context from Weekly/Monthly levels. Write-back targets are
**Done checkboxes** in Daily Tasks.

---

## Database Registry

### 1. ✅ Tasks (standalone — legacy/general capture)
- **ID:** `972a5ee5fce3470796efa210a62ffdcb`
- **Collection ID:** `2755ba5e-afc9-4e95-b379-518c650dfdea`
- **Purpose:** General-purpose task capture. Not part of the hierarchy.
- **Write-back:** Done checkbox ✅
- **Schema:**
```
Task:     title
Done:     checkbox
Date:     date
Area:     select → ["🎓 Learning", "💼 Work", "🌿 Life", "💪 Health", "🧠 Mental", "🤝 Relationships"]
Priority: select → ["🔴 High", "🟡 Medium", "🟢 Low"]
Notes:    rich_text
```

### 2. ☀️ Daily Tasks (hierarchy level 4 — primary dashboard target)
- **ID:** `c88c5452b1224fc3a8e421c77447e063`
- **Collection ID:** `7901115e-10b7-4d56-99b5-df44eda06e0f`
- **Purpose:** Daily actionable tasks. Filter by Date = today. This is what the dashboard shows.
- **Write-back:** Done checkbox ✅
- **Schema:**
```
Task:        title
Done:        checkbox       ← write-back target
Date:        date           ← filter by today
Priority:    select → ["High", "Medium", "Low"]
Notes:       rich_text
Goal:        relation → 🎯 Goals (collection: a28f9793-ee02-40fa-9b97-8ee8302443e0)
Weekly Task: relation → 📋 Weekly Tasks (collection: a7b7b9d2-29d5-48a9-9ecb-d2d90cc9a9e2)
```
- **Notion API filter for today:**
```json
{
  "filter": {
    "property": "Date",
    "date": { "equals": "YYYY-MM-DD" }
  }
}
```

### 3. 📋 Weekly Tasks (hierarchy level 3)
- **ID:** `5e77a48652b247ca99a86710e12094bb`
- **Collection ID:** `a7b7b9d2-29d5-48a9-9ecb-d2d90cc9a9e2`
- **Purpose:** Tasks scoped to a specific week (W01–W52).
- **Write-back:** None (read only in dashboard)
- **Schema:**
```
Task:         title
Status:       select → ["Not Started", "In Progress", "Done", "Dropped"]
Priority:     select → ["High", "Medium", "Low"]
Week:         select → ["W01" … "W52"]
Date:         date (date range: start–end of week)
Notes:        rich_text
Monthly Task: relation → 🗓️ Monthly Tasks (collection: 22e8327d-bba7-4e10-b6eb-e90792deaeda)
Goal:         relation → 🎯 Goals (collection: a28f9793-ee02-40fa-9b97-8ee8302443e0)
Daily Tasks:  relation → ☀️ Daily Tasks (collection: 7901115e-10b7-4d56-99b5-df44eda06e0f)
```

### 4. 🗓️ Monthly Tasks (hierarchy level 2)
- **ID:** `0eaa802009e147e1ac04425330958f06`
- **Collection ID:** `22e8327d-bba7-4e10-b6eb-e90792deaeda`
- **Purpose:** Top-level task groupings per month, linked to goals.
- **Write-back:** None (read only in dashboard)
- **Schema:**
```
Task:             title
Status:           select → ["Not Started", "In Progress", "Done", "Dropped"]
Priority:         select → ["High", "Medium", "Low"]
Month:            select → ["January" … "December"]
Notes:            rich_text
Goal:             relation → 🎯 Goals (collection: a28f9793-ee02-40fa-9b97-8ee8302443e0)
Quarterly Action: relation → 📆 Quarterly Actions (collection: 7df843f8-f746-4b8b-b4d7-fd2dab28895d)
Weekly Tasks:     relation → 📋 Weekly Tasks (collection: a7b7b9d2-29d5-48a9-9ecb-d2d90cc9a9e2)
```

### 5. 🔁 Habits
- **ID:** `e00177c934234bbebbcffed9cd847b98`
- **Collection ID:** `e2eb0d35-ff4f-4bab-9ac2-99fd61dd1203`
- **Purpose:** Daily habit tracking with streak.
- **Write-back:** Done checkbox ✅
- **Schema:**
```
Habit:    title
Done:     checkbox       ← write-back target
Date:     date           ← filter by today
Category: select → ["🧠 Mind", "💪 Body", "📚 Learning", "🌿 Life", "😴 Rest"]
Streak:   number
Notes:    rich_text
```

### 6. ☀️ Daily Journal
- **ID:** `f35023fab2344a4a8a71f87f6e7d9610`
- **Collection ID:** `a6559a50-71f1-4ff5-b469-16d176ea580b`
- **Purpose:** Daily mood and energy logging.
- **Write-back:** Mood + Energy selects ✅
- **Schema:**
```
Date:   date
Mood:   select → ["🚀 Amazing", "😊 Good", "😐 Okay", "😔 Low", "😴 Tired"]
Energy: select → ["⚡ High", "🔋 Medium", "🪫 Low"]
```

### 7. 📋 Weekly Plans
- **ID:** `2682d573db944fcf84c08dac4acc1a02`
- **Collection ID:** `370a96a0-a9ef-49c6-9f0c-5c603c062e6d`
- **Purpose:** Weekly planning pages with Mon–Sun fields and Top 3 Priorities.
- **Write-back:** None (read only)
- **Schema:**
```
Week:             title (e.g. "W23 — 31 May to 06 Jun 2026")
Status:           select → ["Not Started", "In Progress", "Done"]
Top 3 Priorities: rich_text
Mon/Tue/Wed/Thu/Fri/Sat/Sun: rich_text (daily notes)
Reflection:       rich_text
Date:             date (range: start–end of week)
```

### 8. 📆 Monthly Plans
- **ID:** `a24a10e0ad52408ab4fdd70e2768b979`
- **Collection ID:** `319f8c8e-0dbe-4483-ae3c-a6353ee8c362`
- **Purpose:** Monthly planning pages with theme, focus areas, and week summaries.
- **Write-back:** None (read only)
- **Schema:**
```
Month:        title (e.g. "🇱🇦→🇦🇺 June 2026 — The Transition")
Theme:        rich_text
Focus Areas:  rich_text
Status:       select → ["Not Started", "In Progress", "Done"]
Week 1–4:     rich_text (weekly summary per field)
Reflection:   rich_text
Date:         date (range: start–end of month)
```

### 9. 🎯 Goals
- **ID:** `bde57e266a3f43438d5913bf205c10f3`
- **Collection ID:** `a28f9793-ee02-40fa-9b97-8ee8302443e0`
- **Purpose:** Annual goals with progress and quarterly tracking.
- **Write-back:** None (read only)
- **Schema:**
```
Goal:     title
Area:     select → ["🎓 Learning", "💼 Work", "🌿 Life", "💪 Health", "🧠 Mental", "🤝 Relationships"]
Progress: number (0–100, percentage)
Status:   select → ["Not Started", "In Progress", "Done"]
Quarter:  select → ["Q1", "Q2", "Q3", "Q4"]
```

---

## Worker GET / — What to fetch and how

The Worker batches all reads into one Notion API burst and returns a unified payload.
Current GET response shape (worker-v2.js):

```js
{
  today:  { date, mood, energy, dailyId },  // from Daily Journal, today's entry
  tasks:  [...],  // from ✅ Tasks OR ☀️ Daily Tasks, filtered by today's date
  habits: [...],  // from 🔁 Habits, filtered by today's date
  week:   { name, priorities },             // from 📋 Weekly Plans, current week
  month:  { name, theme, focus },           // from 📆 Monthly Plans, current month
  goals:  [...]                             // from 🎯 Goals, status = In Progress
}
```

### Recommended upgrade: switch tasks source to ☀️ Daily Tasks

Currently `tasks` reads from ✅ Tasks (standalone). The hierarchy is now live.
To surface hierarchical tasks, switch the Worker to read from ☀️ Daily Tasks
(ID: `c88c5452b1224fc3a8e421c77447e063`) filtered by today's date.

The write-back endpoint for task-done already works — just update the database ID.

---

## Worker POST / — Write-back targets

```js
// Toggle Daily Task done (NEW — preferred over ✅ Tasks)
{ type: "daily-task-done", pageId: "notion-page-id", value: true/false }

// Toggle standalone task done (legacy ✅ Tasks)
{ type: "task-done", pageId: "notion-page-id", value: true/false }

// Toggle habit done
{ type: "habit-done", pageId: "notion-page-id", value: true/false }

// Set mood on today's Daily Journal entry
{ type: "mood", pageId: "daily-journal-page-id", value: "😊 Good" }

// Set energy on today's Daily Journal entry
{ type: "energy", pageId: "daily-journal-page-id", value: "⚡ High" }
```

---

## React Hook — useNotionData.js

Located at `src/hooks/useNotionData.js`.
Fetches from the Cloudflare Worker, not Notion directly.

```js
const WORKER_URL = "https://life-planner-proxy.chatouphonstch.workers.dev/";

// GET — load all dashboard data
const data = await fetch(WORKER_URL).then(r => r.json());

// POST — write-back
await fetch(WORKER_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ type, pageId, value })
});
```

The hook should expose: `{ data, loading, error, toggleTask, toggleHabit, setMood, setEnergy }`.

---

## React Components — What uses what

| Component | Data source | Write-back |
|---|---|---|
| `TodayTasks.jsx` | `data.tasks` (Daily Tasks, today) | `toggleTask(pageId, done)` |
| `HabitTracker.jsx` | `data.habits` (Habits, today) | `toggleHabit(pageId, done)` |
| `MoodPicker.jsx` | `data.today.mood/energy` | `setMood()`, `setEnergy()` |
| `WeekPriorities.jsx` | `data.week` | None |
| `MonthlyFocus.jsx` | `data.month` | None |
| `Goals.jsx` | `data.goals` | None |
| `Hero.jsx` | `data.today.date` | None |
| `TimeRemaining.jsx` | Calculated in JS | None |

---

## Quick reference — IDs only

```js
// Paste these directly into Worker or hook code
const NOTION_DB = {
  tasks_standalone: "972a5ee5fce3470796efa210a62ffdcb",   // ✅ Tasks (legacy)
  daily_tasks:      "c88c5452b1224fc3a8e421c77447e063",   // ☀️ Daily Tasks (hierarchy)
  weekly_tasks:     "5e77a48652b247ca99a86710e12094bb",   // 📋 Weekly Tasks
  monthly_tasks:    "0eaa802009e147e1ac04425330958f06",   // 🗓️ Monthly Tasks
  habits:           "e00177c934234bbebbcffed9cd847b98",   // 🔁 Habits
  daily_journal:    "f35023fab2344a4a8a71f87f6e7d9610",   // ☀️ Daily Journal
  weekly_plans:     "2682d573db944fcf84c08dac4acc1a02",   // 📋 Weekly Plans
  monthly_plans:    "a24a10e0ad52408ab4fdd70e2768b979",   // 📆 Monthly Plans
  goals:            "bde57e266a3f43438d5913bf205c10f3",   // 🎯 Goals
};
```
