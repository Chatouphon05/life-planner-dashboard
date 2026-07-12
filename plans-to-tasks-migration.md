# Migration: Kill the Plans set — source weekly priorities & monthly theme from the Tasks set

> **Goal.** Make the dashboard stop reading/writing **📋 Weekly Plans** and **📆 Monthly Plans**, so the Tasks hierarchy (Goals → Quarterly Actions → Monthly → Weekly → Daily) becomes the single source of truth. After this, the two Plans databases feed *nothing* and can be archived.
>
> **Guiding principle.** The frontend payload contract does **not** change. `week.priorities`, `month.theme`, and `month.focus` keep the exact same shape they have today (see the data-mapping doc §4). Only *where the Worker sources them* changes. That confines ~95% of the work to `worker.js` + a few Notion property adds, and leaves `WeekPriorities`, `MonthlyFocus`, the Mantra, and `SundayReview` almost untouched.

---

## 0. What Plans currently provides (the only two things to replace)

From the data-mapping doc, Plans powers exactly two features:

| Feature | Today's source | Payload key | Write path |
|---|---|---|---|
| Weekly Top 3 Priorities (`WeekPriorities`, `SundayReview`) | Weekly Plans `Top 3 Priorities` (rich_text, newline-separated) | `week.priorities` | `set-weekly-priorities` → PATCH Weekly Plan page |
| Monthly Mantra + Focus (`Mantra`, `MonthlyFocus`) | Monthly Plans `Theme` + `Focus Areas` (rich_text) | `month.theme`, `month.focus` | read-only |

That's the entire surface area. Nothing else in the app touches Plans.

---

## 1. Target model — per-period **anchor rows** in the Tasks DBs

We already introduced *anchor rows* for the review ritual:
- **Weekly Tasks** row `📝 Weekly Review — W##`, tagged `Week = W##`
- **Monthly Tasks** row `📝 Monthly Review — <Month>`, tagged `Month = <Month>`

We reuse those same rows as the home for the period's forward-looking meta. So each anchor row carries **both** the review reflection (page body) *and* the period's priorities/theme (properties). One meta-row per period, living inside the live system.

### New Notion properties to add

| DB | Property | Type | Notes |
|---|---|---|---|
| 📋 Weekly Tasks | `Top 3 Priorities` | rich_text | Same name/format as the old Weekly Plans field, so the Worker's parser is reusable verbatim. Filled only on the anchor row. |
| 🗓️ Monthly Tasks | `Theme` | rich_text | Powers the Mantra. Filled only on the anchor row. |
| 🗓️ Monthly Tasks | `Focus Areas` | rich_text | Powers Monthly Focus. Filled only on the anchor row. |
| 📋 Weekly Tasks | `Row Type` | select: `Task` (default), `Review Anchor` | Deterministic way to find *the* anchor row, and to exclude it from task/heatmap counts. |
| 🗓️ Monthly Tasks | `Row Type` | select: `Task` (default), `Review Anchor` | Same. |

> **Why `Row Type` and not a title match?** Matching on the `📝 …` title prefix is brittle. A `Row Type` select is unambiguous, and — critically — lets every task-counting query **exclude anchor rows** so they don't pollute completion stats (see §3.3). Every existing normal task keeps the default `Task`, so no backfill of old rows is needed for this flag.

---

## 2. One-time backfill (do this before flipping the Worker)

So nothing is lost when Plans is disconnected:

1. Create (or reuse) the anchor rows for the **current** week and month, `Row Type = Review Anchor`.
2. Copy the current Weekly Plan's `Top 3 Priorities` → the weekly anchor row's `Top 3 Priorities`.
3. Copy the current Monthly Plan's `Theme` / `Focus Areas` → the monthly anchor row's `Theme` / `Focus Areas`.
4. (Optional) Repeat for the last few historical periods if you want the heatmap/history context to look continuous — not required, since the app only reads the *current* week/month for these fields.

This is a manual 5-minute copy in Notion. No code needed.

---

## 3. Worker changes (`worker.js`) — the bulk of the work

### 3.1 Remove Plans from the `DB` map and from `getData()`

- Delete the `Weekly Plans` and `Monthly Plans` entries from the `DB` map.
- Remove their two queries from the parallel `getData()` fan-out.
- While you're in here: also drop the dead **✅ Tasks** legacy DB (`972a5ee5…`) from the map — it's never queried and just invites confusion.
- Delete the Status-based "current plan" selection logic entirely (first Weekly Plan with `Status = In Progress`, etc.). This is the foot-gun that silently blanks the section when a Status isn't flipped — it goes away for free.

### 3.2 Add two anchor-row lookups

You already compute `currentWeek` (e.g. `"W28"`) and `currentMonth` (e.g. `"July"`) from the Brisbane date. Reuse them.

Illustrative (adapt to your real query helpers / property names):

```js
// Weekly anchor row for the current computed week
const weekAnchor = await queryOne(DB.weeklyTasks, {
  and: [
    { property: "Week",     select:  { equals: currentWeek } },
    { property: "Row Type", select:  { equals: "Review Anchor" } },
  ],
});

// Monthly anchor row for the current computed month
const monthAnchor = await queryOne(DB.monthlyTasks, {
  and: [
    { property: "Month",    select:  { equals: currentMonth } },
    { property: "Row Type", select:  { equals: "Review Anchor" } },
  ],
});
```

### 3.3 Rebuild the `week` and `month` payload slices (contract unchanged)

```js
// BEFORE: sourced from Weekly/Monthly Plans pages
// AFTER:  sourced from the anchor rows — SAME output shape

week = {
  id:   weekAnchor?.id ?? null,                 // now the anchor row's page id (write target)
  name: currentWeek,                            // "W28"
  priorities: parsePriorities(                  // reuse the existing newline parser
    richTextPlain(weekAnchor, "Top 3 Priorities")
  ),
};

month = {
  name:  currentMonth,                          // "July"
  theme: richTextPlain(monthAnchor, "Theme"),
  focus: richTextPlain(monthAnchor, "Focus Areas"),
};
```

Because the keys and types are identical to today, `adaptWorkerData()`, `WeekPriorities`, `MonthlyFocus`, and the Mantra fallback logic all keep working with **no change**.

### 3.4 Exclude anchor rows from task lists & heatmaps ⚠️

This is the one correctness trap. Anchor rows now live *inside* Weekly/Monthly Tasks, so every query that lists or **counts** tasks must filter them out, or your `done/total`, `weeklyHeatmap`, and `monthlyHeatmap` will be skewed by non-task rows.

Add `Row Type != "Review Anchor"` (i.e. `select is_empty` OR `equals "Task"`) to:
- the current-week `weeklyTasks` query
- the current-month `monthlyTasks` query
- the 12-week / 6-month heatmap fan-out queries
- the lazy drilldown queries (`?weeklyTask=`, `?monthlyTask=`) if an anchor row could ever be a relation parent (it won't normally, but filter defensively)

Daily Tasks are unaffected — no daily anchor rows exist.

### 3.5 Repoint the `set-weekly-priorities` write-back

In `handlePatch()`, change the target of `set-weekly-priorities` from "the current Weekly Plan page" to **the current week's anchor row** (`weekAnchor.id`), writing the `Top 3 Priorities` rich_text there.

- The write-back **`type` stays `set-weekly-priorities`**, so `SundayReview.jsx` and `writeback(...)` are unchanged on the frontend.
- Edge case: if `weekAnchor` doesn't exist yet when Sunday Review fires, create it on the fly (`Row Type = Review Anchor`, `Week = currentWeek`) then write — or rely on the bootstrap in §5. Never let a missing row throw.

> **Off-by-one sanity check:** your weeks run Sun–Sat, and "current week" is date-computed. On Sunday you're already inside the new week you're planning, so writing to the *current* week's anchor row is correct — no `+1` needed.

---

## 4. Frontend changes (`useNotionData.js` + components) — minimal

If §3 preserves the contract, this is mostly a no-op. Concretely:

- **`useNotionData.js`** — no logic change. Optionally bump the cache key `lp-data-v2` → `lp-data-v3` to force one clean refetch past any stale cached payload after deploy.
- **`SundayReview.jsx`** — no change (same `set-weekly-priorities` type).
- **`WeekPriorities.jsx`, `MonthlyFocus.jsx`, Mantra logic** — no change; same payload keys.
- **Comments/labels** — search the frontend for "Weekly Plan" / "Monthly Plan" mentions and update wording so future-you isn't misled.

If you'd rather *not* rely on cache-key bumping, confirm the stale-while-revalidate path re-renders once the fresh payload lands (it will; the amber `●` pulse is that refetch).

---

## 5. Anchor-row bootstrapping (low-energy resilience)

The app should never show blank priorities/theme just because you haven't created the anchor row yet. Two options:

- **Preferred:** extend the existing daily cron (6 AM Brisbane) — or add a light weekly/monthly trigger — to *ensure* the current week's and month's anchor rows exist (create if missing with `Row Type = Review Anchor`). This mirrors how you already auto-seed habit rows.
- **Fallback:** in the Worker read path, if `weekAnchor`/`monthAnchor` is null, return empty priorities/theme gracefully (`[]` / `""`) — never error. Then the first Sunday Review write (§3.5) creates it.

Do at least the fallback; the cron is the nicer version once you have energy.

---

## 6. Rollout plan (each phase independently shippable)

1. **Phase 1 — Notion only.** Add the 5 properties (§1). Create current week+month anchor rows and backfill (§2). *No code deployed yet; nothing breaks.*
2. **Phase 2 — Worker read, parallel-run.** Add the anchor lookups and build `week`/`month` from them, but **keep the Plans queries too** and log/compare both outputs for a few days. Verify the anchor-sourced payload matches what Plans produced. Also add the §3.4 anchor exclusions.
3. **Phase 3 — Cut over reads.** Delete the Plans read queries + Status-selection logic. Ship. Watch the dashboard for one week.
4. **Phase 4 — Cut over the write.** Repoint `set-weekly-priorities` to the anchor row (§3.5). Test a real Sunday Review write end-to-end.
5. **Phase 5 — Clean up.** Remove Plans (and legacy ✅ Tasks) from the `DB` map. Then **archive** 📋 Weekly Plans and 📆 Monthly Plans in Notion (don't hard-delete until you've lived a full month on the new setup).

You can stop after any phase and the app still works. Phases 1–2 are zero-risk.

---

## 7. Test checklist

- [ ] Daily tab: task counts / heatmaps unchanged (anchor rows excluded — verify `done/total` didn't jump).
- [ ] Weekly tab: `WeekPriorities` shows the same 3 lines as before cutover.
- [ ] Sunday Review: editing priorities writes to the **anchor row**, and re-reads correctly after refresh.
- [ ] Monthly tab: Mantra shows Monthly `Theme`; `MonthlyFocus` shows `Focus Areas`.
- [ ] Mantra fallback: clear `Theme` on the anchor row → confirm the hardcoded yearly mantra still shows.
- [ ] New week rollover: on the next computed week with no anchor row yet, the app shows empty priorities (not an error), and the first write creates the row.
- [ ] `weeklyHeatmap` / `monthlyHeatmap` totals match a manual Notion count for one period.
- [ ] Plans DBs receive **zero** reads/writes (check Worker logs / Notion's last-edited).

---

## 8. Rollback

Each phase reverts cleanly: re-enable the Plans queries in the Worker (kept in git history) and the app is back to sourcing from Plans. Because you *archive* rather than delete Plans in Phase 5, the data is still there if you un-archive. Keep Plans archived-not-deleted for at least one full monthly cycle.

---

## 9. Out of scope (deliberately) / future enhancements

- **Surfacing the Quarter layer.** Notion has a real **Quarterly Actions** DB between Goals and Monthly Tasks that the dashboard currently ignores (it models quarter as a `select` on Goals). Wiring `MonthlyFocus`/`Goals` to read Quarterly Actions is a separate, optional improvement — not needed to kill Plans.
- **Priorities-as-real-tasks (alternative semantic).** Instead of free-text `Top 3 Priorities`, you could *derive* weekly priorities from the current week's `Priority = High` Weekly Tasks, and turn Sunday Review into a task-picker. Upside: priorities become real, linked, roll-up-able tasks. Downside: bigger `SundayReview` rewrite and a behavior change. The migration above deliberately preserves your current free-text UX; treat this as a v2 once the cutover is stable.

---

*Design note: this reuses the review ritual's anchor rows as the app's meta store, so the two systems (your daily dashboard and the weekly/monthly review) share one home per period instead of drifting apart again. If `worker.js` ever diverges from this doc, the code wins — re-derive from it.*
