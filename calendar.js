// calendar.js — Google Calendar OAuth + API proxy for Life Planner Dashboard
// Single-tenant: exactly one Google account ever connects. Tokens live in
// Workers KV (binding CALENDAR_TOKENS), refreshed on read. Imported by
// worker.js, which delegates any /auth/google/* or /calendar* request here.

const GOOGLE_AUTH_URL      = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL     = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL  = "https://www.googleapis.com/oauth2/v2/userinfo";
const GOOGLE_CALENDAR_API  = "https://www.googleapis.com/calendar/v3";

// Keep in sync with worker.js's own UTC_OFFSET_HOURS — both encode the same
// "what timezone is 'today' in" decision, duplicated because calendar.js
// can't import from worker.js (worker.js imports calendar.js, not vice versa).
const UTC_OFFSET_HOURS = 10;
// `email` is added alongside `calendar` so the userinfo lookup in the
// callback can surface the connected address in the banner — the calendar
// scope alone doesn't grant access to userinfo.
const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");
const TOKENS_KEY   = "google:tokens";
const FRONTEND_URL = "https://lunkystch.com";
const REDIRECT_URI = "https://api.lunkystch.com/auth/google/callback";

// ── Response / cookie helpers ───────────────────────────────────────────────

function json(data, status, CORS) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function redirect(location, extraHeaders) {
  return new Response(null, { status: 302, headers: { Location: location, ...(extraHeaders || {}) } });
}

function getCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  const match  = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? match[1] : null;
}

// ── Token storage (KV) ───────────────────────────────────────────────────────

async function getTokens(env) {
  const raw = await env.CALENDAR_TOKENS.get(TOKENS_KEY);
  return raw ? JSON.parse(raw) : null;
}

async function saveTokens(env, tokens) {
  await env.CALENDAR_TOKENS.put(TOKENS_KEY, JSON.stringify(tokens));
}

async function refreshAccessToken(env, tokens) {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: tokens.refresh_token,
      grant_type:    "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Google token refresh failed: ${res.status}: ${await res.text()}`);
  const data = await res.json();

  const updated = {
    ...tokens,
    access_token: data.access_token,
    expires_at:   Date.now() + data.expires_in * 1000,
    updated_at:   Date.now(),
  };
  await saveTokens(env, updated);
  return updated;
}

// Proactively refreshes when the access token is within 2 minutes of expiry.
async function getValidAccessToken(env) {
  const tokens = await getTokens(env);
  if (!tokens) throw new Error("Google Calendar not connected");
  if (tokens.expires_at - Date.now() < 120_000) {
    const refreshed = await refreshAccessToken(env, tokens);
    return refreshed.access_token;
  }
  return tokens.access_token;
}

// Wraps a Google API call with a single refresh-and-retry on 401, as a
// safety net alongside getValidAccessToken's proactive refresh (clock skew,
// stale KV read).
async function googleFetch(env, url, options = {}) {
  const accessToken = await getValidAccessToken(env);
  const withAuth = (token) => fetch(url, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` },
  });

  let res = await withAuth(accessToken);
  if (res.status === 401) {
    const tokens = await getTokens(env);
    const refreshed = await refreshAccessToken(env, tokens);
    res = await withAuth(refreshed.access_token);
  }
  return res;
}

// ── Date helpers (day range only — week/month land with Phase C) ───────────

function offsetSuffix() {
  const sign = UTC_OFFSET_HOURS >= 0 ? "+" : "-";
  return `${sign}${String(Math.abs(UTC_OFFSET_HOURS)).padStart(2, "0")}:00`;
}

function addDaysToDateStr(dateStr, days) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().split("T")[0];
}

function dayRange(dateStr) {
  const suffix = offsetSuffix();
  return {
    timeMin: `${dateStr}T00:00:00${suffix}`,
    timeMax: `${addDaysToDateStr(dateStr, 1)}T00:00:00${suffix}`,
  };
}

function todayDateStr() {
  const ms = Date.now() + UTC_OFFSET_HOURS * 3600 * 1000;
  return new Date(ms).toISOString().split("T")[0];
}

// ── Calendar list + events ──────────────────────────────────────────────────

async function fetchCalendarList(env) {
  const res = await googleFetch(env, `${GOOGLE_CALENDAR_API}/users/me/calendarList`);
  if (!res.ok) throw new Error(`Calendar list failed: ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.items || [])
    .filter(c => !c.deleted)
    .map(c => ({
      id:         c.id,
      name:       c.summaryOverride || c.summary,
      color:      c.backgroundColor || "#5b9bf0",
      primary:    !!c.primary,
      selected:   c.selected !== false,
      accessRole: c.accessRole,
    }));
}

async function handleCalendarList(env, CORS) {
  const calendars = await fetchCalendarList(env);
  return json({ calendars }, 200, CORS);
}

function normalizeEvent(ev, calendarId) {
  return {
    id:          ev.id,
    calendarId,
    title:       ev.summary || "(untitled)",
    start:       ev.start?.dateTime || ev.start?.date || null,
    end:         ev.end?.dateTime   || ev.end?.date    || null,
    allDay:      !!ev.start?.date,
    location:    ev.location    || null,
    description: ev.description || null,
  };
}

async function handleCalendarEvents(request, env, CORS) {
  const url   = new URL(request.url);
  const range = url.searchParams.get("range") || "day";
  const date  = url.searchParams.get("date") || todayDateStr();

  if (range !== "day") {
    return json({ error: `range=${range} isn't supported yet — only "day"` }, 400, CORS);
  }

  const calParam = url.searchParams.get("cal");
  const calendarIds = calParam
    ? calParam.split(",").filter(Boolean)
    : (await fetchCalendarList(env)).filter(c => c.selected).map(c => c.id);

  const { timeMin, timeMax } = dayRange(date);
  const params = new URLSearchParams({ timeMin, timeMax, singleEvents: "true", orderBy: "startTime", maxResults: "250" });

  const errors = [];
  const eventLists = await Promise.all(calendarIds.map(async (calendarId) => {
    const res = await googleFetch(env, `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?${params}`);
    if (!res.ok) {
      errors.push({ calendarId, status: res.status });
      return [];
    }
    const data = await res.json();
    return (data.items || []).map(ev => normalizeEvent(ev, calendarId));
  }));

  const events = eventLists.flat().sort((a, b) => new Date(a.start) - new Date(b.start));
  return json({ date, events, ...(errors.length ? { errors } : {}) }, 200, CORS);
}

// ── OAuth flow ────────────────────────────────────────────────────────────────

function requireGoogleCredentials(env) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new Error("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET secrets not set — run: npx wrangler secret put GOOGLE_CLIENT_ID (and GOOGLE_CLIENT_SECRET)");
  }
}

async function handleAuthStart(request, env, CORS) {
  requireGoogleCredentials(env);

  const state = crypto.randomUUID();
  const params = new URLSearchParams({
    client_id:     env.GOOGLE_CLIENT_ID,
    redirect_uri:  REDIRECT_URI,
    response_type: "code",
    scope:         GOOGLE_SCOPES,
    access_type:   "offline",
    prompt:        "consent",
    state,
  });

  return redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`, {
    "Set-Cookie": `gcal_state=${state}; HttpOnly; Secure; SameSite=Lax; Max-Age=300; Path=/`,
  });
}

async function handleAuthCallback(request, env) {
  const url   = new URL(request.url);
  const code  = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const err   = url.searchParams.get("error");

  if (err) return redirect(`${FRONTEND_URL}/?tab=Calendar&gcal=error&reason=${encodeURIComponent(err)}`);

  const cookieState = getCookie(request, "gcal_state");
  if (!code || !state || !cookieState || state !== cookieState) {
    return redirect(`${FRONTEND_URL}/?tab=Calendar&gcal=error&reason=state_mismatch`);
  }

  const clearStateCookie = "gcal_state=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/";

  try {
    requireGoogleCredentials(env);

    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id:     env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        code,
        grant_type:    "authorization_code",
        redirect_uri:  REDIRECT_URI,
      }),
    });
    if (!tokenRes.ok) throw new Error(`Google token exchange failed: ${tokenRes.status}: ${await tokenRes.text()}`);
    const data = await tokenRes.json();

    if (!data.refresh_token) {
      throw new Error("Google did not return a refresh_token — revoke app access at https://myaccount.google.com/permissions and try connecting again");
    }

    const userinfoRes = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    const userinfo = userinfoRes.ok ? await userinfoRes.json() : {};

    const now = Date.now();
    await saveTokens(env, {
      access_token:  data.access_token,
      refresh_token: data.refresh_token,
      expires_at:    now + data.expires_in * 1000,
      email:         userinfo.email || null,
      connected_at:  now,
      updated_at:    now,
    });

    return redirect(`${FRONTEND_URL}/?tab=Calendar&gcal=connected`, { "Set-Cookie": clearStateCookie });
  } catch (e) {
    return redirect(`${FRONTEND_URL}/?tab=Calendar&gcal=error&reason=${encodeURIComponent(e.message)}`, { "Set-Cookie": clearStateCookie });
  }
}

// Exercises getValidAccessToken() (not just presence of a stored token) so a
// broken refresh_token shows up as disconnected rather than falsely "connected".
async function handleStatus(env, CORS) {
  const tokens = await getTokens(env);
  if (!tokens) return json({ connected: false }, 200, CORS);

  try {
    await getValidAccessToken(env);
  } catch (e) {
    return json({ connected: false, error: e.message }, 200, CORS);
  }

  const fresh = await getTokens(env);
  return json({
    connected:   true,
    email:       fresh.email,
    connectedAt: fresh.connected_at,
    updatedAt:   fresh.updated_at,
  }, 200, CORS);
}

// ── Entry point ──────────────────────────────────────────────────────────────

export async function handleCalendarRequest(request, env, CORS) {
  const url = new URL(request.url);

  if (request.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    if (url.pathname === "/auth/google/start")    return await handleAuthStart(request, env, CORS);
    if (url.pathname === "/auth/google/callback") return await handleAuthCallback(request, env);
    if (url.pathname === "/calendar/status")      return await handleStatus(env, CORS);
    if (url.pathname === "/calendar/calendars")   return await handleCalendarList(env, CORS);
    if (url.pathname === "/calendar")             return await handleCalendarEvents(request, env, CORS);

    return json({ error: "Not found" }, 404, CORS);
  } catch (e) {
    return json({ error: e.message }, 500, CORS);
  }
}
