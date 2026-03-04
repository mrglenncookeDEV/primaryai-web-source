"use client";

import { useMemo, useState } from "react";
import { subjectColor } from "@/lib/subjectColor";

export type PackItem = {
  id: string;
  title: string;
  subject: string;
  yearGroup: string;
  topic: string;
};

type Props = {
  packs: PackItem[];
  scheduledPackIds?: string[];
  loading: boolean;
  onUnscheduleDrop: (eventId: string) => void;
  onDragStart: (pack: PackItem) => void;
  onDragEnd: () => void;
};

const GripIcon = () => (
  <svg className="scheduler-pack-grip" width="10" height="14" viewBox="0 0 10 14" fill="currentColor" aria-hidden="true">
    <circle cx="2.5" cy="2.5" r="1.2" />
    <circle cx="7.5" cy="2.5" r="1.2" />
    <circle cx="2.5" cy="7" r="1.2" />
    <circle cx="7.5" cy="7" r="1.2" />
    <circle cx="2.5" cy="11.5" r="1.2" />
    <circle cx="7.5" cy="11.5" r="1.2" />
  </svg>
);

export default function PackList({ packs, scheduledPackIds = [], loading, onUnscheduleDrop, onDragStart, onDragEnd }: Props) {
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [unscheduleDragOver, setUnscheduleDragOver] = useState(false);

  const subjects = useMemo(() => {
    const s = new Set(packs.map((p) => p.subject));
    return Array.from(s).sort();
  }, [packs]);

  const yearGroups = useMemo(() => {
    const order = ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"];
    const s = new Set(packs.map((p) => p.yearGroup));
    return order.filter((y) => s.has(y));
  }, [packs]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return packs.filter((p) => {
      if (subjectFilter !== "all" && p.subject !== subjectFilter) return false;
      if (yearFilter !== "all" && p.yearGroup !== yearFilter) return false;
      if (q && !p.title.toLowerCase().includes(q) && !p.topic.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [packs, search, subjectFilter, yearFilter]);
  const scheduledSet = useMemo(() => new Set(scheduledPackIds), [scheduledPackIds]);
  const unscheduled = useMemo(() => filtered.filter((pack) => !scheduledSet.has(pack.id)), [filtered, scheduledSet]);
  const scheduled = useMemo(() => filtered.filter((pack) => scheduledSet.has(pack.id)), [filtered, scheduledSet]);

  function renderPackCard(pack: PackItem, isScheduled: boolean) {
    const color = subjectColor(pack.subject);
    return (
      <div
        key={pack.id}
        className={`scheduler-pack-card${draggingId === pack.id ? " dragging" : ""}${isScheduled ? " is-disabled" : ""}`}
        draggable={!isScheduled}
        onDragStart={(e) => {
          if (isScheduled) {
            e.preventDefault();
            return;
          }
          e.dataTransfer.effectAllowed = "copy";
          setDraggingId(pack.id);
          onDragStart(pack);
        }}
        onDragEnd={() => {
          setDraggingId(null);
          onDragEnd();
        }}
        style={{ borderLeft: `3px solid ${color}` }}
      >
        <GripIcon />
        <div className="scheduler-pack-info">
          <div className="scheduler-pack-name">{pack.title}</div>
          <div className="scheduler-pack-meta">
            {pack.yearGroup} · {pack.subject}
            {isScheduled ? " · Scheduled" : ""}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="scheduler-pack-panel">
      <div className="scheduler-pack-filters">
        <input
          className="scheduler-pack-search"
          type="search"
          placeholder="Search packs…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="scheduler-pack-select" value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
          <option value="all">All subjects</option>
          {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="scheduler-pack-select" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
          <option value="all">All year groups</option>
          {yearGroups.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
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
          onUnscheduleDrop(eventId);
        }}
      >
        Drag a scheduled event here to unschedule it
      </div>

      <div className="scheduler-pack-scroll">
        {loading && (
          <p className="scheduler-pack-empty">Loading packs…</p>
        )}
        {!loading && filtered.length === 0 && (
          <p className="scheduler-pack-empty">
            {packs.length === 0 ? "No saved packs yet. Generate and save a lesson pack to schedule it." : "No packs match your filters."}
          </p>
        )}
        {!loading && unscheduled.length > 0 && (
          <>
            <div className="scheduler-pack-divider">
              <span>Unscheduled</span>
            </div>
            {unscheduled.map((pack) => renderPackCard(pack, false))}
          </>
        )}
        {!loading && unscheduled.length > 0 && scheduled.length > 0 && (
          <div className="scheduler-pack-divider">
            <span>Already Scheduled</span>
          </div>
        )}
        {!loading && scheduled.length > 0 && (
          <>
            {unscheduled.length === 0 && (
              <div className="scheduler-pack-divider">
                <span>Already Scheduled</span>
              </div>
            )}
            {scheduled.map((pack) => renderPackCard(pack, true))}
          </>
        )}
      </div>
    </div>
  );
}
