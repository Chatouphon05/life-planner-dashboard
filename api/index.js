// Vercel Edge Function — Notion proxy for Life Planner Dashboard
// Deploy: import repo to vercel.com, set NOTION_TOKEN env var
export const config = { runtime: 'edge' };

const NOTION_VERSION = "2022-06-28";
const ALLOWED_ORIGIN = "https://chatouphon05.github.io";

const DB = {
  tasks:   "972a5ee5fce3470796efa210a62ffdcb",
  habits:  "e00177c934234bbebbcffed9cd847b98",
  daily:   "f35023fab2344a4a8a71f87f6e7d9610",
  weekly:  "2682d573db944fcf84c08dac4acc1a02",
  monthly: "a24a10e0ad52408ab4fdd70e2768b979",
  goals:   "bde57e266a3f43438d5913bf205c10f3",
};

const CORS = {
  "Access-Control-Allow-Origin":  ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age":       "86400",
};

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

// ── GET handler ───────────────────────────────────────────────────────────────
async function getData(token) {
  const today = new Date().toISOString().split("T")[0];
  const historyStart = new Date(today + "T12:00:00Z");
  historyStart.setUTCDate(historyStart.getUTCDate() - 13);
  const historyStartStr = historyStart.toISOString().split("T")[0];
  const dateAxis = buildDateAxis(today);

  const q = (dbId, filter, sorts) => notionQuery(dbId, filter, sorts, token);

  const [
    tasksRes, habitsRes, dailyRes,
    weeklyRes, monthlyRes, goalsRes,
    taskHistoryRes, habitHistoryRes,
  ] = await Promise.all([
    q(DB.tasks,   { property: "Date", date: { equals: today } },
                  [{ property: "Priority", direction: "ascending" }]),
    q(DB.habits,  { property: "Date", date: { equals: today } }),
    q(DB.daily,   { property: "Date", date: { equals: today } }),
    q(DB.weekly,  { property: "Status", select: { equals: "In Progress" } }),
    q(DB.monthly, { or: [
      { property: "Status", select: { equals: "In Progress" } },
      { property: "Status", select: { equals: "Not Started" } },
    ]}),
    q(DB.goals, { or: [
      { property: "Status", select: { equals: "In Progress" } },
      { property: "Status", select: { equals: "On Track" } },
    ]}),
    q(DB.tasks,  { and: [
      { property: "Date", date: { on_or_after: historyStartStr } },
      { property: "Date", date: { on_or_before: today } },
    ]}),
    q(DB.habits, { and: [
      { property: "Date", date: { on_or_after: historyStartStr } },
      { property: "Date", date: { on_or_before: today } },
    ]}),
  ]);

  const tasks = tasksRes.results.map(p => ({
    id:       getId(p),
    task:     getText(p.properties["Task"]),
    done:     getBool(p.properties["Done"]),
    area:     getSelect(p.properties["Area"]),
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
  const monthName  = monthEntry ? getText(monthEntry.properties["Month"])       : "";
  const monthTheme = monthEntry ? getText(monthEntry.properties["Theme"])        : "";
  const monthFocus = monthEntry ? getText(monthEntry.properties["Focus Areas"])  : "";

  const goals = goalsRes.results.map(p => ({
    id:       getId(p),
    name:     getText(p.properties["Goal"]),
    area:     getSelect(p.properties["Area"]),
    progress: getNum(p.properties["Progress %"]),
    status:   getSelect(p.properties["Status"]),
    quarter:  getSelect(p.properties["Quarter"]),
  })).filter(g => g.name);

  // Task history: { date, done, total } × 14
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

  return {
    today: { date: today, mood, energy, dailyId },
    tasks, taskHistory,
    habits, habitHistory,
    week:  { name: weekName, priorities },
    month: { name: monthName, theme: monthTheme, focus: monthFocus },
    goals,
  };
}

// ── POST handler ──────────────────────────────────────────────────────────────
async function handlePatch(body, token) {
  const { type, pageId, value } = body;
  if (!pageId) throw new Error("pageId is required");
  const patch = (props) => notionPatch(pageId, props, token);

  switch (type) {
    case "task-done":  await patch({ "Done":   { checkbox: value === true } }); break;
    case "habit-done": await patch({ "Done":   { checkbox: value === true } }); break;
    case "mood":       await patch({ "Mood":   value ? { select: { name: value } } : { select: null } }); break;
    case "energy":     await patch({ "Energy": value ? { select: { name: value } } : { select: null } }); break;
    default: throw new Error(`Unknown patch type: ${type}`);
  }
  return { ok: true, type, pageId };
}

// ── Edge handler ──────────────────────────────────────────────────────────────
export default async function handler(request) {
  const token = process.env.NOTION_TOKEN;
  if (!token) {
    return new Response(JSON.stringify({ error: "NOTION_TOKEN env var not set" }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: CORS });
  }

  const origin = request.headers.get("Origin") || "";
  if (request.method !== "GET" && origin !== ALLOWED_ORIGIN) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  try {
    if (request.method === "GET") {
      const data = await getData(token);
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
