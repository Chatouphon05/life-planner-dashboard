// Daily habit seeder — runs at 6 AM Laos time (23:00 UTC)
// Copies yesterday's habits into today with Done=false, streak auto-calculated
export const config = { runtime: 'edge' };

const NOTION_VERSION = "2022-06-28";
const HABITS_DB      = "e00177c934234bbebbcffed9cd847b98";

// Date in UTC+7 (Laos), with optional day offset
function laosDate(offsetDays = 0) {
  const ms = Date.now() + 7 * 3600 * 1000 + offsetDays * 86400 * 1000;
  return new Date(ms).toISOString().split("T")[0];
}

async function queryHabits(date, token) {
  const res = await fetch(`https://api.notion.com/v1/databases/${HABITS_DB}/query`, {
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
  });
  if (!res.ok) throw new Error(`Notion query failed: ${res.status} ${await res.text()}`);
  return (await res.json()).results;
}

async function createHabit({ name, category, streak }, date, token) {
  const properties = {
    "Habit":  { title: [{ text: { content: name } }] },
    "Date":   { date: { start: date } },
    "Done":   { checkbox: false },
    "Streak": { number: streak },
  };
  if (category) properties["Category"] = { select: { name: category } };

  const res = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization:    `Bearer ${token}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type":   "application/json",
    },
    body: JSON.stringify({ parent: { database_id: HABITS_DB }, properties }),
  });
  if (!res.ok) throw new Error(`Notion create failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export default async function handler(request) {
  // Verify Vercel cron secret
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("Authorization") || "";
    if (auth !== `Bearer ${cronSecret}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
  }

  const token     = process.env.NOTION_TOKEN;
  const today     = laosDate(0);
  const yesterday = laosDate(-1);

  // Idempotent — skip if today's habits already exist
  const todayHabits = await queryHabits(today, token);
  if (todayHabits.length > 0) {
    return new Response(JSON.stringify({
      ok: true, skipped: true,
      message: `${todayHabits.length} habits already exist for ${today}`,
    }));
  }

  // Use yesterday's habits as the template
  const yesterdayHabits = await queryHabits(yesterday, token);
  if (!yesterdayHabits.length) {
    return new Response(JSON.stringify({
      ok: false,
      message: `No habits found for ${yesterday} — create today's habits manually to seed the chain`,
    }), { status: 200 });
  }

  const getText   = p => p?.title?.map(r => r.plain_text).join("") || p?.rich_text?.map(r => r.plain_text).join("") || "";
  const getSelect = p => p?.select?.name || null;
  const getNum    = p => p?.number ?? 0;
  const getBool   = p => p?.checkbox ?? false;

  // Create today's habits in parallel, streak = yesterday streak + 1 if done, else 0
  const created = await Promise.all(
    yesterdayHabits.map(page => {
      const name     = getText(page.properties["Habit"]);
      const category = getSelect(page.properties["Category"]);
      const done     = getBool(page.properties["Done"]);
      const streak   = getNum(page.properties["Streak"]);
      return createHabit({ name, category, streak: done ? streak + 1 : 0 }, today, token);
    })
  );

  return new Response(JSON.stringify({
    ok: true, created: created.length, date: today,
  }));
}
