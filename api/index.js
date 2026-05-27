// Vercel Edge Function — Notion proxy for Life Planner Dashboard
// Deploy: import repo to vercel.com, set NOTION_TOKEN env var
export const config = { runtime: 'edge' };

const NOTION_VERSION = "2022-06-28";
const ALLOWED_ORIGINS = [
  "https://chatouphon05.github.io",
  "https://life-planner-dashboard.vercel.app",
];

const DB = {
  tasks:          "972a5ee5fce3470796efa210a62ffdcb",  // ✅ legacy standalone Tasks
  daily_tasks:    "c88c5452b1224fc3a8e421c77447e063",  // ☀️ Daily Tasks (hierarchy)
  weekly_tasks:   "5e77a48652b247ca99a86710e12094bb",  // 📋 Weekly Tasks
  monthly_tasks:  "0eaa802009e147e1ac04425330958f06",  // 🗓️ Monthly Tasks
  habits:         "e00177c934234bbebbcffed9cd847b98",
  daily:          "f35023fab2344a4a8a71f87f6e7d9610",
  weekly:         "2682d573db944fcf84c08dac4acc1a02",
  monthly:        "a24a10e0ad52408ab4fdd70e2768b979",
  goals:          "bde57e266a3f43438d5913bf205c10f3",
  milestones:     "810fe48f4d1e494c9aa62d38bc62a316",  // 🏁 Milestones
};

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// Format 32-char hex ID back to UUID with dashes (required for Notion relation filters)
const fmtId = id => {
  const s = id.replace(/-/g, '');
  return `${s.slice(0,8)}-${s.slice(8,12)}-${s.slice(12,16)}-${s.slice(16,20)}-${s.slice(20)}`;
};

// Returns YYYY-MM-DD in Laos time (UTC+7)
function laosDateStr(offsetDays = 0) {
  const ms = Date.now() + 7 * 3600 * 1000 + offsetDays * 86400 * 1000;
  return new Date(ms).toISOString().split("T")[0];
}

function getISOWeekStr(dateStr) {
  const [y, m, day] = dateStr.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1, day));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo    = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `W${String(weekNo).padStart(2, '0')}`;
}

const getAllowedOrigin = (origin) =>
  ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

const getCORS = (origin) => ({
  "Access-Control-Allow-Origin":  getAllowedOrigin(origin),
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age":       "86400",
});

// ── Notion helpers ────────────────────────────────────────────────────────────
async function notionQuery(dbId, filter, sorts, token) {
  const body = { page_size: 100 };
  if (filter) body.filter = filter;
  if (sorts)  body.sorts  = sorts;
  const res = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Notion query ${dbId} → ${res.status}: ${await res.text()}`);
  return res.json();
}

async function notionPatch(pageId, properties, token) {
  const res = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ properties }),
  });
  if (!res.ok) throw new Error(`Notion patch ${pageId} → ${res.status}: ${await res.text()}`);
  return res.json();
}

// ── Property parsers ──────────────────────────────────────────────────────────
const getText   = p => p?.rich_text?.map(r => r.plain_text).join("") || p?.title?.map(r => r.plain_text).join("") || "";
const getSelect = p => p?.select?.name || null;
const getNum    = p => p?.number ?? null;
const getBool   = p => p?.checkbox ?? false;
const getDate   = p => p?.date?.start?.split("T")[0] || null;
const getId     = page => page.id.replace(/-/g, "");

function buildDateAxis(today) {
  const axis = [];
  const base = new Date(today + "T12:00:00Z");
  for (let i = 13; i >= 0; i--) {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() - i);
    axis.push(d.toISOString().split("T")[0]);
  }
  return axis;
}

// ── Drilldown queries ─────────────────────────────────────────────────────────

async function getWeeklyTaskDrilldown(weeklyTaskId, token) {
  const res = await notionQuery(DB.daily_tasks, {
    property: "Weekly Task",
    relation: { contains: fmtId(weeklyTaskId) },
  }, [{ property: "Date", direction: "ascending" }], token);

  return res.results.map(p => ({
    id:       getId(p),
    task:     getText(p.properties["Task"]),
    done:     getBool(p.properties["Done"]),
    date:     getDate(p.properties["Date"]),
    priority: getSelect(p.properties["Priority"]),
  })).filter(t => t.task);
}

async function getMonthlyTaskDrilldown(monthlyTaskId, token) {
  const weeklyRes = await notionQuery(DB.weekly_tasks, {
    property: "Monthly Task",
    relation: { contains: fmtId(monthlyTaskId) },
  }, null, token);

  const weeklyTasks = weeklyRes.results.map(p => ({
    id:       getId(p),
    task:     getText(p.properties["Task"]),
    status:   getSelect(p.properties["Status"]),
    priority: getSelect(p.properties["Priority"]),
    week:     getSelect(p.properties["Week"]),
  })).filter(t => t.task);

  const dailyResults = await Promise.all(
    weeklyTasks.map(wt =>
      notionQuery(DB.daily_tasks, {
        property: "Weekly Task",
        relation: { contains: fmtId(wt.id) },
      }, [{ property: "Date", direction: "ascending" }], token)
    )
  );

  return weeklyTasks.map((wt, i) => ({
    ...wt,
    dailyTasks: dailyResults[i].results.map(p => ({
      id:   getId(p),
      task: getText(p.properties["Task"]),
      done: getBool(p.properties["Done"]),
      date: getDate(p.properties["Date"]),
    })).filter(t => t.task),
  }));
}

// ── GET handler ───────────────────────────────────────────────────────────────
async function getData(token) {
  const today          = laosDateStr();
  const historyStart   = new Date(today + "T12:00:00Z");
  historyStart.setUTCDate(historyStart.getUTCDate() - 13);
  const historyStartStr  = historyStart.toISOString().split("T")[0];
  const dateAxis         = buildDateAxis(today);
  const weekStr          = getISOWeekStr(today);
  const currentMonthName = MONTH_NAMES[new Date(today + "T12:00:00Z").getUTCMonth()];

  const q = (dbId, filter, sorts) => notionQuery(dbId, filter, sorts, token);

  const [
    tasksRes, habitsRes, dailyRes,
    weeklyRes, monthlyRes, goalsRes,
    taskHistoryRes, habitHistoryRes,
    weeklyTasksRes, monthlyTasksRes,
    milestonesRes,
  ] = await Promise.all([
    // Daily Tasks filtered by today (replaces standalone Tasks)
    q(DB.daily_tasks, { property: "Date", date: { equals: today } }),
    q(DB.habits,      { property: "Date", date: { equals: today } }),
    q(DB.daily,       { property: "Date", date: { equals: today } }),
    // Weekly/Monthly Plans for context
    q(DB.weekly,  { property: "Status", select: { equals: "In Progress" } }),
    q(DB.monthly, { or: [
      { property: "Status", select: { equals: "In Progress" } },
      { property: "Status", select: { equals: "Not Started" } },
    ]}),
    q(DB.goals, { or: [
      { property: "Status", select: { equals: "In Progress" } },
      { property: "Status", select: { equals: "On Track" } },
    ]}),
    // History for heatmaps
    q(DB.daily_tasks, { and: [
      { property: "Date", date: { on_or_after:  historyStartStr } },
      { property: "Date", date: { on_or_before: today } },
    ]}),
    q(DB.habits, { and: [
      { property: "Date", date: { on_or_after:  historyStartStr } },
      { property: "Date", date: { on_or_before: today } },
    ]}),
    // Hierarchical task lists
    q(DB.weekly_tasks,  { property: "Week",  select: { equals: weekStr          } }),
    q(DB.monthly_tasks, { property: "Month", select: { equals: currentMonthName } }),
    // Milestones — Upcoming + Active only
    q(DB.milestones, { or: [
      { property: "Status", select: { equals: "Upcoming" } },
      { property: "Status", select: { equals: "Active"   } },
    ]}),
  ]);

  // Daily tasks (today)
  const tasks = tasksRes.results.map(p => ({
    id:       getId(p),
    task:     getText(p.properties["Task"]),
    done:     getBool(p.properties["Done"]),
    priority: getSelect(p.properties["Priority"]),
  })).filter(t => t.task);

  const habits = habitsRes.results.map(p => ({
    id:       getId(p),
    habit:    getText(p.properties["Habit"]),
    done:     getBool(p.properties["Done"]),
    category: getSelect(p.properties["Category"]),
    streak:   getNum(p.properties["Streak"]),
  })).filter(h => h.habit);

  const dailyEntry = dailyRes.results[0];
  const mood    = dailyEntry ? getSelect(dailyEntry.properties["Mood"])   : null;
  const energy  = dailyEntry ? getSelect(dailyEntry.properties["Energy"]) : null;
  const dailyId = dailyEntry ? getId(dailyEntry) : null;

  const weekEntry  = weeklyRes.results[0];
  const weekName   = weekEntry ? getText(weekEntry.properties["Week"]) : "";
  const weekRaw    = weekEntry ? getText(weekEntry.properties["Top 3 Priorities"]) : "";
  const priorities = weekRaw.split("\n")
    .map(t => t.replace(/^[-•*\d.]\s*/, "").trim())
    .filter(Boolean);

  const monthEntry = monthlyRes.results[0];
  const monthName  = monthEntry ? getText(monthEntry.properties["Month"])      : "";
  const monthTheme = monthEntry ? getText(monthEntry.properties["Theme"])       : "";
  const monthFocus = monthEntry ? getText(monthEntry.properties["Focus Areas"]) : "";

  const goals = goalsRes.results.map(p => ({
    id:       getId(p),
    name:     getText(p.properties["Goal"]),
    area:     getSelect(p.properties["Area"]),
    progress: getNum(p.properties["Progress %"]),
    status:   getSelect(p.properties["Status"]),
    quarter:  getSelect(p.properties["Quarter"]),
  })).filter(g => g.name);

  // Weekly tasks for current ISO week
  const weeklyTasks = weeklyTasksRes.results.map(p => ({
    id:       getId(p),
    task:     getText(p.properties["Task"]),
    status:   getSelect(p.properties["Status"]),
    priority: getSelect(p.properties["Priority"]),
    week:     getSelect(p.properties["Week"]),
  })).filter(t => t.task);

  // Monthly tasks for current month
  const monthlyTasks = monthlyTasksRes.results.map(p => ({
    id:       getId(p),
    task:     getText(p.properties["Task"]),
    status:   getSelect(p.properties["Status"]),
    priority: getSelect(p.properties["Priority"]),
    month:    getSelect(p.properties["Month"]),
  })).filter(t => t.task);

  // Task history: { date, done, total } × 14 (sourced from Daily Tasks)
  const taskByDate = {};
  for (const p of taskHistoryRes.results) {
    const date = getDate(p.properties["Date"]);
    if (!date) continue;
    if (!taskByDate[date]) taskByDate[date] = { done: 0, total: 0 };
    taskByDate[date].total++;
    if (getBool(p.properties["Done"])) taskByDate[date].done++;
  }
  const taskHistory = dateAxis.map(date => ({
    date,
    done:  taskByDate[date]?.done  ?? 0,
    total: taskByDate[date]?.total ?? 0,
  }));

  // Habit history: { habitName: [null|0|1] × 14 }
  const allHabitNames = [...new Set([
    ...habits.map(h => h.habit),
    ...habitHistoryRes.results.map(p => getText(p.properties["Habit"])).filter(Boolean),
  ])];
  const habitByDateName = {};
  for (const p of habitHistoryRes.results) {
    const date = getDate(p.properties["Date"]);
    const name = getText(p.properties["Habit"]);
    if (!date || !name) continue;
    if (!habitByDateName[date]) habitByDateName[date] = {};
    habitByDateName[date][name] = getBool(p.properties["Done"]);
  }
  const habitHistory = {};
  for (const name of allHabitNames) {
    habitHistory[name] = dateAxis.map(date => {
      const day = habitByDateName[date];
      if (!day || !(name in day)) return null;
      return day[name] ? 1 : 0;
    });
  }

  // Auto-promote Upcoming → Active when Start date has arrived
  const toActivate = milestonesRes.results.filter(p => {
    const status = getSelect(p.properties["Status"]);
    const start  = getDate(p.properties["Start"]);
    return status === "Upcoming" && start && start <= today;
  });
  if (toActivate.length > 0) {
    await Promise.all(
      toActivate.map(p =>
        notionPatch(p.id, { "Status": { select: { name: "Active" } } }, token)
      )
    );
  }
  const activatedIds = new Set(toActivate.map(p => p.id));

  const milestones = milestonesRes.results.map(p => ({
    id:       getId(p),
    name:     getText(p.properties["Name"]),
    date:     getDate(p.properties["Date"]),
    start:    getDate(p.properties["Start"]),
    category: getSelect(p.properties["Category"]),
    status:   activatedIds.has(p.id) ? "Active" : getSelect(p.properties["Status"]),
  })).filter(m => m.name);

  return {
    today: { date: today, mood, energy, dailyId },
    tasks, taskHistory,
    habits, habitHistory,
    week:  { name: weekName, priorities },
    month: { name: monthName, theme: monthTheme, focus: monthFocus },
    goals,
    weeklyTasks,
    monthlyTasks,
    currentWeek:  weekStr,
    currentMonth: currentMonthName,
    milestones,
  };
}

// ── POST handler ──────────────────────────────────────────────────────────────
async function handlePatch(body, token) {
  const { type, pageId, value } = body;
  if (!pageId) throw new Error("pageId is required");
  const patch = (props) => notionPatch(pageId, props, token);

  switch (type) {
    case "daily-task-done":
    case "task-done":    await patch({ "Done":   { checkbox: value === true } }); break;
    case "habit-done":   await patch({ "Done":   { checkbox: value === true } }); break;
    case "task-status":  await patch({ "Status": value ? { select: { name: value } } : { select: null } }); break;
    case "mood":         await patch({ "Mood":   value ? { select: { name: value } } : { select: null } }); break;
    case "energy":       await patch({ "Energy": value ? { select: { name: value } } : { select: null } }); break;
    default: throw new Error(`Unknown patch type: ${type}`);
  }
  return { ok: true, type, pageId };
}

// ── Edge handler ──────────────────────────────────────────────────────────────
export default async function handler(request) {
  const token = process.env.NOTION_TOKEN;
  const origin = request.headers.get("Origin") || "";
  const CORS = getCORS(origin);

  if (!token) {
    return new Response(JSON.stringify({ error: "NOTION_TOKEN env var not set" }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: CORS });
  }

  if (request.method !== "GET" && !ALLOWED_ORIGINS.includes(origin)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  try {
    if (request.method === "GET") {
      const url           = new URL(request.url);
      const weeklyTaskId  = url.searchParams.get("weeklyTask");
      const monthlyTaskId = url.searchParams.get("monthlyTask");

      let data;
      if (weeklyTaskId)       data = await getWeeklyTaskDrilldown(weeklyTaskId, token);
      else if (monthlyTaskId) data = await getMonthlyTaskDrilldown(monthlyTaskId, token);
      else                    data = await getData(token);

      return new Response(JSON.stringify(data), {
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }
    if (request.method === "POST") {
      const body   = await request.json();
      const result = await handlePatch(body, token);
      return new Response(JSON.stringify(result), {
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
}
