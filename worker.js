// Cloudflare Worker — Notion proxy for Life Planner Dashboard
// Deploy:    npx wrangler deploy
// Set token: npx wrangler secret put NOTION_TOKEN
// Logs:      npx wrangler tail

const NOTION_VERSION       = "2022-06-28";
const NOTION_TIMEOUT_MS    = 8000;
const ALLOWED_ORIGINS      = ["https://chatouphon05.github.io", "https://lunkystch.com", "https://www.lunkystch.com"];
const MONTH_NAMES          = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const DB = {
  tasks:         "972a5ee5fce3470796efa210a62ffdcb",
  daily_tasks:   "c88c5452b1224fc3a8e421c77447e063",
  weekly_tasks:  "5e77a48652b247ca99a86710e12094bb",
  monthly_tasks: "0eaa802009e147e1ac04425330958f06",
  habits:        "e00177c934234bbebbcffed9cd847b98",
  daily:         "f35023fab2344a4a8a71f87f6e7d9610",
  weekly:        "2682d573db944fcf84c08dac4acc1a02",
  monthly:       "a24a10e0ad52408ab4fdd70e2768b979",
  goals:         "bde57e266a3f43438d5913bf205c10f3",
  milestones:    "810fe48f4d1e494c9aa62d38bc62a316",
};

// ── Date helpers ──────────────────────────────────────────────────────────────

// TODO after Brisbane move (~Jun 7 2026): change +7 to +10 and update cron schedule
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

function getLast12Weeks(dateStr) {
  const weeks = [];
  const base  = new Date(dateStr + 'T12:00:00Z');
  for (let i = 11; i >= 0; i--) {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() - i * 7);
    weeks.push(getISOWeekStr(d.toISOString().split('T')[0]));
  }
  return weeks;
}

function getLast6Months(dateStr) {
  const months = [];
  const base   = new Date(dateStr + 'T12:00:00Z');
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() - i, 1));
    months.push(MONTH_NAMES[d.getUTCMonth()]);
  }
  return months;
}

// ── CORS ──────────────────────────────────────────────────────────────────────

const getAllowedOrigin = origin =>
  ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

const getCORS = origin => ({
  "Access-Control-Allow-Origin":  getAllowedOrigin(origin),
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age":       "86400",
});

// ── Notion helpers ────────────────────────────────────────────────────────────

const fmtId = id => {
  const s = id.replace(/-/g, '');
  return `${s.slice(0,8)}-${s.slice(8,12)}-${s.slice(12,16)}-${s.slice(16,20)}-${s.slice(20)}`;
};

async function notionQuery(dbId, filter, sorts, token) {
  const body = { page_size: 100 };
  if (filter) body.filter = filter;
  if (sorts)  body.sorts  = sorts;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NOTION_TIMEOUT_MS);

  try {
    const res = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
      method: "POST",
      headers: {
        Authorization:    `Bearer ${token}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type":   "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`Notion query ${dbId} → ${res.status}: ${await res.text()}`);
    return res.json();
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') throw new Error(`Notion query timed out (${dbId})`);
    throw err;
  }
}

async function notionPatch(pageId, properties, token) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NOTION_TIMEOUT_MS);

  try {
    const res = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
      method: "PATCH",
      headers: {
        Authorization:    `Bearer ${token}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type":   "application/json",
      },
      body: JSON.stringify({ properties }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`Notion patch ${pageId} → ${res.status}: ${await res.text()}`);
    return res.json();
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') throw new Error(`Notion patch timed out (${pageId})`);
    throw err;
  }
}

async function notionCreate(databaseId, properties, token) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NOTION_TIMEOUT_MS);

  try {
    const res = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization:    `Bearer ${token}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type":   "application/json",
      },
      body: JSON.stringify({ parent: { database_id: databaseId }, properties }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`Notion create failed: ${res.status}: ${await res.text()}`);
    return res.json();
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') throw new Error(`Notion create timed out`);
    throw err;
  }
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

// ── Main GET data ─────────────────────────────────────────────────────────────

async function getData(token) {
  const today            = laosDateStr();
  const historyStart     = new Date(today + "T12:00:00Z");
  historyStart.setUTCDate(historyStart.getUTCDate() - 13);
  const historyStartStr  = historyStart.toISOString().split("T")[0];
  const dateAxis         = buildDateAxis(today);
  const weekStr          = getISOWeekStr(today);
  const currentMonthName = MONTH_NAMES[new Date(today + "T12:00:00Z").getUTCMonth()];
  const last12Weeks      = getLast12Weeks(today);
  const last6Months      = getLast6Months(today);

  const q = (dbId, filter, sorts) => notionQuery(dbId, filter, sorts, token);

  const [
    tasksRes, habitsRes, dailyRes,
    weeklyRes, monthlyRes, goalsRes,
    taskHistoryRes, habitHistoryRes,
    weeklyTasksRes, monthlyTasksRes,
    milestonesRes, dailyHistoryRes,
  ] = await Promise.all([
    q(DB.daily_tasks, { property: "Date", date: { equals: today } }),
    q(DB.habits,      { property: "Date", date: { equals: today } }),
    q(DB.daily,       { property: "Date", date: { equals: today } }),
    q(DB.weekly,  { property: "Status", select: { equals: "In Progress" } }),
    q(DB.monthly, { or: [
      { property: "Status", select: { equals: "In Progress" } },
      { property: "Status", select: { equals: "Not Started" } },
    ]}),
    q(DB.goals, { or: [
      { property: "Status", select: { equals: "In Progress" } },
      { property: "Status", select: { equals: "On Track" } },
    ]}),
    q(DB.daily_tasks, { and: [
      { property: "Date", date: { on_or_after:  historyStartStr } },
      { property: "Date", date: { on_or_before: today } },
    ]}),
    q(DB.habits, { and: [
      { property: "Date", date: { on_or_after:  historyStartStr } },
      { property: "Date", date: { on_or_before: today } },
    ]}),
    q(DB.weekly_tasks,  { or: last12Weeks.map(w => ({ property: "Week",  select: { equals: w } })) }),
    q(DB.monthly_tasks, { or: last6Months.map(m => ({ property: "Month", select: { equals: m } })) }),
    q(DB.milestones, { or: [
      { property: "Status", select: { equals: "Upcoming" } },
      { property: "Status", select: { equals: "Active"   } },
    ]}).catch(() => ({ results: [] })),
    q(DB.daily, { and: [
      { property: "Date", date: { on_or_after:  historyStartStr } },
      { property: "Date", date: { on_or_before: today } },
    ]}),
  ]);

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

  const allWeeklyTasks = weeklyTasksRes.results.map(p => ({
    id:       getId(p),
    task:     getText(p.properties["Task"]),
    status:   getSelect(p.properties["Status"]),
    priority: getSelect(p.properties["Priority"]),
    week:     getSelect(p.properties["Week"]),
  })).filter(t => t.task);

  const weeklyTasks = allWeeklyTasks.filter(t => t.week === weekStr);

  const weeklyHeatmap = last12Weeks.map(w => {
    const bucket = allWeeklyTasks.filter(t => t.week === w);
    return {
      week:      w,
      done:      bucket.filter(t => t.status === 'Done').length,
      total:     bucket.length,
      isCurrent: w === weekStr,
    };
  });

  const allMonthlyTasks = monthlyTasksRes.results.map(p => ({
    id:       getId(p),
    task:     getText(p.properties["Task"]),
    status:   getSelect(p.properties["Status"]),
    priority: getSelect(p.properties["Priority"]),
    month:    getSelect(p.properties["Month"]),
  })).filter(t => t.task);

  const monthlyTasks = allMonthlyTasks.filter(t => t.month === currentMonthName);

  const monthlyHeatmap = last6Months.map(m => {
    const bucket = allMonthlyTasks.filter(t => t.month === m);
    return {
      month:     m,
      done:      bucket.filter(t => t.status === 'Done').length,
      total:     bucket.length,
      isCurrent: m === currentMonthName,
    };
  });

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

  const moodByDate = {};
  for (const p of dailyHistoryRes.results) {
    const date = getDate(p.properties["Date"]);
    if (!date) continue;
    moodByDate[date] = {
      mood:   getSelect(p.properties["Mood"]),
      energy: getSelect(p.properties["Energy"]),
    };
  }
  const moodHistory = dateAxis.map(date => ({
    date,
    mood:   moodByDate[date]?.mood   ?? null,
    energy: moodByDate[date]?.energy ?? null,
  }));

  const milestones = milestonesRes.results.map(p => ({
    id:       getId(p),
    name:     getText(p.properties["Name"]),
    date:     getDate(p.properties["Date"]),
    start:    getDate(p.properties["Start"]),
    category: getSelect(p.properties["Category"]),
    status:   getSelect(p.properties["Status"]),
  })).filter(m => m.name);

  return {
    today: { date: today, mood, energy, dailyId },
    tasks, taskHistory,
    habits, habitHistory,
    moodHistory,
    week:  { name: weekName, priorities },
    month: { name: monthName, theme: monthTheme, focus: monthFocus },
    goals,
    weeklyTasks, monthlyTasks,
    weeklyHeatmap, monthlyHeatmap,
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
    case "task-done":   await patch({ "Done":   { checkbox: value === true } }); break;
    case "habit-done":  await patch({ "Done":   { checkbox: value === true } }); break;
    case "task-status": await patch({ "Status": value ? { select: { name: value } } : { select: null } }); break;
    case "mood":        await patch({ "Mood":   value ? { select: { name: value } } : { select: null } }); break;
    case "energy":      await patch({ "Energy": value ? { select: { name: value } } : { select: null } }); break;
    default: throw new Error(`Unknown patch type: ${type}`);
  }
  return { ok: true, type, pageId };
}

// ── Cron: daily habit seeder ──────────────────────────────────────────────────

async function seedHabits(token) {
  const today     = laosDateStr(0);
  const yesterday = laosDateStr(-1);

  const [todayHabits, yesterdayHabits] = await Promise.all([
    notionQuery(DB.habits, { property: "Date", date: { equals: today     } }, null, token).then(r => r.results),
    notionQuery(DB.habits, { property: "Date", date: { equals: yesterday } }, null, token).then(r => r.results),
  ]);

  if (!yesterdayHabits.length) return {
    ok: false,
    message: `No habits for ${yesterday} — create today's habits manually to seed the chain`,
  };

  const existingNames = new Set(yesterdayHabits.map(p => getText(p.properties["Habit"])));
  const missing = todayHabits.length === 0
    ? yesterdayHabits
    : yesterdayHabits.filter(p => !existingNames.has(getText(p.properties["Habit"])));

  if (!missing.length) return {
    ok: true, skipped: true,
    message: `All ${todayHabits.length} habits already exist for ${today}`,
  };

  const results = await Promise.allSettled(
    missing.map(page => {
      const name     = getText(page.properties["Habit"]);
      const category = getSelect(page.properties["Category"]);
      const done     = getBool(page.properties["Done"]);
      const streak   = getNum(page.properties["Streak"]) ?? 0;
      const props = {
        "Habit":  { title: [{ text: { content: name } }] },
        "Date":   { date: { start: today } },
        "Done":   { checkbox: false },
        "Streak": { number: done ? streak + 1 : 0 },
      };
      if (category) props["Category"] = { select: { name: category } };
      return notionCreate(DB.habits, props, token);
    })
  );

  const succeeded = results.filter(r => r.status === 'fulfilled').length;
  const failed    = results
    .map((r, i) => r.status === 'rejected'
      ? { habit: getText(missing[i].properties["Habit"]), error: r.reason?.message }
      : null)
    .filter(Boolean);

  return { ok: failed.length === 0, created: succeeded, failed: failed.length ? failed : undefined, date: today };
}

// ── Cloudflare Worker export ──────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const token  = env.NOTION_TOKEN;
    const origin = request.headers.get("Origin") || "";
    const CORS   = getCORS(origin);

    if (!token) return new Response(
      JSON.stringify({ error: "NOTION_TOKEN secret not set — run: npx wrangler secret put NOTION_TOKEN" }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );

    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });

    if (request.method !== "GET" && !ALLOWED_ORIGINS.includes(origin)) return new Response(
      JSON.stringify({ error: "Forbidden" }),
      { status: 403, headers: { ...CORS, "Content-Type": "application/json" } }
    );

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
          headers: {
            ...CORS,
            "Content-Type":  "application/json",
            "Cache-Control": "s-maxage=45, stale-while-revalidate=120",
          },
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
        status: 405, headers: { ...CORS, "Content-Type": "application/json" },
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }
  },

  async scheduled(event, env) {
    // Cloudflare invokes this at the cron schedule — no HTTP auth needed
    await seedHabits(env.NOTION_TOKEN);
  },
};
