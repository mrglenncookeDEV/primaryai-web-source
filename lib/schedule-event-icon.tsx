import type { CSSProperties } from "react";

function normaliseSubject(subject: string) {
  return String(subject || "").trim().toLowerCase();
}

function isPersonalEvent(eventType?: string, eventCategory?: string, subject?: string) {
  return (
    eventType === "custom" &&
    (String(eventCategory || "").toLowerCase() === "personal" ||
      String(subject || "").toLowerCase() === "personal")
  );
}

function isImportedCalendarEvent(eventType?: string, eventCategory?: string) {
  const category = String(eventCategory || "").toLowerCase();
  return eventType === "custom" && (category === "outlook_import" || category === "google_import");
}

function importedProvider(eventType?: string, eventCategory?: string) {
  const category = String(eventCategory || "").toLowerCase();
  if (eventType !== "custom") return "";
  if (category === "outlook_import") return "outlook";
  if (category === "google_import") return "google";
  return "";
}

function subjectKey(subject: string) {
  const s = normaliseSubject(subject);
  if (s.includes("math")) return "maths";
  if (s.includes("english")) return "english";
  if (s.includes("science")) return "science";
  if (s.includes("history")) return "history";
  if (s.includes("geography")) return "geography";
  if (s.includes("art")) return "art";
  if (s.includes("comput")) return "computing";
  if (s.includes("music")) return "music";
  if (s === "pe" || s.includes("physical")) return "pe";
  if (s.includes("pshe")) return "pshe";
  if (s === "re" || s.includes("relig")) return "re";
  return "general";
}

type ScheduleIconProps = {
  subject: string;
  eventType?: "lesson_pack" | "custom";
  eventCategory?: string | null;
  size?: number;
  style?: CSSProperties;
};

export function ScheduleEventIcon({
  subject,
  eventType,
  eventCategory,
  size = 12,
  style,
}: ScheduleIconProps) {
  const personal = isPersonalEvent(eventType, eventCategory || undefined, subject);
  const imported = isImportedCalendarEvent(eventType, eventCategory || undefined);
  const provider = importedProvider(eventType, eventCategory || undefined);
  const key = subjectKey(subject);

  const iconStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: size,
    height: size,
    color:
      provider === "google"
        ? "#ea4335"
        : provider === "outlook"
          ? "#2563eb"
          : personal
            ? "#10b981"
            : "currentColor",
    ...style,
  };

  return (
    <span style={iconStyle} aria-hidden="true">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {provider === "outlook" ? (
          <>
            <path d="M14 4h6v16h-6" />
            <path d="M14 7h6" />
            <path d="M10 8 4 9v6l6 1" />
            <path d="M10 6v12" />
            <path d="m7.2 10.4-1.8 2.6 1.8 2.6" />
            <path d="m8.8 10.4 1.8 2.6-1.8 2.6" />
          </>
        ) : provider === "google" ? (
          <>
            <path d="M21.35 11.1h-9.18v2.96h5.27c-.23 1.52-1.82 4.45-5.27 4.45-3.17 0-5.75-2.63-5.75-5.87s2.58-5.87 5.75-5.87c1.8 0 3.01.77 3.7 1.43" />
            <path d="M17.44 6.2 20.4 3.4" />
            <path d="M20.4 6.2V3.4h-2.8" />
          </>
        ) : personal ? (
          <>
            <path d="M20 21a8 8 0 0 0-16 0" />
            <circle cx="12" cy="7" r="4" />
          </>
        ) : key === "maths" ? (
          <>
            <rect x="4" y="2" width="16" height="20" rx="2" />
            <line x1="8" y1="6" x2="16" y2="6" />
            <line x1="8" y1="11" x2="8" y2="11" />
            <line x1="12" y1="11" x2="12" y2="11" />
            <line x1="16" y1="11" x2="16" y2="11" />
            <line x1="8" y1="15" x2="8" y2="15" />
            <line x1="12" y1="15" x2="12" y2="15" />
            <line x1="16" y1="15" x2="16" y2="15" />
          </>
        ) : key === "english" ? (
          <>
            <path d="M2 4h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2z" />
            <path d="M22 4h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7z" />
          </>
        ) : key === "science" ? (
          <>
            <path d="M10 2v7.3" />
            <path d="M14 2v7.3" />
            <path d="M8.5 2h7" />
            <path d="M14 9.3 19.1 18a2 2 0 0 1-1.7 3H6.6a2 2 0 0 1-1.7-3L10 9.3" />
          </>
        ) : key === "history" ? (
          <>
            <path d="M5 4h14" />
            <path d="M5 9h14" />
            <path d="M5 14h14" />
            <path d="M5 19h14" />
          </>
        ) : key === "geography" ? (
          <>
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20" />
            <path d="M12 2a15 15 0 0 1 0 20" />
            <path d="M12 2a15 15 0 0 0 0 20" />
          </>
        ) : key === "art" ? (
          <>
            <path d="M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 0-4h-1a2 2 0 1 1 0-4h4a4 4 0 0 0 0-8z" />
            <circle cx="7.5" cy="10" r="1" />
            <circle cx="10.5" cy="7.5" r="1" />
            <circle cx="15.5" cy="8" r="1" />
          </>
        ) : key === "computing" ? (
          <>
            <rect x="3" y="4" width="18" height="12" rx="2" />
            <path d="M8 20h8" />
            <path d="M12 16v4" />
          </>
        ) : key === "music" ? (
          <>
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </>
        ) : key === "pe" ? (
          <>
            <path d="M3 7h3" />
            <path d="M18 7h3" />
            <path d="M6 7h12" />
            <path d="M9 7v10" />
            <path d="M15 7v10" />
            <path d="M3 17h3" />
            <path d="M18 17h3" />
          </>
        ) : key === "pshe" ? (
          <>
            <path d="M12 21s-6-4.35-9-8a5.5 5.5 0 0 1 9-6 5.5 5.5 0 0 1 9 6c-3 3.65-9 8-9 8z" />
          </>
        ) : key === "re" ? (
          <>
            <path d="M12 2v20" />
            <path d="M5 8h14" />
          </>
        ) : (
          <>
            <rect x="4" y="3" width="16" height="18" rx="2" />
            <path d="M8 7h8" />
            <path d="M8 11h8" />
            <path d="M8 15h5" />
          </>
        )}
      </svg>
    </span>
  );
}
