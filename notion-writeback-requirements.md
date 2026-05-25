# Notion Write-Back — Requirements

> Scope: allow the Life Planner Dashboard to mark tasks as done and
> have that change persist in Notion — surviving page reloads.

---

## 1. Problem

Today, tapping a task checkbox in the dashboard marks it done visually
(session-only state in React). On reload, all tasks reappear unchecked.
Notion has no record that anything was completed.

This means the dashboard can't be trusted as a completion tracker —
Lunk has to open Notion separately to actually tick things off.

---

## 2. Goal

Tapping a task checkbox on the dashboard writes the completion back to
Notion immediately. The next time the page loads (or pull-to-refresh
fires), completed tasks either disappear from the list or appear
pre-checked — matching Notion's actual state.

---

## 3. User Story

> As Lunk, when I check off a task on my dashboard, I want it to be
> marked done in Notion so I don't have to open Notion to do it again.

Acceptance criteria:
- Tapping a task checkbox sends a write request within ~500 ms
- On next load or pull-to-refresh, the task reflects its Notion state
- If the write fails, the checkbox reverts and shows a brief error indicator
- No Notion token is exposed in the frontend

---

## 4. Open Question — Notion Data Model (Must Resolve First)

The current Worker reads `To Do List` from the Daily Journal database.
**The exact Notion property type of `To Do List` is unknown** — this
determines the entire write-back API approach.

### Case A — `To Do List` is a page-level property (e.g. `rich_text`, `multi_select`)

Tasks are stored as a single property value on the Daily Journal page.
There is no per-task identifier. To mark one task done you would have
to rewrite the entire property value (e.g. removing a task from the
list, or appending a ✓ prefix).

**Verdict:** Fragile. Not recommended.

### Case B — Tasks are checkbox blocks inside the page body

Each task is a Notion `to_do` block (native checklist) within the body
of today's Daily Journal page. Each block has its own unique `block_id`.

To mark one done: `PATCH https://api.notion.com/v1/blocks/{block_id}`
with `{ "to_do": { "checked": true } }`.

**Verdict:** Clean, per-task granularity. Recommended if this is the structure.

### Case C — `To Do List` is a `relation` to a separate task database

Tasks are their own Notion pages linked via a relation. Each has a
`Status` or `Done` checkbox property that can be toggled individually.

**Verdict:** Also clean. Requires knowing the linked database ID.

**→ Action required before any code is written:**
Open today's Daily Journal page in Notion, open the developer view or
check the API response, and confirm which case applies. The Worker can
be temporarily updated to return raw block/property data for inspection.

---

## 5. Recommended Architecture (assuming Case B)

```
Dashboard (React)
  user taps checkbox
        ↓
  optimistic UI update (check shown immediately)
        ↓
  POST /patch-task  to Cloudflare Worker
  { block_id: "...", checked: true }
        ↓
Cloudflare Worker
  validates request (origin check)
  PATCH api.notion.com/v1/blocks/{block_id}
  Authorization: Bearer {NOTION_TOKEN}   ← token never leaves Worker
        ↓
  200 OK → confirm to frontend
  non-200 → return error, frontend reverts checkbox
```

---

## 6. Changes Required

### 6a. Worker changes

| Change | Detail |
|---|---|
| Return `block_id` with each task | Current response only returns task text strings. Must include `block_id` (or `page_id` for Case C) so the frontend knows what to PATCH. |
| New route: `POST /patch-task` | Accepts `{ block_id, checked }`, forwards to Notion Blocks API, returns `{ ok: true }` or error. |
| CORS update | Add `POST` to `Access-Control-Allow-Methods` and handle `OPTIONS` preflight for the new route. |
| Origin allowlist | Only accept requests from `https://chatouphon05.github.io` to prevent abuse. |

### 6b. Frontend changes

| Change | Detail |
|---|---|
| `useNotionData.js` — task shape | Parse `block_id` out of the Worker response and include it in the task objects passed to components. |
| `TodayTasks.jsx` — optimistic toggle | On tap: immediately flip the checkbox in local state (fast feedback), then fire the write request in the background. |
| Revert on failure | If the Worker returns an error, flip the checkbox back and show a brief `·` → `⊘` indicator on the failed task row. |
| Pull-to-refresh re-fetches truth | After a write, the next pull-to-refresh (or auto-refresh) will load Notion's actual state, reconciling any drift. |

### 6c. No changes needed

- GitHub Pages hosting (static, write goes to Worker not Pages)
- Notion token handling (already secure in Worker env)
- Other sections (Goals, WeekPriorities, MonthlyFocus — read-only for now)

---

## 7. Task State Model

```
Notion to_do block
  checked: false  →  dashboard shows unchecked  (·)
  checked: true   →  dashboard shows checked    (✕, faded)
```

On load, the Worker filters and returns today's tasks. Options for
how completed tasks appear:

| Option | Behaviour | Recommended? |
|---|---|---|
| Hide completed | Worker only returns `checked: false` tasks | Simple, clean — low-energy default |
| Show completed faded | Worker returns all, frontend fades done ones | More informative, shows progress |
| **Show completed faded (default), hide after refresh** | Optimistic check shown; on next load Notion state used | ✓ Best of both |

---

## 8. Out of Scope (this phase)

- Writing back goal progress %
- Marking weekly priorities as done
- Adding new tasks from the dashboard (QuickAdd FAB)
- Editing task text
- Habits write-back
- Any write-back to databases other than Daily Journal

---

## 9. Risk & Constraints

| Risk | Mitigation |
|---|---|
| Notion API rate limit (3 req/s per integration) | One PATCH per tap — well within limits |
| Worker free tier (100k req/day) | Each task tap = 1 req — not a concern |
| Network failure mid-tap | Optimistic revert + error indicator on the task row |
| Notion property type mismatch | Must confirm data model (Section 4) before writing any code |
| CORS preflight for POST | Worker must handle `OPTIONS` correctly |

---

## 10. Implementation Order

1. **Confirm Notion data model** — inspect today's Daily Journal page via API or Notion UI
2. **Update Worker GET** — return `block_id` alongside each task text
3. **Add Worker POST route** — `/patch-task` with origin check + Notion PATCH
4. **Update `useNotionData.js`** — include `block_id` in task objects
5. **Update `TodayTasks.jsx`** — optimistic toggle + revert on failure
6. **Test on device** — tap, check Notion, reload dashboard, confirm sync

---

*Created: May 25, 2026*
*Status: Draft — pending Notion data model confirmation (Section 4)*
