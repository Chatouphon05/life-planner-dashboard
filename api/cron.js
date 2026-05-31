// Daily habit seeder — runs at 6 AM Laos time (23:00 UTC)
// Copies yesterday's habits into today with Done=false, streak auto-calculated
export const config = { runtime: 'edge' };

const NOTION_VERSION    = "2022-06-28";
const HABITS_DB         = "e00177c934234bbebbcffed9cd847b98";
const NOTION_TIMEOUT_MS = 10000;

// Date in UTC+7 (Laos/Bangkok), with optional day offset.
// TODO after Brisbane move (≈ Jun 7 2026): flip to UTC+10 and update cron schedule to "0 20 * * *"
function laosDate(offsetDays = 0) {
  const ms = Date.now() + 7 * 3600 * 1000 + offsetDays * 86400 * 1000;
  return new Date(ms).toISOString().split("T")[0];
}

function withTimeout(fetchPromise, ms, label) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetchPromise(controller.signal).finally(() => clearTimeout(timer)).catch(err => {
    if (err.name === 'AbortError') throw new Error(`Notion timed out (${label})`);
    throw err;
  });
}

async function queryHabits(date, token) {
  return withTimeout(signal => fetch(`https://api.notion.com/v1/databases/${HABITS_DB}/query`, {
    method: "POST",
    headers: {
      Authorization:    `Bearer ${token}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type":   "application/json",
    },
    body: JSON.stringify({
      page_size: 50,
      filter: { property: "Date", date: { equals: date } },
    }),
    signal,
  }).then(async res => {
    if (!res.ok) throw new Error(`Notion query failed: ${res.status} ${await res.text()}`);
    return (await res.json()).results;
  }), NOTION_TIMEOUT_MS, `queryHabits(${date})`);
}

async function createHabit({ name, category, streak }, date, token) {
  const properties = {
    "Habit":  { title: [{ text: { content: name } }] },
    "Date":   { date: { start: date } },
    "Done":   { checkbox: false },
    "Streak": { number: streak },
  };
  if (category) properties["Category"] = { select: { name: category } };

  return withTimeout(signal => fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization:    `Bearer ${token}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type":   "application/json",
    },
    body: JSON.stringify({ parent: { database_id: HABITS_DB }, properties }),
    signal,
  }).then(async res => {
    if (!res.ok) throw new Error(`Notion create failed: ${res.status} ${await res.text()}`);
    return res.json();
  }), NOTION_TIMEOUT_MS, `createHabit(${name})`);
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export default async function handler(request) {
  // Verify Vercel cron secret
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("Authorization") || "";
    if (auth !== `Bearer ${cronSecret}`) {
      return json({ error: "Unauthorized" }, 401);
    }
  }

  const token     = process.env.NOTION_TOKEN;
  const today     = laosDate(0);
  const yesterday = laosDate(-1);

  // Get both today and yesterday in parallel
  let todayHabits, yesterdayHabits;
  try {
    [todayHabits, yesterdayHabits] = await Promise.all([
      queryHabits(today, token),
      queryHabits(yesterday, token),
    ]);
  } catch (err) {
    return json({ ok: false, error: err.message, today, yesterday }, 500);
  }

  if (!yesterdayHabits.length) {
    return json({
      ok: false,
      message: `No habits found for ${yesterday} — create today's habits manually to seed the chain`,
    });
  }

  const getText   = p => p?.title?.map(r => r.plain_text).join("") || p?.rich_text?.map(r => r.plain_text).join("") || "";
  const getSelect = p => p?.select?.name || null;
  const getNum    = p => p?.number ?? 0;
  const getBool   = p => p?.checkbox ?? false;

  // Only create habits that don't already exist today (match by name)
  const existingNames = new Set(todayHabits.map(p => getText(p.properties["Habit"])));

  const missing = yesterdayHabits.filter(page =>
    !existingNames.has(getText(page.properties["Habit"]))
  );

  if (!missing.length) {
    return json({
      ok: true, skipped: true,
      message: `All ${todayHabits.length} habits already exist for ${today}`,
    });
  }

  // Use allSettled so a single Notion hiccup doesn't abort the whole batch
  const results = await Promise.allSettled(
    missing.map(page => {
      const name     = getText(page.properties["Habit"]);
      const category = getSelect(page.properties["Category"]);
      const done     = getBool(page.properties["Done"]);
      const streak   = getNum(page.properties["Streak"]);
      return createHabit({ name, category, streak: done ? streak + 1 : 0 }, today, token);
    })
  );

  const succeeded = results.filter(r => r.status === 'fulfilled').length;
  const failed    = results
    .map((r, i) => r.status === 'rejected'
      ? { habit: getText(missing[i].properties["Habit"]), error: r.reason?.message }
      : null)
    .filter(Boolean);

  return json({
    ok:      failed.length === 0,
    created: succeeded,
    skipped: existingNames.size,
    failed:  failed.length ? failed : undefined,
    date:    today,
  });
}
