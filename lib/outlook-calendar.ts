const MICROSOFT_CLIENT_ID =
  process.env.MICROSOFT_CLIENT_ID ||
  process.env.AZURE_CLIENT_ID ||
  process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID;
const MICROSOFT_CLIENT_SECRET =
  process.env.MICROSOFT_CLIENT_SECRET || process.env.AZURE_CLIENT_SECRET;
const MICROSOFT_TENANT_ID = process.env.MICROSOFT_TENANT_ID || "common";

const OAUTH_SCOPES = ["openid", "profile", "offline_access", "User.Read", "Calendars.ReadWrite"];

function oauthBase() {
  return `https://login.microsoftonline.com/${MICROSOFT_TENANT_ID}/oauth2/v2.0`;
}

function tokenEndpoint() {
  return `${oauthBase()}/token`;
}

export function isOutlookConfigured() {
  return Boolean(MICROSOFT_CLIENT_ID && MICROSOFT_CLIENT_SECRET);
}

export function getOutlookOauthConfig() {
  return {
    clientId: MICROSOFT_CLIENT_ID,
    clientSecret: MICROSOFT_CLIENT_SECRET,
    tenantId: MICROSOFT_TENANT_ID,
    scopes: OAUTH_SCOPES,
  };
}

export function buildOutlookAuthorizeUrl({
  baseUrl,
  state,
  prompt = "select_account",
}: {
  baseUrl: string;
  state: string;
  prompt?: string;
}) {
  const redirectUri = `${baseUrl.replace(/\/$/, "")}/api/schedule/outlook-callback`;
  const params = new URLSearchParams({
    client_id: String(MICROSOFT_CLIENT_ID),
    response_type: "code",
    redirect_uri: redirectUri,
    response_mode: "query",
    scope: OAUTH_SCOPES.join(" "),
    state,
    prompt,
  });

  return `${oauthBase()}/authorize?${params.toString()}`;
}

async function postForToken(body: URLSearchParams) {
  const response = await fetch(tokenEndpoint(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(String(data?.error_description || data?.error || "Microsoft token exchange failed"));
  }

  return data;
}

async function requestMicrosoftGraph<T>({
  accessToken,
  path,
  method = "GET",
  body,
}: {
  accessToken: string;
  path: string;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: Record<string, unknown>;
}) {
  const response = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: 'outlook.timezone="GMT Standard Time"',
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  if (response.status === 204) {
    return null as T;
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(String(data?.error?.message || data?.error_description || "Microsoft Graph request failed"));
  }

  return data as T;
}

export async function exchangeMicrosoftCode({
  code,
  baseUrl,
}: {
  code: string;
  baseUrl: string;
}) {
  const redirectUri = `${baseUrl.replace(/\/$/, "")}/api/schedule/outlook-callback`;
  return postForToken(
    new URLSearchParams({
      client_id: String(MICROSOFT_CLIENT_ID),
      client_secret: String(MICROSOFT_CLIENT_SECRET),
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      scope: OAUTH_SCOPES.join(" "),
    }),
  );
}

export async function refreshMicrosoftAccessToken(refreshToken: string) {
  return postForToken(
    new URLSearchParams({
      client_id: String(MICROSOFT_CLIENT_ID),
      client_secret: String(MICROSOFT_CLIENT_SECRET),
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      scope: OAUTH_SCOPES.join(" "),
    }),
  );
}

export async function fetchMicrosoftProfile(accessToken: string) {
  return requestMicrosoftGraph<{
    id?: string;
    mail?: string | null;
    userPrincipalName?: string | null;
    displayName?: string | null;
  }>({
    accessToken,
    path: "/me?$select=id,mail,userPrincipalName,displayName",
  });
}

export async function fetchMicrosoftCalendarView({
  accessToken,
  startIso,
  endIso,
}: {
  accessToken: string;
  startIso: string;
  endIso: string;
}) {
  const items: any[] = [];
  let nextUrl = `https://graph.microsoft.com/v1.0/me/calendarView?${new URLSearchParams({
    startDateTime: startIso,
    endDateTime: endIso,
    $top: "200",
    $select:
      "id,subject,start,end,isAllDay,isCancelled,showAs,webLink,location,bodyPreview,organizer,lastModifiedDateTime",
  }).toString()}`;

  while (nextUrl) {
    const response = await fetch(nextUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Prefer: 'outlook.timezone="GMT Standard Time"',
      },
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(String(data?.error?.message || "Could not load Outlook calendar view"));
    }
    items.push(...(Array.isArray(data?.value) ? data.value : []));
    nextUrl = typeof data?.["@odata.nextLink"] === "string" ? data["@odata.nextLink"] : "";
  }

  return items;
}

function toGraphDateTimeParts(date: string, time: string) {
  const resolvedDate = String(date || "").trim();
  const resolvedTime = String(time || "").slice(0, 5);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(resolvedDate) || !/^\d{2}:\d{2}$/.test(resolvedTime)) {
    throw new Error("Invalid schedule date/time for Outlook sync");
  }

  return {
    dateTime: `${resolvedDate}T${resolvedTime}:00`,
    timeZone: "GMT Standard Time",
  };
}

export function buildOutlookEventPayload(event: {
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
  const summary = [
    `PrimaryAI schedule item`,
    event.subject ? `Subject: ${event.subject}` : "",
    event.yearGroup ? `Year group: ${event.yearGroup}` : "",
    event.eventType ? `Type: ${event.eventType}` : "",
    event.eventCategory ? `Category: ${event.eventCategory}` : "",
    event.notes ? `Notes:\n${String(event.notes).trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    subject: event.title,
    body: {
      contentType: "text",
      content: summary,
    },
    start: toGraphDateTimeParts(event.scheduledDate, event.startTime),
    end: toGraphDateTimeParts(event.scheduledDate, event.endTime),
    categories: ["PrimaryAI"],
  };
}

export async function createMicrosoftCalendarEvent(args: {
  accessToken: string;
  payload: ReturnType<typeof buildOutlookEventPayload>;
}) {
  return requestMicrosoftGraph<{ id: string }>({
    accessToken: args.accessToken,
    path: "/me/events",
    method: "POST",
    body: args.payload,
  });
}

export async function updateMicrosoftCalendarEvent(args: {
  accessToken: string;
  eventId: string;
  payload: ReturnType<typeof buildOutlookEventPayload>;
}) {
  return requestMicrosoftGraph({
    accessToken: args.accessToken,
    path: `/me/events/${encodeURIComponent(args.eventId)}`,
    method: "PATCH",
    body: args.payload,
  });
}

export async function deleteMicrosoftCalendarEvent(args: {
  accessToken: string;
  eventId: string;
}) {
  try {
    await requestMicrosoftGraph({
      accessToken: args.accessToken,
      path: `/me/events/${encodeURIComponent(args.eventId)}`,
      method: "DELETE",
    });
  } catch (error) {
    const message = String((error as Error)?.message || "");
    if (message.toLowerCase().includes("resource could not be discovered")) {
      return;
    }
    throw error;
  }
}

export function graphDateTimeToScheduleParts(raw: { dateTime?: string | null }) {
  const value = String(raw?.dateTime || "").trim();
  if (!value) return null;

  // Graph returns a local wall-clock string for the requested timezone.
  const [datePart, timePartRaw] = value.split("T");
  if (!datePart || !timePartRaw) return null;
  const timePart = timePartRaw.slice(0, 5);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart) || !/^\d{2}:\d{2}$/.test(timePart)) return null;

  return {
    scheduledDate: datePart,
    time: timePart,
  };
}

export function buildOutlookNotes(event: any) {
  const bits = [
    event?.location?.displayName ? `Location: ${String(event.location.displayName).trim()}` : "",
    event?.organizer?.emailAddress?.address ? `Organiser: ${String(event.organizer.emailAddress.address).trim()}` : "",
    event?.bodyPreview ? String(event.bodyPreview).trim() : "",
    event?.webLink ? `Outlook: ${String(event.webLink).trim()}` : "",
  ].filter(Boolean);

  return bits.join("\n\n") || null;
}

export function isOutlookImportedCategory(value?: string | null) {
  return String(value || "").toLowerCase() === "outlook_import";
}
