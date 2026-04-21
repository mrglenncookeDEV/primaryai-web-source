"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import PackList, { type PackItem } from "./PackList";
import WeekCalendar, { type CalendarViewMode, type ScheduleEvent } from "./WeekCalendar";
import ScheduleModal, { type ModalPayload } from "./ScheduleModal";
import CustomEventModal from "./CustomEventModal";
import PersonalEventModal from "./PersonalEventModal";
import NotesPanel from "@/components/NotesPanel";
import { DashboardCalendar } from "@/components/dashboard/DashboardCalendar";

type Props = {
  open?: boolean;
  onClose?: () => void;
  embedded?: boolean;
  onScheduleChange?: () => void;
  onViewModeStateChange?: (mode: CalendarViewMode) => void;
  initialPacks?: PackItem[];
  initialWeekEvents?: Array<{
    id: string;
    lesson_pack_id?: string;
    linked_document_id?: string | null;
    linked_document_name?: string | null;
    title: string;
    subject: string;
    year_group: string;
    event_type?: "lesson_pack" | "custom";
    event_category?: string | null;
    scheduled_date: string;
    start_time: string;
    end_time: string;
    notes?: string | null;
  }>;
  displayName?: string;
};

type UserTerm = {
  id: string;
  termName: string;
  termStartDate: string;
  termEndDate: string;
};

type SchedulerLoadKey = "terms" | "calendar" | "outlook" | "google";

const SCHEDULER_LOAD_ORDER: SchedulerLoadKey[] = ["terms", "calendar", "outlook", "google"];

function createSchedulerLoadState(calendarReady = false) {
  return {
    terms: false,
    calendar: calendarReady,
    outlook: false,
    google: false,
  };
}

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function toISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function findCurrentTerm(terms: UserTerm[], cursorDate: Date) {
  const iso = toISO(cursorDate);
  const active = terms.find((term) => iso >= term.termStartDate && iso <= term.termEndDate);
  return active ?? null;
}

function getRangeForView(mode: CalendarViewMode, cursorDate: Date, showWeekends: boolean, currentTerm: UserTerm | null) {
  const start = new Date(cursorDate);
  start.setHours(0, 0, 0, 0);
  if (mode === "day") {
    return { from: toISO(start), to: toISO(start) };
  }
  if (mode === "month") {
    const monthStart = new Date(start.getFullYear(), start.getMonth(), 1);
    const monthEnd = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    return { from: toISO(monthStart), to: toISO(monthEnd) };
  }
  if (mode === "term" && currentTerm) {
    return { from: currentTerm.termStartDate, to: currentTerm.termEndDate };
  }
  const monday = getMondayOf(start);
  const weekEnd = new Date(monday);
  weekEnd.setDate(weekEnd.getDate() + (showWeekends ? 6 : 4));
  return { from: toISO(monday), to: toISO(weekEnd) };
}

function prettyDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + mins;
  const nh = Math.min(Math.floor(total / 60), 23);
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

type PersonalEventRow = {
  id: string;
  title: string;
  all_day: boolean;
  event_date: string | null;
  start_at: string | null;
  end_at: string | null;
  repeat_rule: string;
  repeat_days: string[];
  valid_from: string | null;
  valid_to: string | null;
  colour: string;
  notes: string | null;
};

const DOW_MAP: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

function expandPersonalEvents(rows: PersonalEventRow[], from: string, to: string): ScheduleEvent[] {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const results: ScheduleEvent[] = [];

  for (const ev of rows) {
    const windowFrom = ev.valid_from ? new Date(Math.max(new Date(ev.valid_from).getTime(), fromDate.getTime())) : fromDate;
    const windowTo = ev.valid_to ? new Date(Math.min(new Date(ev.valid_to).getTime(), toDate.getTime())) : toDate;

    if (ev.repeat_rule === "none" || !ev.repeat_rule) {
      const dateStr = ev.event_date || (ev.start_at ? ev.start_at.slice(0, 10) : null);
      if (!dateStr) continue;
      if (dateStr < from || dateStr > to) continue;
      results.push(personalRowToScheduleEvent(ev, dateStr));
      continue;
    }

    for (let d = new Date(windowFrom); d <= windowTo; d.setDate(d.getDate() + 1)) {
      const iso = toISO(d);
      const dow = ["sun","mon","tue","wed","thu","fri","sat"][d.getDay()];

      if (ev.repeat_rule === "daily") {
        results.push(personalRowToScheduleEvent(ev, iso));
      } else if (ev.repeat_rule === "weekly") {
        const originDate = ev.event_date || (ev.start_at ? ev.start_at.slice(0, 10) : null);
        if (originDate) {
          const origin = new Date(originDate);
          if (d.getDay() === origin.getDay()) {
            results.push(personalRowToScheduleEvent(ev, iso));
          }
        }
      } else if (ev.repeat_rule === "custom") {
        if (Array.isArray(ev.repeat_days) && ev.repeat_days.includes(dow)) {
          results.push(personalRowToScheduleEvent(ev, iso));
        }
      }
    }
  }

  return results;
}

function personalRowToScheduleEvent(ev: PersonalEventRow, dateStr: string): ScheduleEvent {
  const colourHex: Record<string, string> = {
    teal: "#14b8a6", blue: "#3b82f6", purple: "#a855f7", pink: "#ec4899",
    orange: "#f97316", green: "#22c55e", red: "#ef4444", yellow: "#eab308", grey: "#6b7280",
  };

  let startTime = "09:00";
  let endTime = "10:00";
  let allDay = Boolean(ev.all_day);

  if (ev.start_at) {
    const d = new Date(ev.start_at);
    startTime = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  if (ev.end_at) {
    const d = new Date(ev.end_at);
    endTime = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

  return {
    id: `life-${ev.id}-${dateStr}`,
    lessonPackId: "",
    title: ev.title,
    subject: `life:${ev.colour || "teal"}`,
    yearGroup: "Personal",
    eventType: "custom",
    eventCategory: "personal",
    scheduledDate: dateStr,
    startTime,
    endTime,
    notes: ev.notes ?? "",
    allDay,
  };
}

function isImportedCalendarEvent(event?: Pick<ScheduleEvent, "eventType" | "eventCategory"> | null) {
  const category = String(event?.eventCategory || "").toLowerCase();
  return event?.eventType === "custom" && (category === "outlook_import" || category === "google_import");
}

type SchedulerFilterKey = "personal" | "tasks" | "lesson_pack" | "school" | "imports";

const SCHEDULER_FILTER_OPTIONS: Array<{ key: SchedulerFilterKey; label: string }> = [
  { key: "personal", label: "Personal Events" },
  { key: "tasks", label: "Tasks" },
  { key: "lesson_pack", label: "Lesson Packs" },
  { key: "school", label: "School Events" },
  { key: "imports", label: "Calendar Imports" },
];

function isTaskSchedulerEvent(event: Pick<ScheduleEvent, "eventType" | "eventCategory">) {
  const category = String(event.eventCategory || "").toLowerCase();
  return event.eventType === "custom" && category.startsWith("task");
}

function isPersonalSchedulerEvent(event: Pick<ScheduleEvent, "eventType" | "eventCategory" | "subject">) {
  const category = String(event.eventCategory || "").toLowerCase();
  return (
    event.eventType === "custom" &&
    !category.startsWith("task") &&
    (category === "personal" || String(event.subject || "").toLowerCase() === "personal")
  );
}

function isSchoolSchedulerEvent(event: Pick<ScheduleEvent, "eventType" | "eventCategory" | "subject">) {
  if (event.eventType !== "custom") return false;
  if (isImportedCalendarEvent(event)) return false;
  if (isTaskSchedulerEvent(event)) return false;
  if (isPersonalSchedulerEvent(event)) return false;
  return true;
}

function matchesSchedulerFilter(event: ScheduleEvent, filters: Set<SchedulerFilterKey>) {
  if (filters.size === 0) return true;
  if (event.eventType !== "custom") return filters.has("lesson_pack");
  if (isImportedCalendarEvent(event)) return filters.has("imports");
  if (isTaskSchedulerEvent(event)) return filters.has("tasks");
  if (isPersonalSchedulerEvent(event)) return filters.has("personal");
  if (isSchoolSchedulerEvent(event)) return filters.has("school");
  return false;
}

export default function SchedulerDrawer({
  open = true,
  onClose = () => {},
  embedded = false,
  onScheduleChange,
  onViewModeStateChange,
  initialPacks = [],
  initialWeekEvents = [],
  displayName,
}: Props) {
  function detectClashes(date: string, startTime: string, endTime: string, excludeId?: string | null) {
    const toMins = (t: string) => {
      const [h, m] = String(t || "00:00").split(":").map(Number);
      return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
    };
    const newStart = toMins(startTime);
    const newEnd = toMins(endTime);
    return calendarEvents.filter(
      (e) =>
        !e.allDay &&
        e.scheduledDate === date &&
        e.id !== excludeId &&
        e.eventCategory !== "personal" &&
        toMins(e.startTime) < newEnd &&
        toMins(e.endTime) > newStart
    ).map((e) => ({ title: e.title, time: `${e.startTime}–${e.endTime}` }));
  }

  const mapApiEvent = useCallback(
    (e: {
      id: string;
      lesson_pack_id?: string;
      linked_document_id?: string | null;
      linked_document_name?: string | null;
      title: string;
      subject: string;
      year_group: string;
      event_type?: "lesson_pack" | "custom";
      event_category?: string | null;
      scheduled_date: string;
      start_time: string;
      end_time: string;
      notes?: string | null;
      all_day?: boolean;
      effort?: string | null;
    }): ScheduleEvent => ({
      id: String(e.id),
      lessonPackId: String(e.lesson_pack_id || ""),
      linkedDocumentId: e.linked_document_id ? String(e.linked_document_id) : "",
      linkedDocumentName: e.linked_document_name ? String(e.linked_document_name) : "",
      title: String(e.title || ""),
      subject: String(e.subject || ""),
      yearGroup: String(e.year_group || ""),
      eventType: e.event_type === "custom" ? "custom" : "lesson_pack",
      eventCategory: e.event_category ?? null,
      scheduledDate: String(e.scheduled_date || ""),
      startTime: String(e.start_time || "").slice(0, 5),
      endTime: String(e.end_time || "").slice(0, 5),
      notes: typeof e.notes === "string" ? e.notes : "",
      allDay: Boolean(e.all_day),
      effort: (e.effort === "low" || e.effort === "medium" || e.effort === "high") ? e.effort : null,
    }),
    [],
  );
  const todayWeekIso = useMemo(() => toISO(getMondayOf(new Date())), []);
  const [mounted, setMounted] = useState(false);
  const [packs, setPacks] = useState<PackItem[]>(initialPacks);
  const [events, setEvents] = useState<ScheduleEvent[]>(
    initialWeekEvents.map(mapApiEvent),
  );
  const [bankHolidayEvents, setBankHolidayEvents] = useState<ScheduleEvent[]>([]);
  const [personalLifeEvents, setPersonalLifeEvents] = useState<ScheduleEvent[]>([]);
  const [terms, setTerms] = useState<UserTerm[]>([]);
  const [viewMode, setViewMode] = useState<CalendarViewMode>("week");
  const [showWeekends, setShowWeekends] = useState(false);
  const [cursorDate, setCursorDate] = useState<Date>(() => new Date());
  const [packsLoading, setPacksLoading] = useState(initialPacks.length === 0);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [modal, setModal] = useState<ModalPayload | null>(null);
  const [customModalDraft, setCustomModalDraft] = useState<{
    date: string;
    startTime: string;
    endTime: string;
    category?: string;
    lockCategory?: boolean;
  } | null>(null);
  const [personalEventModalDate, setPersonalEventModalDate] = useState<string | null>(null);
  const [savingPersonalEvent, setSavingPersonalEvent] = useState(false);
  const [editEventId, setEditEventId] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
  const [downloadingAttachment, setDownloadingAttachment] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatingPack, setGeneratingPack] = useState(false);
  const [generatePackError, setGeneratePackError] = useState("");
  const [syncingOutlook, setSyncingOutlook] = useState(false);
  const [backfillingOutlook, setBackfillingOutlook] = useState(false);
  const [disconnectingOutlook, setDisconnectingOutlook] = useState(false);
  const [syncingGoogle, setSyncingGoogle] = useState(false);
  const [backfillingGoogle, setBackfillingGoogle] = useState(false);
  const [disconnectingGoogle, setDisconnectingGoogle] = useState(false);
  const [outlookConfigured, setOutlookConfigured] = useState(true);
  const [outlookConnected, setOutlookConnected] = useState(false);
  const [outlookCanWrite, setOutlookCanWrite] = useState(false);
  const [outlookEmail, setOutlookEmail] = useState("");
  const [outlookLastSyncedAt, setOutlookLastSyncedAt] = useState<string | null>(null);
  const [googleConfigured, setGoogleConfigured] = useState(true);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleCanWrite, setGoogleCanWrite] = useState(false);
  const [googleEmail, setGoogleEmail] = useState("");
  const [googleLastSyncedAt, setGoogleLastSyncedAt] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<Set<SchedulerFilterKey>>(new Set());
  const [loadState, setLoadState] = useState(() => createSchedulerLoadState(initialWeekEvents.length > 0));
  const [unscheduleDragOver, setUnscheduleDragOver] = useState(false);
  const [error, setError] = useState("");
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [dayTemplates, setDayTemplates] = useState<{ id: string; name: string; day_of_week: string; blocks: any[] }[]>([]);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [saveTemplateForm, setSaveTemplateForm] = useState<{ name: string; dayOfWeek: string } | null>(null);
  const [applyTemplateId, setApplyTemplateId] = useState<string | null>(null);
  const [applyTemplateDate, setApplyTemplateDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [eventObjectives, setEventObjectives] = useState<{ id: string; code: string; description: string; strand: string }[]>([]);
  const [objectivesPickerOpen, setObjectivesPickerOpen] = useState(false);
  const [availableObjectives, setAvailableObjectives] = useState<{ id: string; code: string; description: string; strand: string; subject: string }[]>([]);
  const [objectivesFilter, setObjectivesFilter] = useState("");
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddInput, setQuickAddInput] = useState("");
  const [quickAddParsed, setQuickAddParsed] = useState<{ title: string; subject: string; year_group: string; scheduled_date: string; start_time: string; end_time: string } | null>(null);
  const [quickAddSaving, setQuickAddSaving] = useState(false);
  const [quickAddError, setQuickAddError] = useState("");
  const [bulkShiftOpen, setBulkShiftOpen] = useState(false);
  const [bulkShiftFrom, setBulkShiftFrom] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [bulkShiftTo, setBulkShiftTo] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [bulkShiftSaving, setBulkShiftSaving] = useState(false);
  const [clashModal, setClashModal] = useState<{
    clashes: { title: string; time: string }[];
    onProceed: () => void;
  } | null>(null);
  const currentTerm = useMemo(() => findCurrentTerm(terms, cursorDate), [terms, cursorDate]);

  useEffect(() => {
    onViewModeStateChange?.(viewMode);
  }, [onViewModeStateChange, viewMode]);

  const calendarEvents = useMemo(() => [...events, ...bankHolidayEvents, ...personalLifeEvents], [events, bankHolidayEvents, personalLifeEvents]);
  const filteredCalendarEvents = useMemo(
    () => calendarEvents.filter((event) => matchesSchedulerFilter(event, activeFilters)),
    [activeFilters, calendarEvents],
  );
  const schedulerLoadProgress = useMemo(() => {
    const completed = SCHEDULER_LOAD_ORDER.filter((key) => loadState[key]).length;
    return Math.round((completed / SCHEDULER_LOAD_ORDER.length) * 100);
  }, [loadState]);
  const schedulerLoading = schedulerLoadProgress < 100;
  const schedulerLoadLabel = useMemo(() => {
    if (loadState.terms === false) return "Loading term dates…";
    if (loadState.calendar === false) return "Loading timetable…";
    if (loadState.outlook === false) return "Checking Outlook…";
    if (loadState.google === false) return "Checking Google Calendar…";
    return "Timetable ready";
  }, [loadState]);
  const dragRef = useRef<PackItem | null>(null);
  const sidebarRef = useRef<HTMLElement | null>(null);
  const [sidebarHeight, setSidebarHeight] = useState<number | null>(null);
  const scheduledPackIds = useMemo(
    () =>
      Array.from(
        new Set(
          calendarEvents
            .filter((evt) => evt.eventType !== "custom" && evt.lessonPackId)
            .map((evt) => evt.lessonPackId),
        ),
      ),
    [calendarEvents],
  );

  useEffect(() => {
    if (!embedded) {
      setSidebarHeight(null);
      return;
    }

    const node = sidebarRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;

    const syncHeight = () => {
      setSidebarHeight(Math.ceil(node.getBoundingClientRect().height));
    };

    syncHeight();
    const observer = new ResizeObserver(syncHeight);
    observer.observe(node);
    return () => observer.disconnect();
  }, [embedded, eventsLoading, packsLoading, outlookConnected, googleConnected]);

  // Mount guard for portal
  useEffect(() => { setMounted(true); }, []);


  // Body scroll lock
  useEffect(() => {
    if (embedded) return;
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [embedded, open]);

  // Load packs once on first open
  const packsLoaded = useRef(initialPacks.length > 0);
  const seededWeekEvents = useRef(initialWeekEvents.length > 0);

  useEffect(() => {
    if (packs.length === 0 && initialPacks.length > 0) {
      setPacks(initialPacks);
      setPacksLoading(false);
      packsLoaded.current = true;
    }
  }, [initialPacks, packs.length]);

  useEffect(() => {
    if (events.length === 0 && viewMode === "week" && !showWeekends && toISO(getMondayOf(cursorDate)) === todayWeekIso) {
      setEvents(initialWeekEvents.map(mapApiEvent));
      seededWeekEvents.current = true;
    }
  }, [events.length, initialWeekEvents, mapApiEvent, showWeekends, todayWeekIso, viewMode, cursorDate]);

  useEffect(() => {
    if (!open || packsLoaded.current) return;
    packsLoaded.current = true;
    setPacksLoading(true);
    const controller = new AbortController();
    fetch("/api/library?view=summary&limit=200", { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        if (controller.signal.aborted) return;
        if (data.ok && Array.isArray(data.items)) {
          setPacks(
            data.items.map((item: Record<string, string>) => ({
              id: item.id,
              title: item.title,
              subject: item.subject,
              yearGroup: item.year_group,
              topic: item.topic,
            }))
          );
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setError("Could not load packs.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setPacksLoading(false);
        }
      });
    return () => controller.abort();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setLoadState(createSchedulerLoadState(initialWeekEvents.length > 0));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setLoadState((prev) => ({ ...prev, terms: false }));
    const controller = new AbortController();
    fetch("/api/profile/terms", { cache: "no-store", signal: controller.signal })
      .then((response) => response.json().catch(() => ({})))
      .then((data) => {
        if (controller.signal.aborted) return;
        if (Array.isArray(data?.terms)) {
          setTerms(
            data.terms.map((term: Record<string, string>) => ({
              id: String(term.id || ""),
              termName: String(term.termName || ""),
              termStartDate: String(term.termStartDate || ""),
              termEndDate: String(term.termEndDate || ""),
            })),
          );
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoadState((prev) => ({ ...prev, terms: true }));
        }
      });
    return () => controller.abort();
  }, [open]);

  // Load events for the current view range
  const loadEvents = useCallback((mode: CalendarViewMode, anchorDate: Date, includeWeekends: boolean, term: UserTerm | null) => {
    const { from, to } = getRangeForView(mode, anchorDate, includeWeekends, term);
    const controller = new AbortController();
    setEventsLoading(true);
    setLoadState((prev) => ({ ...prev, calendar: false }));
    setError("");
    Promise.all([
      fetch(`/api/schedule?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { cache: "no-store", signal: controller.signal }).then((r) => r.json()),
      fetch(`/api/calendar/bank-holidays?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { cache: "no-store", signal: controller.signal }).then((r) => r.json()),
      fetch(`/api/personal-events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { cache: "no-store", signal: controller.signal }).then((r) => r.json()).catch(() => ({ ok: false })),
    ])
      .then(([data, bankHolidayData, personalEventsData]) => {
        if (controller.signal.aborted) return;
        if (data.ok && Array.isArray(data.events)) {
          setEvents(data.events.map(mapApiEvent));
        }
        if (bankHolidayData?.ok && Array.isArray(bankHolidayData.events)) {
          setBankHolidayEvents(bankHolidayData.events.map(mapApiEvent));
        } else {
          setBankHolidayEvents([]);
        }
        if (personalEventsData?.ok && Array.isArray(personalEventsData.events)) {
          setPersonalLifeEvents(expandPersonalEvents(personalEventsData.events, from, to));
        } else {
          setPersonalLifeEvents([]);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setError("Could not load schedule.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setEventsLoading(false);
          setLoadState((prev) => ({ ...prev, calendar: true }));
        }
      });
    return () => controller.abort();
  }, [mapApiEvent]);

  useEffect(() => {
    if (!open) return;
    if (viewMode === "week" && !showWeekends && toISO(getMondayOf(cursorDate)) === todayWeekIso && seededWeekEvents.current) {
      seededWeekEvents.current = false;
      setLoadState((prev) => ({ ...prev, calendar: true }));
      return;
    }
    return loadEvents(viewMode, cursorDate, showWeekends, currentTerm);
  }, [open, viewMode, cursorDate, loadEvents, showWeekends, todayWeekIso, currentTerm]);

  useEffect(() => {
    if (!open) return;
    const handleExternalRefresh = () => {
      loadEvents(viewMode, cursorDate, showWeekends, currentTerm);
    };
    const handleOpenEvent = (nativeEvent: Event) => {
      const customEvent = nativeEvent as CustomEvent<{
        id: string;
        lesson_pack_id?: string;
        title: string;
        subject: string;
        year_group: string;
        event_type?: "lesson_pack" | "custom";
        event_category?: string | null;
        scheduled_date: string;
        start_time: string;
        end_time: string;
        notes?: string | null;
      }>;
      const payload = customEvent.detail;
      if (!payload?.id) return;
      const [year, month, day] = String(payload.scheduled_date || "").split("-").map(Number);
      setCursorDate(new Date(year, (month || 1) - 1, day || 1));
      setViewMode("week");
      setSelectedEvent(mapApiEvent(payload));
    };
    window.addEventListener("pa:schedule-refresh", handleExternalRefresh);
    window.addEventListener("pa:schedule-open-event", handleOpenEvent as EventListener);
    return () => {
      window.removeEventListener("pa:schedule-refresh", handleExternalRefresh);
      window.removeEventListener("pa:schedule-open-event", handleOpenEvent as EventListener);
    };
  }, [open, loadEvents, viewMode, cursorDate, mapApiEvent, showWeekends, currentTerm]);

  const loadOutlookStatus = useCallback(async () => {
    setLoadState((prev) => ({ ...prev, outlook: false }));
    const response = await fetch("/api/schedule/outlook-status", { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.ok) {
      throw new Error(String(data?.error || "Could not load Outlook sync status"));
    }

    setOutlookConfigured(Boolean(data.configured));
    setOutlookConnected(Boolean(data.connected));
    setOutlookCanWrite(Boolean(data.canWrite));
    setOutlookEmail(String(data.email || ""));
    setOutlookLastSyncedAt(data.lastSyncedAt ? String(data.lastSyncedAt) : null);
    setLoadState((prev) => ({ ...prev, outlook: true }));
    return data;
  }, []);

  const loadGoogleStatus = useCallback(async () => {
    setLoadState((prev) => ({ ...prev, google: false }));
    const response = await fetch("/api/schedule/google-status", { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.ok) {
      throw new Error(String(data?.error || "Could not load Google Calendar sync status"));
    }

    setGoogleConfigured(Boolean(data.configured));
    setGoogleConnected(Boolean(data.connected));
    setGoogleCanWrite(Boolean(data.canWrite));
    setGoogleEmail(String(data.email || ""));
    setGoogleLastSyncedAt(data.lastSyncedAt ? String(data.lastSyncedAt) : null);
    setLoadState((prev) => ({ ...prev, google: true }));
    return data;
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    loadOutlookStatus().catch((err) => {
      if (cancelled) return;
      const message = err instanceof Error ? err.message : "Could not load Outlook sync status";
      setLoadState((prev) => ({ ...prev, outlook: true }));
      setError(message);
    });
    loadGoogleStatus().catch((err) => {
      if (cancelled) return;
      const message = err instanceof Error ? err.message : "Could not load Google Calendar sync status";
      setLoadState((prev) => ({ ...prev, google: true }));
      setError(message);
    });
    return () => {
      cancelled = true;
    };
  }, [open, loadOutlookStatus, loadGoogleStatus]);

  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const outlookResult = url.searchParams.get("outlook");
    if (!outlookResult) return;

    const messageMap: Record<string, string> = {
      cancelled: "Outlook sign-in was cancelled.",
      expired: "Outlook sign-in expired. Please try again.",
      failed: "Outlook sign-in failed. Please try again.",
      "not-configured": "Outlook sync is not configured on this environment yet.",
      "store-unavailable": "Outlook sync store is unavailable.",
      connected: "",
    };

    const nextUrl = `${url.pathname}${url.search.replace(/([?&])outlook=[^&]*&?/, "$1").replace(/[?&]$/, "")}${url.hash}`;
    window.history.replaceState({}, "", nextUrl);

    if (outlookResult === "connected") {
      setError("");
      loadOutlookStatus()
        .then((data) => {
          if (data?.connected) {
            loadEvents(viewMode, cursorDate, showWeekends, currentTerm);
            onScheduleChange?.();
            return;
          }
          setError("Outlook connected, but the saved connection could not be loaded back.");
        })
        .catch((err) => {
          const message = err instanceof Error ? err.message : "Could not load Outlook sync status";
          setError(message);
        });
      return;
    }

    setError(messageMap[outlookResult] || outlookResult);
  }, [open, loadEvents, loadOutlookStatus, onScheduleChange, viewMode, cursorDate, showWeekends, currentTerm]);

  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const googleResult = url.searchParams.get("google");
    if (!googleResult) return;

    const messageMap: Record<string, string> = {
      cancelled: "Google Calendar sign-in was cancelled.",
      expired: "Google Calendar sign-in expired. Please try again.",
      failed: "Google Calendar sign-in failed. Please try again.",
      "not-configured": "Google Calendar sync is not configured on this environment yet.",
      connected: "",
    };

    const nextUrl = `${url.pathname}${url.search.replace(/([?&])google=[^&]*&?/, "$1").replace(/[?&]$/, "")}${url.hash}`;
    window.history.replaceState({}, "", nextUrl);

    if (googleResult === "connected") {
      setError("");
      loadGoogleStatus()
        .then((data) => {
          if (data?.connected) {
            loadEvents(viewMode, cursorDate, showWeekends, currentTerm);
            onScheduleChange?.();
            return;
          }
          setError("Google Calendar connected, but the saved connection could not be loaded back.");
        })
        .catch((err) => {
          const message = err instanceof Error ? err.message : "Could not load Google Calendar sync status";
          setError(message);
        });
      return;
    }

    setError(messageMap[googleResult] || googleResult);
  }, [open, loadEvents, loadGoogleStatus, onScheduleChange, viewMode, cursorDate, showWeekends, currentTerm]);

  function handleNavigate(delta: -1 | 1) {
    if (viewMode === "term") {
      if (terms.length === 0) return;
      const currentIndex = currentTerm ? terms.findIndex((term) => term.id === currentTerm.id) : -1;
      const nextIndex = currentIndex < 0 ? 0 : Math.max(0, Math.min(terms.length - 1, currentIndex + delta));
      const nextTerm = terms[nextIndex];
      if (!nextTerm) return;
      const [year, month, day] = nextTerm.termStartDate.split("-").map(Number);
      setCursorDate(new Date(year, (month || 1) - 1, day || 1));
      return;
    }
    setCursorDate((prev) => {
      const d = new Date(prev);
      if (viewMode === "day") d.setDate(d.getDate() + delta);
      else if (viewMode === "month") d.setMonth(d.getMonth() + delta);
      else d.setDate(d.getDate() + delta * 7);
      return d;
    });
  }

  function handleGoToday() {
    setCursorDate(new Date());
  }

  function handlePrint() {
    const range = getRangeForView(viewMode, cursorDate, showWeekends, currentTerm);
    const rangeEvents = calendarEvents
      .filter((e) => e.scheduledDate >= range.from && e.scheduledDate <= range.to && !e.allDay)
      .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.startTime.localeCompare(b.startTime));

    // Group by date
    const byDate = new Map<string, typeof rangeEvents>();
    for (const e of rangeEvents) {
      if (!byDate.has(e.scheduledDate)) byDate.set(e.scheduledDate, []);
      byDate.get(e.scheduledDate)!.push(e);
    }

    const title = displayName ? `${displayName.split(" ")[0]}'s Timetable` : "My Timetable";
    const rangeLabel =
      range.from === range.to
        ? prettyDate(range.from)
        : `${prettyDate(range.from)} – ${prettyDate(range.to)}`;

    const rows = Array.from(byDate.entries()).map(([date, evts]) => {
      const dayLabel = prettyDate(date);
      const items = evts.map((e) => {
        const effortDot = e.effort
          ? `<span class="effort-dot effort-${e.effort}" title="Marking load: ${e.effort}"></span>`
          : "";
        const isTask = e.eventCategory === "task" || e.eventCategory === "task_done";
        const isPersonal = e.eventCategory === "personal";
        const typeTag = isTask
          ? `<span class="tag tag-task">${e.eventCategory === "task_done" ? "Done" : "Task"}</span>`
          : isPersonal
          ? `<span class="tag tag-personal">Personal</span>`
          : "";
        return `<tr>
          <td class="time">${e.startTime}–${e.endTime}</td>
          <td class="title">${effortDot}${e.title}${typeTag}</td>
          <td class="meta">${[e.subject, e.yearGroup].filter(Boolean).join(" · ")}</td>
          <td class="notes">${e.notes ? e.notes : ""}</td>
        </tr>`;
      }).join("");
      return `<tr class="day-header"><td colspan="4">${dayLabel}</td></tr>${items}`;
    }).join("");

    const legend = `<div class="legend">
      <span class="legend-label">Marking load:</span>
      <span class="legend-item"><span class="effort-dot effort-low"></span> Low</span>
      <span class="legend-item"><span class="effort-dot effort-medium"></span> Medium</span>
      <span class="legend-item"><span class="effort-dot effort-high"></span> High</span>
      <span class="legend-sep">|</span>
      <span class="legend-item"><span class="tag tag-task">Task</span> Personal task</span>
      <span class="legend-item"><span class="tag tag-personal">Personal</span> Life event</span>
    </div>`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>${title} – ${rangeLabel}</title>
  <style>
    body { font-family: system-ui, sans-serif; font-size: 11pt; color: #111; margin: 1.5cm; }
    h1 { font-size: 16pt; margin: 0 0 0.2rem; }
    p.range { font-size: 10pt; color: #555; margin: 0 0 0.8rem; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #1e293b; color: #fff; padding: 0.4rem 0.6rem; font-size: 9pt; text-align: left; }
    td { padding: 0.35rem 0.6rem; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
    tr.day-header td { background: #f1f5f9; font-weight: 700; font-size: 10pt; padding: 0.5rem 0.6rem; border-top: 2px solid #cbd5e1; color: #334155; }
    td.time { white-space: nowrap; color: #475569; font-size: 9.5pt; width: 10%; }
    td.title { font-weight: 600; width: 40%; }
    td.meta { color: #64748b; font-size: 9.5pt; width: 20%; }
    td.notes { color: #64748b; font-size: 9pt; width: 30%; }
    .effort-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; margin-right: 5px; vertical-align: middle; }
    .effort-low { background: #22c55e; }
    .effort-medium { background: #f59e0b; }
    .effort-high { background: #ef4444; }
    .tag { display: inline-block; font-size: 7.5pt; font-weight: 600; padding: 1px 5px; border-radius: 3px; margin-left: 5px; vertical-align: middle; }
    .tag-task { background: #dbeafe; color: #1d4ed8; }
    .tag-personal { background: #fce7f3; color: #be185d; }
    .legend { display: flex; align-items: center; gap: 0.8rem; font-size: 8.5pt; color: #475569; border: 1px solid #e2e8f0; border-radius: 4px; padding: 0.4rem 0.7rem; margin-bottom: 1rem; flex-wrap: wrap; }
    .legend-label { font-weight: 700; color: #334155; }
    .legend-item { display: flex; align-items: center; gap: 4px; }
    .legend-sep { color: #cbd5e1; }
    @media print { body { margin: 1cm; } }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p class="range">${rangeLabel}</p>
  ${legend}
  ${rows ? `<table>
    <thead><tr><th>Time</th><th>Lesson</th><th>Subject / Year</th><th>Notes</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>` : "<p>No lessons scheduled for this period.</p>"}
</body>
</html>`;

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }

  async function loadTemplates() {
    const res = await fetch("/api/day-templates", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (res.ok && Array.isArray(data?.templates)) {
      setDayTemplates(data.templates);
    }
  }

  function openTemplatesModal() {
    setTemplatesOpen(true);
    void loadTemplates();
  }

  async function saveAsTemplate(name: string, dayOfWeek: string) {
    setSavingTemplate(true);
    const dayEvents = calendarEvents.filter(
      (e) =>
        e.scheduledDate === cursorDate.toISOString().slice(0, 10) &&
        !e.allDay &&
        e.eventType !== "custom"
    );
    const blocks = dayEvents.map((e) => ({
      title: e.title,
      subject: e.subject,
      year_group: e.yearGroup,
      start_time: e.startTime,
      end_time: e.endTime,
      event_type: e.eventType || "lesson_pack",
      event_category: e.eventCategory || null,
      effort: e.effort || null,
      notes: e.notes || null,
    }));
    await fetch("/api/day-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, dayOfWeek, blocks }),
    });
    setSavingTemplate(false);
    setSaveTemplateForm(null);
    void loadTemplates();
  }

  async function applyTemplate(templateId: string, date: string) {
    setApplyingTemplate(true);
    const res = await fetch(`/api/day-templates/${templateId}/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date }),
    });
    setApplyingTemplate(false);
    if (res.ok) {
      setApplyTemplateId(null);
      setTemplatesOpen(false);
      loadEvents(viewMode, cursorDate, showWeekends, currentTerm);
      onScheduleChange?.();
    }
  }

  async function deleteTemplate(templateId: string) {
    await fetch(`/api/day-templates/${templateId}`, { method: "DELETE" });
    void loadTemplates();
  }

  async function loadEventObjectives(eventId: string) {
    const res = await fetch(`/api/schedule/${eventId}/objectives`, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (res.ok && Array.isArray(data?.objectives)) {
      setEventObjectives(data.objectives);
    }
  }

  async function loadAvailableObjectives(subject: string, yearGroup: string) {
    const ks = (yearGroup || "").toLowerCase().replace("year ", "year-");
    const params = new URLSearchParams({ subject });
    if (ks) params.set("yearGroup", ks);
    const res = await fetch(`/api/nc-objectives?${params}`, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (res.ok && Array.isArray(data?.objectives)) {
      setAvailableObjectives(data.objectives);
    }
  }

  async function toggleObjective(eventId: string, objectiveId: string, linked: boolean) {
    const method = linked ? "DELETE" : "POST";
    await fetch(`/api/schedule/${eventId}/objectives`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ objectiveId }),
    });
    void loadEventObjectives(eventId);
  }

  async function previewQuickAdd(input: string) {
    if (!input.trim()) { setQuickAddParsed(null); setQuickAddError(""); return; }
    const today = cursorDate.toISOString().slice(0, 10);
    const res = await fetch("/api/quick-add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input, today, preview: true }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.parsed) {
      setQuickAddParsed(data.parsed);
      setQuickAddError("");
    } else {
      setQuickAddParsed(null);
      setQuickAddError(data?.error || "Could not parse");
    }
  }

  async function confirmQuickAdd() {
    if (!quickAddInput.trim()) return;
    setQuickAddSaving(true);
    const today = cursorDate.toISOString().slice(0, 10);
    const res = await fetch("/api/quick-add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: quickAddInput, today }),
    });
    const data = await res.json().catch(() => ({}));
    setQuickAddSaving(false);
    if (res.ok && data?.ok) {
      setQuickAddOpen(false);
      setQuickAddInput("");
      setQuickAddParsed(null);
      loadEvents(viewMode, cursorDate, showWeekends, currentTerm);
      onScheduleChange?.();
    } else {
      setQuickAddError(data?.error || "Could not add event");
    }
  }

  async function doBulkShift() {
    setBulkShiftSaving(true);
    const res = await fetch("/api/schedule/bulk-shift", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromDate: bulkShiftFrom, toDate: bulkShiftTo }),
    });
    const data = await res.json().catch(() => ({}));
    setBulkShiftSaving(false);
    if (res.ok && data?.ok) {
      setBulkShiftOpen(false);
      loadEvents(viewMode, cursorDate, showWeekends, currentTerm);
      onScheduleChange?.();
    } else {
      setError(data?.error || "Could not shift events");
    }
  }

  function handleDrop(date: string, slotTime: string) {
    const pack = dragRef.current;
    if (!pack) return;
    setModal({
      pack,
      date,
      startTime: slotTime,
      endTime: addMinutes(slotTime, 60),
    });
  }

  async function handleEventReschedule(eventId: string, scheduledDate: string, startTime: string) {
    const current = events.find((evt) => evt.id === eventId);
    if (!current) return;
    if (isImportedCalendarEvent(current)) return;

    const [sh, sm] = current.startTime.split(":").map(Number);
    const [eh, em] = current.endTime.split(":").map(Number);
    const durationMinutes = Math.max(30, (eh * 60 + em) - (sh * 60 + sm));
    const nextEndTime = addMinutes(startTime, durationMinutes);

    const clashes = detectClashes(scheduledDate, startTime, nextEndTime, eventId);
    if (clashes.length > 0) {
      setClashModal({
        clashes,
        onProceed: () => {
          setClashModal(null);
          void doReschedule(current, eventId, scheduledDate, startTime, nextEndTime);
        },
      });
      return;
    }
    void doReschedule(current, eventId, scheduledDate, startTime, nextEndTime);
  }

  async function doReschedule(previous: ScheduleEvent, eventId: string, scheduledDate: string, startTime: string, nextEndTime: string) {
    setEvents((prev) =>
      prev.map((evt) =>
        evt.id === eventId
          ? { ...evt, scheduledDate, startTime, endTime: nextEndTime }
          : evt,
      ),
    );

    try {
      const res = await fetch(`/api/schedule/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledDate,
          startTime,
          endTime: nextEndTime,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Failed to reschedule");
      if (json?.syncWarning) {
        setError(String(json.syncWarning));
      }
      onScheduleChange?.();
    } catch {
      setEvents((prev) =>
        prev.map((evt) =>
          evt.id === eventId
            ? previous
            : evt,
        ),
      );
      setError("Could not reschedule event. Please try again.");
      onScheduleChange?.();
    }
  }

  async function handleConfirm(data: { startTime: string; endTime: string; notes: string }) {
    if (!modal) return;
    const clashes = detectClashes(modal.date, data.startTime, data.endTime, editEventId);
    if (clashes.length > 0) {
      setClashModal({
        clashes,
        onProceed: () => {
          setClashModal(null);
          void doConfirm(data);
        },
      });
      return;
    }
    void doConfirm(data);
  }

  async function doConfirm(data: { startTime: string; endTime: string; notes: string }) {
    if (!modal) return;
    setSaving(true);
    setError("");
    try {
      const isEditing = Boolean(editEventId);
      const res = await fetch(isEditing ? `/api/schedule/${editEventId}` : "/api/schedule", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEditing
            ? {
                scheduledDate: modal.date,
                startTime: data.startTime,
                endTime: data.endTime,
                notes: data.notes || null,
              }
            : {
                lessonPackId: modal.pack.id,
                title: modal.pack.title,
                subject: modal.pack.subject,
                yearGroup: modal.pack.yearGroup,
                scheduledDate: modal.date,
                startTime: data.startTime,
                endTime: data.endTime,
                notes: data.notes || null,
              },
        ),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Failed to save");
      if (json.syncWarning) {
        setError(String(json.syncWarning));
      }
      const e = json.event;
      const normalised = {
        id: e.id,
        lessonPackId: e.lesson_pack_id,
        linkedDocumentId: e.linked_document_id ?? "",
        linkedDocumentName: e.linked_document_name ?? "",
        title: e.title,
        subject: e.subject,
        yearGroup: e.year_group,
        eventType: (e.event_type === "custom" ? "custom" : "lesson_pack") as "custom" | "lesson_pack",
        eventCategory: e.event_category ?? null,
        scheduledDate: e.scheduled_date,
        startTime: e.start_time.slice(0, 5),
        endTime: e.end_time.slice(0, 5),
        notes: e.notes,
      };

      setEvents((prev) =>
        isEditing ? prev.map((item) => (item.id === e.id ? normalised : item)) : [...prev, normalised],
      );
      onScheduleChange?.();
      setModal(null);
      setEditEventId(null);
    } catch {
      setError(editEventId ? "Could not update event. Please try again." : "Could not save event. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleEventDelete(id: string) {
    // Optimistic removal
    setEvents((prev) => prev.filter((e) => e.id !== id));
    onScheduleChange?.();
    try {
      const res = await fetch(`/api/schedule/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error("Delete failed");
      if (json?.syncWarning) {
        setError(String(json.syncWarning));
      }
    } catch {
      // Reload to restore correct state on failure
      setError("Could not remove event.");
      loadEvents(viewMode, cursorDate, showWeekends, currentTerm);
      onScheduleChange?.();
    }
  }

  async function handleCreatePersonalEvent(data: {
    title: string;
    allDay: boolean;
    eventDate: string | null;
    startAt: string | null;
    endAt: string | null;
    repeatRule: string;
    repeatDays: string[];
    validFrom: string | null;
    validTo: string | null;
    colour: string;
    notes: string;
  }) {
    setSavingPersonalEvent(true);
    setError("");
    try {
      const res = await fetch("/api/personal-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || "Could not save event");
      }
      setPersonalEventModalDate(null);
      loadEvents(viewMode, cursorDate, showWeekends, currentTerm);
      onScheduleChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save event");
    } finally {
      setSavingPersonalEvent(false);
    }
  }

  async function handleCreateCustomEvent(data: {
    title: string;
    category: string;
    scheduledDate: string;
    startTime: string;
    endTime: string;
    notes: string;
    allDay: boolean;
    repeat: "none" | "daily" | "weekly";
    repeatUntil: string | null;
  }) {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "custom",
          eventCategory: data.category,
          title: data.title,
          subject: data.category,
          yearGroup: "All Years",
          scheduledDate: data.scheduledDate,
          startTime: data.startTime,
          endTime: data.endTime,
          notes: data.notes || null,
          repeat: data.repeat,
          repeatUntil: data.repeatUntil,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Failed to save");
      if (json.syncWarning) {
        setError(String(json.syncWarning));
      }
      const createdEvents = Array.isArray(json.events)
        ? json.events
        : (json.event ? [json.event] : []);
      const normalisedEvents = createdEvents.map((event) => ({
        ...mapApiEvent(event),
        allDay:
          data.allDay ||
          (String(event.start_time || "").slice(0, 5) === "00:00" &&
            String(event.end_time || "").slice(0, 5) === "23:59"),
      }));
      setEvents((prev) => [...prev, ...normalisedEvents]);
      onScheduleChange?.();
      setCustomModalDraft(null);
    } catch {
      setError("Could not save custom event. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSyncOutlook() {
    setSyncingOutlook(true);
    setError("");
    try {
      if (!outlookConfigured) {
        throw new Error("Outlook sync is not configured on the server yet. Add MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET first.");
      }

      if (outlookConnected && !outlookCanWrite) {
        if (typeof window !== "undefined") {
          window.location.assign("/api/schedule/outlook-connect?reauth=1");
        }
        return;
      }

      if (!outlookConnected) {
        if (typeof window !== "undefined") {
          window.location.assign("/api/schedule/outlook-connect");
        }
        return;
      }

      const res = await fetch("/api/schedule/outlook-import", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Could not import Outlook events");
      }
      setOutlookLastSyncedAt(data?.syncedAt ? String(data.syncedAt) : new Date().toISOString());
      setOutlookConnected(true);
      loadEvents(viewMode, cursorDate, showWeekends, currentTerm);
      onScheduleChange?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not sync Outlook. Please try again.";
      setError(message);
    } finally {
      setSyncingOutlook(false);
    }
  }

  async function handleBackfillOutlook() {
    setBackfillingOutlook(true);
    setError("");
    try {
      const res = await fetch("/api/schedule/outlook-backfill", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Could not sync existing Outlook events");
      }
      loadEvents(viewMode, cursorDate, showWeekends, currentTerm);
      onScheduleChange?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not sync existing Outlook events.";
      setError(message);
    } finally {
      setBackfillingOutlook(false);
    }
  }

  async function handleDisconnectOutlook() {
    setDisconnectingOutlook(true);
    setError("");
    try {
      const res = await fetch("/api/schedule/outlook-disconnect", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Could not disconnect Outlook");
      }
      setOutlookConnected(false);
      setOutlookCanWrite(false);
      setOutlookEmail("");
      setOutlookLastSyncedAt(null);
      loadEvents(viewMode, cursorDate, showWeekends, currentTerm);
      onScheduleChange?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not disconnect Outlook.";
      setError(message);
    } finally {
      setDisconnectingOutlook(false);
    }
  }

  async function handleSyncGoogleCalendar() {
    setSyncingGoogle(true);
    setError("");
    try {
      if (!googleConfigured) {
        throw new Error("Google Calendar sync is not configured on the server yet. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET first.");
      }

      if (googleConnected && !googleCanWrite) {
        if (typeof window !== "undefined") {
          window.location.assign("/api/schedule/google-connect?reauth=1");
        }
        return;
      }

      if (!googleConnected) {
        if (typeof window !== "undefined") {
          window.location.assign("/api/schedule/google-connect");
        }
        return;
      }

      const res = await fetch("/api/schedule/google-import", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Could not import Google Calendar events");
      }
      setGoogleLastSyncedAt(data?.syncedAt ? String(data.syncedAt) : new Date().toISOString());
      setGoogleConnected(true);
      loadEvents(viewMode, cursorDate, showWeekends, currentTerm);
      onScheduleChange?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not sync Google Calendar. Please try again.";
      setError(message);
    } finally {
      setSyncingGoogle(false);
    }
  }

  async function handleBackfillGoogleCalendar() {
    setBackfillingGoogle(true);
    setError("");
    try {
      const res = await fetch("/api/schedule/google-backfill", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Could not sync existing Google Calendar events");
      }
      loadEvents(viewMode, cursorDate, showWeekends, currentTerm);
      onScheduleChange?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not sync existing Google Calendar events.";
      setError(message);
    } finally {
      setBackfillingGoogle(false);
    }
  }

  async function handleDisconnectGoogleCalendar() {
    setDisconnectingGoogle(true);
    setError("");
    try {
      const res = await fetch("/api/schedule/google-disconnect", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Could not disconnect Google Calendar");
      }
      setGoogleConnected(false);
      setGoogleCanWrite(false);
      setGoogleEmail("");
      setGoogleLastSyncedAt(null);
      loadEvents(viewMode, cursorDate, showWeekends, currentTerm);
      onScheduleChange?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not disconnect Google Calendar.";
      setError(message);
    } finally {
      setDisconnectingGoogle(false);
    }
  }

  const selectedEventHref = useMemo(() => {
    if (!selectedEvent?.lessonPackId) return "/lesson-pack";
    return `/lesson-pack?id=${encodeURIComponent(selectedEvent.lessonPackId)}`;
  }, [selectedEvent]);
  const selectedEventDocumentHref = useMemo(() => {
    if (!selectedEvent?.linkedDocumentId) return "";
    return `/api/library/documents/${encodeURIComponent(selectedEvent.linkedDocumentId)}`;
  }, [selectedEvent]);

  async function handleDownloadSelectedAttachment() {
    if (!selectedEvent?.linkedDocumentId || !selectedEventDocumentHref || downloadingAttachment) return;

    setDownloadingAttachment(true);
    setError("");
    try {
      const res = await fetch(selectedEventDocumentHref, { credentials: "same-origin" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data?.error === "string" ? data.error : "Could not download attachment.");
      }

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = selectedEvent.linkedDocumentName || "attachment";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      setSelectedEvent(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not download attachment.");
    } finally {
      setDownloadingAttachment(false);
    }
  }

  function openEditForEvent(event: ScheduleEvent) {
    if (isImportedCalendarEvent(event)) return;
    setSelectedEvent(null);
    setEditEventId(event.id);
    setModal({
      pack: {
        id: event.lessonPackId,
        title: event.title,
        subject: event.subject,
        yearGroup: event.yearGroup,
      },
      date: event.scheduledDate,
      startTime: event.startTime,
      endTime: event.endTime,
      notes: event.notes || "",
    });
  }

  async function handleGeneratePack(eventId: string) {
    setGeneratingPack(true);
    setGeneratePackError("");
    try {
      const res = await fetch(`/api/schedule/${eventId}/generate-pack`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not generate lesson pack");
      // Update the event in local state with the new lesson pack id
      if (data.packId) {
        setEvents((prev) => prev.map((e) => e.id === eventId ? { ...e, lessonPackId: data.packId } : e));
        if (selectedEvent?.id === eventId) {
          setSelectedEvent((prev) => prev ? { ...prev, lessonPackId: data.packId } : prev);
        }
        onScheduleChange?.();
      }
    } catch (err) {
      setGeneratePackError(err instanceof Error ? err.message : "Could not generate lesson pack");
    } finally {
      setGeneratingPack(false);
    }
  }

  if (!embedded && !mounted) return null;

  const schedulerBody = (
    <>
      <aside
        className={embedded ? "scheduler-inline" : `scheduler-drawer${open ? " open" : ""}`}
        aria-label="Lesson scheduler"
        aria-modal={embedded ? undefined : "true"}
        role={embedded ? "region" : "dialog"}
      >
        {/* Header */}
        <div className={`scheduler-drawer-header${embedded ? " scheduler-drawer-header-embedded" : ""}`}>
          <div className="scheduler-drawer-header-main">
            <h2 className="scheduler-drawer-title">
              <DashboardCalendar />
              {displayName ? `${displayName.split(" ")[0]}'s Timetable` : "My Timetable"}
            </h2>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.65rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => { setQuickAddOpen(true); setQuickAddInput(""); setQuickAddParsed(null); setQuickAddError(""); }}
                title="Quick add event"
                style={{
                  display: "inline-flex", alignItems: "center", gap: "0.3rem",
                  border: "1px solid var(--border)", borderRadius: "999px",
                  background: "var(--surface)", color: "var(--muted)",
                  fontSize: "0.7rem", fontWeight: 700, padding: "0.28rem 0.7rem",
                  cursor: "pointer", whiteSpace: "nowrap",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                Quick add
              </button>
              <button
                type="button"
                onClick={() => { setBulkShiftOpen(true); setBulkShiftFrom(cursorDate.toISOString().slice(0, 10)); }}
                title="Shift a whole day"
                style={{
                  display: "inline-flex", alignItems: "center", gap: "0.3rem",
                  border: "1px solid var(--border)", borderRadius: "999px",
                  background: "var(--surface)", color: "var(--muted)",
                  fontSize: "0.7rem", fontWeight: 700, padding: "0.28rem 0.7rem",
                  cursor: "pointer", whiteSpace: "nowrap",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                Shift day
              </button>
              <button
                type="button"
                onClick={openTemplatesModal}
                title="Day templates"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  border: "1px solid var(--border)",
                  borderRadius: "999px",
                  background: "var(--surface)",
                  color: "var(--muted)",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  padding: "0.28rem 0.7rem",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
                </svg>
                Templates
              </button>
              <button
                type="button"
                className="scheduler-print-btn"
                onClick={handlePrint}
                title="Print / Save as PDF"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  border: "1px solid var(--border)",
                  borderRadius: "999px",
                  background: "var(--surface)",
                  color: "var(--muted)",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  padding: "0.28rem 0.7rem",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
                </svg>
                Print
              </button>
              <div style={{ display: "inline-flex", border: "1px solid var(--border)", borderRadius: "999px", overflow: "hidden" }}>
                {(["week", "day", "month", "term"] as CalendarViewMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setViewMode(mode)}
                    style={{
                      border: "none",
                      borderRight: mode !== "term" ? "1px solid var(--border)" : "none",
                      background: viewMode === mode ? "var(--accent)" : "var(--surface)",
                      color: viewMode === mode ? "white" : "var(--muted)",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      letterSpacing: "0.02em",
                      textTransform: "capitalize",
                      padding: "0.28rem 0.62rem",
                      cursor: "pointer",
                      textShadow: viewMode === mode ? "0 1px 0 rgb(0 0 0 / 0.22)" : undefined,
                    }}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              {viewMode === "week" || viewMode === "term" ? (
                <label
                  className="scheduler-weekends-toggle"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: embedded ? "rgba(255,255,255,0.95)" : "var(--muted)",
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={showWeekends}
                    onChange={(event) => setShowWeekends(event.target.checked)}
                    style={{ accentColor: "var(--accent-2)" }}
                  />
                  <span>Show weekends</span>
                </label>
              ) : null}
            </div>
            {!embedded ? (
              <button className="scheduler-close-btn" onClick={onClose} aria-label="Close scheduler">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M1 1l10 10M11 1L1 11"/></svg>
              </button>
            ) : null}
          </div>
          {error ? <span className="scheduler-error-banner">{error}</span> : null}
        </div>

        {/* Body */}
        <div
          className={`scheduler-drawer-inner${embedded ? " scheduler-drawer-inner-embedded" : ""}`}
          style={embedded && sidebarHeight ? ({ ["--scheduler-sidebar-height" as string]: `${sidebarHeight}px` }) : undefined}
        >
          {schedulerLoading ? (
            <div className="scheduler-loading-toast" role="status" aria-live="polite">
              <div className="scheduler-loading-toast-badge" aria-hidden="true">
                <span className="scheduler-loading-toast-spinner" />
              </div>
              <div className="scheduler-loading-toast-head">
                <span>Loading timetable</span>
                <span>{schedulerLoadProgress}%</span>
              </div>
              <p className="scheduler-loading-toast-copy">{schedulerLoadLabel}</p>
              <div className="scheduler-loading-toast-track" aria-hidden="true">
                <span className="scheduler-loading-toast-bar" style={{ width: `${schedulerLoadProgress}%` }} />
              </div>
            </div>
          ) : null}
          <aside ref={sidebarRef} className="scheduler-sidebar">
            <div className="scheduler-sidebar-pane">
              <div className="scheduler-sidebar-section-header"><span>Quick Add</span></div>
              <div className="scheduler-quick-actions">
                <button
                  className="scheduler-custom-add-btn scheduler-custom-add-btn-personal scheduler-quick-button"
                  onClick={() => setPersonalEventModalDate(toISO(cursorDate))}
                >
                  <span className="scheduler-quick-button-icon" aria-hidden="true">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="8" r="4"/><path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6"/>
                    </svg>
                  </span>
                  <span>Personal</span>
                </button>
                <button
                  className="scheduler-custom-add-btn scheduler-custom-add-btn-school scheduler-quick-button"
                  onClick={() => setCustomModalDraft({ date: toISO(cursorDate), startTime: "09:00", endTime: "10:00", category: "Meeting", lockCategory: false })}
                >
                  <span className="scheduler-quick-button-icon" aria-hidden="true">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>
                    </svg>
                  </span>
                  <span>School Event</span>
                </button>
                <Link
                  href="/lesson-pack?from=scheduler"
                  className="scheduler-custom-add-btn scheduler-custom-add-btn-lesson scheduler-quick-button"
                  onClick={onClose}
                  style={{ textDecoration: "none" }}
                >
                  <span className="scheduler-quick-button-icon" aria-hidden="true">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </span>
                  <span>Add Lesson</span>
                </Link>
              </div>

              <div
                className={`scheduler-pack-unschedule-zone${unscheduleDragOver ? " drag-over" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setUnscheduleDragOver(true);
                  e.dataTransfer.dropEffect = "move";
                }}
                onDragLeave={() => setUnscheduleDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setUnscheduleDragOver(false);
                  const eventId =
                    e.dataTransfer.getData("text/scheduler-event-id") ||
                    e.dataTransfer.getData("text/plain").replace(/^scheduler-event:/, "");
                  if (!eventId) return;
                  void handleEventDelete(eventId);
                }}
              >
                Drag a scheduled event here to unschedule it
              </div>

              <div className="scheduler-sidebar-card scheduler-sidebar-packs-card">
                <div className="scheduler-sidebar-card-title">Lesson Packs</div>
                <PackList
                  packs={packs}
                  scheduledPackIds={scheduledPackIds}
                  loading={packsLoading}
                  onUnscheduleDrop={(eventId) => { void handleEventDelete(eventId); }}
                  onDragStart={(pack) => { dragRef.current = pack; }}
                  onDragEnd={() => { dragRef.current = null; }}
                  showUnscheduleZone={false}
                />
              </div>

              <div className="scheduler-sidebar-section-header"><span>Calendar Sync</span></div>
              <div className="scheduler-sync-grid">
                <div className="scheduler-sync-tile scheduler-sync-tile-outlook">
                  <div className="scheduler-sync-tile-head">
                    <div className="scheduler-sync-tile-brand">
                      <span className="scheduler-sync-tile-brand-icon scheduler-sync-tile-brand-icon-outlook" aria-hidden="true">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="M10 4.5 18.8 6v12L10 19.5z" fill="#0A5FB4" />
                          <path d="M18.8 6H22v12h-3.2z" fill="#1976D2" />
                          <path d="M18.8 6 14.7 9.4H22z" fill="#2490FF" opacity="0.9" />
                          <path d="M18.8 18 14.7 14.6H22z" fill="#0B66C3" opacity="0.96" />
                          <path d="M4 8.4 10 7.25v9.5L4 15.6z" fill="#0358A7" />
                          <path d="M7.15 10.05c1.55 0 2.58 1.21 2.58 2.95 0 1.75-1.03 2.95-2.58 2.95-1.56 0-2.65-1.2-2.65-2.95 0-1.74 1.09-2.95 2.65-2.95zm0 1.12c-.79 0-1.29.69-1.29 1.83 0 1.15.5 1.83 1.29 1.83.76 0 1.24-.68 1.24-1.83 0-1.14-.48-1.83-1.24-1.83z" fill="#ffffff" />
                        </svg>
                      </span>
                      <span className="scheduler-sync-tile-title">Outlook</span>
                    </div>
                    <span className={`scheduler-sync-pill${outlookConnected ? " is-live" : ""}`}>
                      {outlookConnected ? "Connected" : "Not connected"}
                    </span>
                  </div>
                  <p className="scheduler-sync-tile-copy">
                    {outlookConnected
                      ? `${outlookEmail || "Outlook"}${outlookLastSyncedAt ? ` · ${new Date(outlookLastSyncedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : ""}`
                      : (outlookConfigured
                          ? "Import appointments as blocked time."
                          : "Not configured on this environment yet.")}
                  </p>
                  <button
                    className="scheduler-custom-sync-btn scheduler-custom-sync-btn-tile"
                    onClick={() => { void handleSyncOutlook(); }}
                    disabled={syncingOutlook}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/>
                    </svg>
                    {syncingOutlook
                      ? (outlookConnected ? "Refreshing…" : "Connecting…")
                      : (outlookConnected ? (outlookCanWrite ? "Refresh" : "Reconnect") : "Connect")}
                  </button>
                  {outlookConnected ? (
                    <div className="scheduler-sync-actions-row">
                      <button
                        className="scheduler-sync-secondary-btn scheduler-sync-secondary-btn-inline"
                        onClick={() => { void handleBackfillOutlook(); }}
                        disabled={backfillingOutlook}
                      >
                        {backfillingOutlook ? "Syncing…" : "Sync existing"}
                      </button>
                      <button
                        className="scheduler-sync-secondary-btn scheduler-sync-secondary-btn-inline"
                        onClick={() => { void handleDisconnectOutlook(); }}
                        disabled={disconnectingOutlook}
                      >
                        {disconnectingOutlook ? "Disconnecting…" : "Disconnect"}
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="scheduler-sync-tile scheduler-sync-tile-google">
                  <div className="scheduler-sync-tile-head">
                    <div className="scheduler-sync-tile-brand">
                      <span className="scheduler-sync-tile-brand-icon scheduler-sync-tile-brand-icon-google" aria-hidden="true">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                      </span>
                      <span className="scheduler-sync-tile-title">Google</span>
                    </div>
                    <span className={`scheduler-sync-pill${googleConnected ? " is-live" : ""}`}>
                      {googleConnected ? "Connected" : "Not connected"}
                    </span>
                  </div>
                  <p className="scheduler-sync-tile-copy">
                    {googleConnected
                      ? `${googleEmail || "Google Calendar"}${googleLastSyncedAt ? ` · ${new Date(googleLastSyncedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : ""}`
                      : (googleConfigured
                          ? "Import appointments and mirror scheduler events."
                          : "Not configured on this environment yet.")}
                  </p>
                  <button
                    className="scheduler-custom-sync-btn scheduler-custom-sync-btn-tile"
                    onClick={() => { void handleSyncGoogleCalendar(); }}
                    disabled={syncingGoogle}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/>
                    </svg>
                    {syncingGoogle
                      ? (googleConnected ? "Refreshing…" : "Connecting…")
                      : (googleConnected ? (googleCanWrite ? "Refresh" : "Reconnect") : "Connect")}
                  </button>
                  {googleConnected ? (
                    <div className="scheduler-sync-actions-row">
                      <button
                        className="scheduler-sync-secondary-btn scheduler-sync-secondary-btn-inline"
                        onClick={() => { void handleBackfillGoogleCalendar(); }}
                        disabled={backfillingGoogle}
                      >
                        {backfillingGoogle ? "Syncing…" : "Sync existing"}
                      </button>
                      <button
                        className="scheduler-sync-secondary-btn scheduler-sync-secondary-btn-inline"
                        onClick={() => { void handleDisconnectGoogleCalendar(); }}
                        disabled={disconnectingGoogle}
                      >
                        {disconnectingGoogle ? "Disconnecting…" : "Disconnect"}
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </aside>

          <WeekCalendar
            events={filteredCalendarEvents}
            viewMode={viewMode}
            cursorDate={cursorDate}
            currentTerm={currentTerm}
            layoutVersion={sidebarHeight}
            showWeekends={showWeekends}
            activeFilters={activeFilters}
            showViewToggle={false}
            onFilterChange={setActiveFilters}
            onViewModeChange={setViewMode}
            onNavigate={handleNavigate}
            onGoToday={handleGoToday}
            onDrop={handleDrop}
            onEmptySlotClick={(date, slotTime) => setCustomModalDraft({ date, startTime: slotTime, endTime: addMinutes(slotTime, 60), category: "Meeting", lockCategory: false })}
            onEventReschedule={handleEventReschedule}
            onEventDelete={handleEventDelete}
            onEventClick={(evt) => {
              setSelectedEvent(evt);
              setEventObjectives([]);
              setObjectivesPickerOpen(false);
              setObjectivesFilter("");
              void loadEventObjectives(evt.id);
              if (evt.subject && evt.yearGroup) void loadAvailableObjectives(evt.subject, evt.yearGroup);
            }}
          />
        </div>

        {/* Event action modal */}
        {selectedEvent && (
          <div className="scheduler-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setSelectedEvent(null); }}>
            <div className="scheduler-modal">
              <button
                type="button"
                className="scheduler-modal-x"
                aria-label="Close"
                onClick={() => setSelectedEvent(null)}
              >
                ×
              </button>
              <div>
                <span className="scheduler-modal-subject-chip">{selectedEvent.subject} · {selectedEvent.yearGroup}</span>
                <h2 className="scheduler-modal-title">{selectedEvent.title}</h2>
                <p className="scheduler-modal-date">
                  {prettyDate(selectedEvent.scheduledDate)} · {selectedEvent.startTime}-{selectedEvent.endTime}
                </p>
                {isImportedCalendarEvent(selectedEvent) ? (
                  <p className="scheduler-modal-date" style={{ marginTop: "0.35rem" }}>
                    Imported from calendar · read-only in PrimaryAI
                  </p>
                ) : null}
              </div>
              {selectedEvent.eventType === "lesson_pack" && !isImportedCalendarEvent(selectedEvent) && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.65rem", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.74rem", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Marking load</span>
                  {(["low", "medium", "high"] as const).map((lvl) => {
                    const active = selectedEvent.effort === lvl;
                    const colors = { low: "#22c55e", medium: "#f59e0b", high: "#ef4444" };
                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => {
                          const newEffort = active ? null : lvl;
                          fetch(`/api/schedule/${selectedEvent.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ effort: newEffort }),
                          }).then(() => {
                            setEvents((prev) => prev.map((e) => e.id === selectedEvent.id ? { ...e, effort: newEffort } : e));
                            setSelectedEvent((prev) => prev ? { ...prev, effort: newEffort } : null);
                          }).catch(() => {});
                        }}
                        style={{
                          padding: "0.2rem 0.6rem",
                          borderRadius: "999px",
                          border: `1.5px solid ${active ? colors[lvl] : "var(--border)"}`,
                          background: active ? `color-mix(in srgb, ${colors[lvl]} 15%, transparent)` : "transparent",
                          color: active ? colors[lvl] : "var(--muted)",
                          fontSize: "0.74rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          fontFamily: "inherit",
                          textTransform: "capitalize",
                          transition: "all 150ms ease",
                        }}
                      >
                        {lvl}
                      </button>
                    );
                  })}
                </div>
              )}
              {/* NC Objectives */}
              {selectedEvent.eventType === "lesson_pack" && !isImportedCalendarEvent(selectedEvent) && (
                <div style={{ marginTop: "0.85rem", borderTop: "1px solid var(--border)", paddingTop: "0.75rem" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.45rem" }}>
                    <span style={{ fontSize: "0.74rem", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      NC Objectives {eventObjectives.length > 0 ? `(${eventObjectives.length})` : ""}
                    </span>
                    <button
                      type="button"
                      onClick={() => setObjectivesPickerOpen((v) => !v)}
                      style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0 }}
                    >
                      {objectivesPickerOpen ? "Close" : "+ Add objective"}
                    </button>
                  </div>
                  {eventObjectives.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", marginBottom: objectivesPickerOpen ? "0.6rem" : 0 }}>
                      {eventObjectives.map((obj) => (
                        <div key={obj.id} style={{ display: "flex", alignItems: "flex-start", gap: "0.4rem", padding: "0.35rem 0.5rem", borderRadius: "7px", background: "var(--surface)", border: "1px solid var(--border)" }}>
                          <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--accent)", whiteSpace: "nowrap", marginTop: "1px" }}>{obj.code}</span>
                          <span style={{ flex: 1, fontSize: "0.75rem", color: "var(--fg)", lineHeight: 1.4 }}>{obj.description}</span>
                          <button
                            type="button"
                            onClick={() => void toggleObjective(selectedEvent.id, obj.id, true)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: "0.85rem", padding: "0 2px", lineHeight: 1, flexShrink: 0 }}
                            aria-label="Remove"
                          >×</button>
                        </div>
                      ))}
                    </div>
                  )}
                  {objectivesPickerOpen && (
                    <div>
                      <input
                        className="scheduler-modal-input"
                        placeholder="Search objectives…"
                        value={objectivesFilter}
                        onChange={(e) => setObjectivesFilter(e.target.value)}
                        style={{ width: "100%", marginBottom: "0.45rem" }}
                      />
                      <div style={{ maxHeight: "180px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                        {availableObjectives
                          .filter((o) => {
                            const linked = eventObjectives.some((e) => e.id === o.id);
                            if (linked) return false;
                            if (!objectivesFilter) return true;
                            const q = objectivesFilter.toLowerCase();
                            return o.description.toLowerCase().includes(q) || o.code.toLowerCase().includes(q) || o.strand.toLowerCase().includes(q);
                          })
                          .slice(0, 20)
                          .map((o) => (
                            <button
                              key={o.id}
                              type="button"
                              onClick={() => void toggleObjective(selectedEvent.id, o.id, false)}
                              style={{ display: "flex", alignItems: "flex-start", gap: "0.4rem", padding: "0.35rem 0.5rem", borderRadius: "7px", background: "var(--surface)", border: "1px solid var(--border)", cursor: "pointer", textAlign: "left", fontFamily: "inherit", width: "100%" }}
                            >
                              <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--accent)", whiteSpace: "nowrap", marginTop: "1px" }}>{o.code}</span>
                              <span style={{ flex: 1, fontSize: "0.73rem", color: "var(--fg)", lineHeight: 1.4 }}>{o.description}</span>
                            </button>
                          ))}
                        {availableObjectives.filter((o) => !eventObjectives.some((e) => e.id === o.id)).length === 0 && (
                          <p style={{ fontSize: "0.75rem", color: "var(--muted)", textAlign: "center", padding: "0.5rem 0" }}>No objectives found for {selectedEvent.subject}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {generatePackError ? (
                <p style={{ margin: "0.5rem 0 0", fontSize: "0.8rem", color: "#ef4444" }}>{generatePackError}</p>
              ) : null}
              <div className="scheduler-modal-actions">
                <div style={{ display: "flex", gap: "0.55rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
                  {!isImportedCalendarEvent(selectedEvent) ? (
                    <button className="scheduler-modal-cancel" onClick={() => openEditForEvent(selectedEvent)}>
                      Edit event
                    </button>
                  ) : null}
                  {!selectedEvent.lessonPackId && selectedEvent.eventType !== "custom" ? (
                    <button
                      className="scheduler-modal-cancel"
                      onClick={() => void handleGeneratePack(selectedEvent.id)}
                      disabled={generatingPack}
                      style={{ opacity: generatingPack ? 0.6 : 1 }}
                    >
                      {generatingPack ? "Generating pack…" : "✨ Generate lesson pack"}
                    </button>
                  ) : null}
                  {selectedEvent.lessonPackId ? (
                    <Link href={selectedEventHref} className="scheduler-modal-confirm" onClick={() => setSelectedEvent(null)}>
                      Open Full Lesson Pack
                    </Link>
                  ) : null}
                  {selectedEvent.linkedDocumentId ? (
                    <button
                      type="button"
                      className="scheduler-modal-confirm"
                      onClick={() => void handleDownloadSelectedAttachment()}
                      disabled={downloadingAttachment}
                      style={{ opacity: downloadingAttachment ? 0.7 : 1 }}
                    >
                      Open Attachment{selectedEvent.linkedDocumentName ? `: ${selectedEvent.linkedDocumentName}` : ""}
                    </button>
                  ) : null}
                </div>
              </div>
              <NotesPanel scheduleEventId={selectedEvent.id} />
            </div>
          </div>
        )}

        {/* Time picker modal */}
        {modal && (
          <ScheduleModal
            payload={modal}
            saving={saving}
            mode={editEventId ? "edit" : "create"}
            onConfirm={handleConfirm}
            onCancel={() => { setModal(null); setEditEventId(null); dragRef.current = null; }}
          />
        )}
        {customModalDraft && (
          <CustomEventModal
            date={customModalDraft.date}
            initialStartTime={customModalDraft.startTime}
            initialEndTime={customModalDraft.endTime}
            initialCategory={customModalDraft.category}
            lockCategory={Boolean(customModalDraft.lockCategory)}
            saving={saving}
            onConfirm={handleCreateCustomEvent}
            onCancel={() => setCustomModalDraft(null)}
          />
        )}
        {personalEventModalDate && (
          <PersonalEventModal
            date={personalEventModalDate}
            saving={savingPersonalEvent}
            onConfirm={handleCreatePersonalEvent}
            onCancel={() => setPersonalEventModalDate(null)}
          />
        )}
        {quickAddOpen && (
          <div className="scheduler-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setQuickAddOpen(false); }}>
            <div className="scheduler-modal" style={{ maxWidth: 460, width: "100%" }}>
              <button type="button" className="scheduler-modal-x" onClick={() => setQuickAddOpen(false)}>×</button>
              <h2 className="scheduler-modal-title">Quick Add</h2>
              <p style={{ fontSize: "0.82rem", color: "var(--muted)", marginTop: 0, marginBottom: "0.85rem" }}>
                Describe an event in plain English, e.g. <em>"Year 3 Maths tomorrow at 9am"</em> or <em>"Staff meeting Thursday 3-4pm"</em>
              </p>
              <input
                className="scheduler-modal-input"
                style={{ width: "100%", marginBottom: "0.75rem" }}
                placeholder="Year 4 Science Friday 10am–11am"
                value={quickAddInput}
                onChange={(e) => {
                  setQuickAddInput(e.target.value);
                  void previewQuickAdd(e.target.value);
                }}
                onKeyDown={(e) => { if (e.key === "Enter") void confirmQuickAdd(); }}
                autoFocus
              />
              {quickAddParsed && (
                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "0.65rem 0.85rem", marginBottom: "0.75rem", fontSize: "0.8rem", color: "var(--fg)" }}>
                  <p style={{ margin: "0 0 0.2rem", fontWeight: 700 }}>Parsed as:</p>
                  <p style={{ margin: 0, color: "var(--muted)" }}>
                    <strong>{quickAddParsed.title}</strong>{quickAddParsed.subject !== "Other" ? ` · ${quickAddParsed.subject}` : ""}{quickAddParsed.year_group ? ` · ${quickAddParsed.year_group}` : ""}<br/>
                    {quickAddParsed.scheduled_date} · {quickAddParsed.start_time.slice(0,5)}–{quickAddParsed.end_time.slice(0,5)}
                  </p>
                </div>
              )}
              {quickAddError && <p className="scheduler-modal-error">{quickAddError}</p>}
              <div className="scheduler-modal-actions">
                <button type="button" className="scheduler-modal-cancel" onClick={() => setQuickAddOpen(false)}>Cancel</button>
                <button type="button" className="scheduler-modal-confirm" disabled={quickAddSaving || !quickAddInput.trim()} onClick={() => void confirmQuickAdd()}>
                  {quickAddSaving ? "Adding…" : "Add event"}
                </button>
              </div>
            </div>
          </div>
        )}
        {bulkShiftOpen && (
          <div className="scheduler-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setBulkShiftOpen(false); }}>
            <div className="scheduler-modal" style={{ maxWidth: 400, width: "100%" }}>
              <button type="button" className="scheduler-modal-x" onClick={() => setBulkShiftOpen(false)}>×</button>
              <h2 className="scheduler-modal-title">Shift a Day</h2>
              <p style={{ fontSize: "0.82rem", color: "var(--muted)", marginTop: 0, marginBottom: "1rem" }}>
                Move all events from one day to another. Imported calendar events are not affected.
              </p>
              <div className="scheduler-modal-fields">
                <label className="scheduler-modal-field">
                  <span className="scheduler-modal-label">From date</span>
                  <input type="date" value={bulkShiftFrom} onChange={(e) => setBulkShiftFrom(e.target.value)} className="scheduler-modal-input" />
                </label>
                <label className="scheduler-modal-field">
                  <span className="scheduler-modal-label">To date</span>
                  <input type="date" value={bulkShiftTo} onChange={(e) => setBulkShiftTo(e.target.value)} className="scheduler-modal-input" />
                </label>
              </div>
              <div className="scheduler-modal-actions">
                <button type="button" className="scheduler-modal-cancel" onClick={() => setBulkShiftOpen(false)}>Cancel</button>
                <button type="button" className="scheduler-modal-confirm" disabled={bulkShiftSaving || !bulkShiftFrom || !bulkShiftTo || bulkShiftFrom === bulkShiftTo} onClick={() => void doBulkShift()}>
                  {bulkShiftSaving ? "Shifting…" : "Shift events"}
                </button>
              </div>
            </div>
          </div>
        )}
        {clashModal && (
          <div className="scheduler-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setClashModal(null); }}>
            <div className="scheduler-modal" style={{ maxWidth: 420, width: "100%" }}>
              <button type="button" className="scheduler-modal-x" onClick={() => setClashModal(null)}>×</button>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                <span style={{ fontSize: "1.3rem" }}>⚠️</span>
                <h2 className="scheduler-modal-title" style={{ margin: 0 }}>Scheduling Conflict</h2>
              </div>
              <p style={{ fontSize: "0.85rem", color: "var(--fg)", marginTop: 0, marginBottom: "0.75rem" }}>
                This slot overlaps with {clashModal.clashes.length === 1 ? "an existing event" : `${clashModal.clashes.length} existing events`}:
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "1.1rem" }}>
                {clashModal.clashes.map((c, i) => (
                  <div key={i} style={{ background: "var(--surface)", border: "1px solid #fca5a5", borderRadius: "8px", padding: "0.5rem 0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "0.83rem", fontWeight: 600, color: "var(--fg)" }}>{c.title}</span>
                    <span style={{ fontSize: "0.75rem", color: "var(--muted)", whiteSpace: "nowrap" }}>{c.time}</span>
                  </div>
                ))}
              </div>
              <div className="scheduler-modal-actions">
                <button type="button" className="scheduler-modal-cancel" onClick={() => setClashModal(null)}>Cancel</button>
                <button type="button" className="scheduler-modal-confirm" onClick={clashModal.onProceed} style={{ background: "#f97316", borderColor: "#f97316" }}>
                  Schedule anyway
                </button>
              </div>
            </div>
          </div>
        )}
        {templatesOpen && (
          <div className="scheduler-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) { setTemplatesOpen(false); setSaveTemplateForm(null); setApplyTemplateId(null); } }}>
            <div className="scheduler-modal" style={{ maxWidth: 480, width: "100%" }}>
              <button type="button" className="scheduler-modal-x" onClick={() => { setTemplatesOpen(false); setSaveTemplateForm(null); setApplyTemplateId(null); }}>×</button>
              <h2 className="scheduler-modal-title">Day Templates</h2>
              <p style={{ fontSize: "0.82rem", color: "var(--muted)", marginTop: 0, marginBottom: "1rem" }}>
                Save a day layout and apply it to any date in one click.
              </p>

              {/* Save current day as template */}
              {saveTemplateForm ? (
                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "0.85rem", marginBottom: "1rem" }}>
                  <p style={{ margin: "0 0 0.6rem", fontSize: "0.82rem", fontWeight: 600, color: "var(--fg)" }}>Save today's layout as a template</p>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
                    <input
                      value={saveTemplateForm.name}
                      onChange={(e) => setSaveTemplateForm((f) => f ? { ...f, name: e.target.value } : f)}
                      placeholder="Template name (e.g. Monday Science)"
                      className="scheduler-modal-input"
                      style={{ flex: 1, minWidth: 160 }}
                    />
                    <select
                      value={saveTemplateForm.dayOfWeek}
                      onChange={(e) => setSaveTemplateForm((f) => f ? { ...f, dayOfWeek: e.target.value } : f)}
                      className="scheduler-modal-input"
                      style={{ minWidth: 90 }}
                    >
                      {["mon","tue","wed","thu","fri"].map((d) => (
                        <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button type="button" className="scheduler-modal-cancel" onClick={() => setSaveTemplateForm(null)} disabled={savingTemplate}>Cancel</button>
                    <button
                      type="button"
                      className="scheduler-modal-confirm"
                      disabled={savingTemplate || !saveTemplateForm.name.trim()}
                      onClick={() => { void saveAsTemplate(saveTemplateForm.name.trim(), saveTemplateForm.dayOfWeek); }}
                    >
                      {savingTemplate ? "Saving…" : "Save template"}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="scheduler-modal-confirm"
                  style={{ marginBottom: "1rem", width: "100%" }}
                  onClick={() => {
                    const dow = ["sun","mon","tue","wed","thu","fri","sat"][cursorDate.getDay()] ?? "mon";
                    setSaveTemplateForm({ name: "", dayOfWeek: dow });
                  }}
                >
                  + Save today as template
                </button>
              )}

              {/* Template list */}
              {dayTemplates.length === 0 ? (
                <p style={{ fontSize: "0.82rem", color: "var(--muted)", textAlign: "center", padding: "1rem 0" }}>No templates saved yet.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {dayTemplates.map((tpl) => (
                    <div key={tpl.id} style={{ border: "1px solid var(--border)", borderRadius: "10px", padding: "0.7rem 0.85rem", background: "var(--surface)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: applyTemplateId === tpl.id ? "0.6rem" : 0 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: "0.87rem", fontWeight: 700, color: "var(--fg)" }}>{tpl.name}</p>
                          <p style={{ margin: 0, fontSize: "0.73rem", color: "var(--muted)" }}>
                            {tpl.day_of_week.charAt(0).toUpperCase() + tpl.day_of_week.slice(1)} · {tpl.blocks.length} block{tpl.blocks.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setApplyTemplateId(applyTemplateId === tpl.id ? null : tpl.id)}
                          style={{ padding: "0.22rem 0.65rem", borderRadius: "7px", border: "1px solid var(--accent)", background: "transparent", color: "var(--accent)", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                        >
                          Apply
                        </button>
                        <button
                          type="button"
                          onClick={() => { void deleteTemplate(tpl.id); }}
                          style={{ padding: "0.22rem 0.55rem", borderRadius: "7px", border: "1px solid #fca5a5", background: "transparent", color: "#ef4444", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                        >
                          ×
                        </button>
                      </div>
                      {applyTemplateId === tpl.id && (
                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                          <input
                            type="date"
                            value={applyTemplateDate}
                            onChange={(e) => setApplyTemplateDate(e.target.value)}
                            className="scheduler-modal-input"
                            style={{ flex: 1, minWidth: 130 }}
                          />
                          <button
                            type="button"
                            className="scheduler-modal-confirm"
                            disabled={applyingTemplate || !applyTemplateDate}
                            onClick={() => { void applyTemplate(tpl.id, applyTemplateDate); }}
                          >
                            {applyingTemplate ? "Applying…" : "Apply to date"}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </aside>
    </>
  );

  if (embedded) {
    return schedulerBody;
  }

  return createPortal(
    <>
      <div className={`scheduler-backdrop${open ? " open" : ""}`} onClick={onClose} />
      {schedulerBody}
    </>,
    document.body
  );
}
