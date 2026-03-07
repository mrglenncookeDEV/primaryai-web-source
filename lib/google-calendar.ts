const GOOGLE_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID ||
  process.env.GOOGLE_OAUTH_CLIENT_ID ||
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET =
  process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_OAUTH_CLIENT_SECRET;

const OAUTH_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar",
];

function tokenEndpoint() {
  return "https://oauth2.googleapis.com/token";
}

export function isGoogleCalendarConfigured() {
  return Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
}

export function buildGoogleAuthorizeUrl({
  baseUrl,
  state,
  prompt = "select_account",
}: {
  baseUrl: string;
  state: string;
  prompt?: string;
}) {
  const redirectUri = `${baseUrl.replace(/\/$/, "")}/api/schedule/google-callback`;
  const params = new URLSearchParams({
    client_id: String(GOOGLE_CLIENT_ID),
    redirect_uri: redirectUri,
    response_type: "code",
    scope: OAUTH_SCOPES.join(" "),
    state,
    access_type: "offline",
    include_granted_scopes: "true",
    prompt,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

async function postForToken(body: URLSearchParams) {
  const response = await fetch(tokenEndpoint(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(String(data?.error_description || data?.error || "Google token exchange failed"));
  }
  return data;
}

async function requestGoogleApi<T>({
  accessToken,
  url,
  method = "GET",
  body,
}: {
  accessToken: string;
  url: string;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: Record<string, unknown>;
}) {
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  if (response.status === 204) {
    return null as T;
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(String(data?.error?.message || data?.error_description || "Google API request failed"));
  }
  return data as T;
}

export async function exchangeGoogleCode({
  code,
  baseUrl,
}: {
  code: string;
  baseUrl: string;
}) {
  const redirectUri = `${baseUrl.replace(/\/$/, "")}/api/schedule/google-callback`;
  return postForToken(
    new URLSearchParams({
      client_id: String(GOOGLE_CLIENT_ID),
      client_secret: String(GOOGLE_CLIENT_SECRET),
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  );
}

export async function refreshGoogleAccessToken(refreshToken: string) {
  return postForToken(
    new URLSearchParams({
      client_id: String(GOOGLE_CLIENT_ID),
      client_secret: String(GOOGLE_CLIENT_SECRET),
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  );
}

export async function fetchGoogleProfile(accessToken: string) {
  return requestGoogleApi<{
    id?: string;
    email?: string;
    name?: string;
  }>({
    accessToken,
    url: "https://www.googleapis.com/oauth2/v2/userinfo",
  });
}

export async function fetchGoogleCalendarEvents({
  accessToken,
  startIso,
  endIso,
}: {
  accessToken: string;
  startIso: string;
  endIso: string;
}) {
  const items: any[] = [];
  let nextPageToken = "";

  do {
    const params = new URLSearchParams({
      timeMin: startIso,
      timeMax: endIso,
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "250",
    });
    if (nextPageToken) params.set("pageToken", nextPageToken);

    const data = await requestGoogleApi<{ items?: any[]; nextPageToken?: string }>({
      accessToken,
      url: `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
    });

    items.push(...(Array.isArray(data?.items) ? data.items : []));
    nextPageToken = String(data?.nextPageToken || "");
  } while (nextPageToken);

  return items;
}

function toGoogleDateTime(date: string, time: string) {
  const resolvedDate = String(date || "").trim();
  const resolvedTime = String(time || "").slice(0, 5);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(resolvedDate) || !/^\d{2}:\d{2}$/.test(resolvedTime)) {
    throw new Error("Invalid schedule date/time for Google sync");
  }
  return {
    dateTime: `${resolvedDate}T${resolvedTime}:00`,
    timeZone: "Europe/London",
  };
}

export function googleDateTimeToScheduleParts(raw?: { dateTime?: string | null; date?: string | null } | null) {
  const dateTime = String(raw?.dateTime || "").trim();
  if (dateTime) {
    const [datePart, timePartRaw] = dateTime.split("T");
    const timePart = String(timePartRaw || "").slice(0, 5);
    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart) && /^\d{2}:\d{2}$/.test(timePart)) {
      return {
        scheduledDate: datePart,
        time: timePart,
      };
    }
  }
  return null;
}

export function buildGoogleNotes(event: any) {
  const bits = [
    event?.location ? `Location: ${String(event.location).trim()}` : "",
    event?.organizer?.email ? `Organiser: ${String(event.organizer.email).trim()}` : "",
    event?.description ? String(event.description).trim() : "",
    event?.htmlLink ? `Google Calendar: ${String(event.htmlLink).trim()}` : "",
  ].filter(Boolean);
  return bits.join("\n\n") || null;
}

export function buildGoogleEventPayload(event: {
  title: string;
  subject: string;
  yearGroup: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  notes?: string | null;
  eventType?: string | null;
  eventCategory?: string | null;
}) {
  const description = [
    "PrimaryAI schedule item",
    event.subject ? `Subject: ${event.subject}` : "",
    event.yearGroup ? `Year group: ${event.yearGroup}` : "",
    event.eventType ? `Type: ${event.eventType}` : "",
    event.eventCategory ? `Category: ${event.eventCategory}` : "",
    event.notes ? `Notes:\n${String(event.notes).trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    summary: event.title,
    description,
    start: toGoogleDateTime(event.scheduledDate, event.startTime),
    end: toGoogleDateTime(event.scheduledDate, event.endTime),
    source: {
      title: "PrimaryAI",
      url: "https://primaryAI.org.uk",
    },
  };
}

export async function createGoogleCalendarEvent(args: {
  accessToken: string;
  payload: ReturnType<typeof buildGoogleEventPayload>;
}) {
  return requestGoogleApi<{ id: string }>({
    accessToken: args.accessToken,
    url: "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    method: "POST",
    body: args.payload,
  });
}

export async function updateGoogleCalendarEvent(args: {
  accessToken: string;
  eventId: string;
  payload: ReturnType<typeof buildGoogleEventPayload>;
}) {
  return requestGoogleApi({
    accessToken: args.accessToken,
    url: `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(args.eventId)}`,
    method: "PATCH",
    body: args.payload,
  });
}

export async function deleteGoogleCalendarEvent(args: {
  accessToken: string;
  eventId: string;
}) {
  try {
    await requestGoogleApi({
      accessToken: args.accessToken,
      url: `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(args.eventId)}`,
      method: "DELETE",
    });
  } catch (error) {
    const message = String((error as Error)?.message || "").toLowerCase();
    if (message.includes("not found")) return;
    throw error;
  }
}

export function hasGoogleWriteScope(scope?: string | null) {
  return String(scope || "")
    .toLowerCase()
    .split(/\s+/)
    .includes("https://www.googleapis.com/auth/calendar");
}
