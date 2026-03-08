"use client";

import { useState } from "react";

type Props = {
  date: string;
  initialStartTime?: string;
  initialEndTime?: string;
  initialCategory?: string;
  categoryOptions?: string[];
  lockCategory?: boolean;
  saving: boolean;
  onConfirm: (data: {
    title: string;
    category: string;
    scheduledDate: string;
    startTime: string;
    endTime: string;
    notes: string;
    allDay: boolean;
    repeat: "none" | "daily" | "weekly";
    repeatUntil: string | null;
  }) => void;
  onCancel: () => void;
};

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

const CATEGORIES = [
  "Meeting",
  "Holiday",
  "Training",
  "Parent Meeting",
  "School Event",
  "Deadline",
  "Other",
];

export default function CustomEventModal({
  date,
  initialStartTime = "09:00",
  initialEndTime = "10:00",
  initialCategory = "Meeting",
  categoryOptions = CATEGORIES,
  lockCategory = false,
  saving,
  onConfirm,
  onCancel,
}: Props) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const [scheduledDate, setScheduledDate] = useState(date);
  const [startTime, setStartTime] = useState(initialStartTime);
  const [endTime, setEndTime] = useState(initialEndTime);
  const [notes, setNotes] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [repeat, setRepeat] = useState<"none" | "daily" | "weekly">("none");
  const [repeatUntil, setRepeatUntil] = useState("");
  const [error, setError] = useState("");

  function handleConfirm() {
    if (!title.trim()) {
      setError("Please add an event title.");
      return;
    }
    if (!scheduledDate) {
      setError("Please choose a date.");
      return;
    }
    if (!allDay && startTime >= endTime) {
      setError("End time must be after start time.");
      return;
    }
    if (repeat !== "none" && !repeatUntil) {
      setError("Please choose when the recurring event should end.");
      return;
    }
    if (repeat !== "none" && repeatUntil < scheduledDate) {
      setError("Repeat until must be on or after the first event date.");
      return;
    }
    setError("");
    onConfirm({
      title: title.trim(),
      category,
      scheduledDate,
      startTime: allDay ? "00:00" : startTime,
      endTime: allDay ? "23:59" : endTime,
      notes,
      allDay,
      repeat,
      repeatUntil: repeat === "none" ? null : repeatUntil,
    });
  }

  return (
    <div className="scheduler-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="scheduler-modal">
        <div>
          <span className="scheduler-modal-subject-chip">Custom event</span>
          <h2 className="scheduler-modal-title">Add to schedule</h2>
          <p className="scheduler-modal-date">{formatDate(scheduledDate)}</p>
        </div>

        <div className="scheduler-modal-field">
          <label className="scheduler-modal-label">Title</label>
          <input
            className="scheduler-modal-input"
            value={title}
            onChange={(e) => { setTitle(e.target.value); setError(""); }}
            placeholder="e.g. Phase meeting"
          />
        </div>

        <div className="scheduler-modal-fields">
          <div className="scheduler-modal-field">
            <label className="scheduler-modal-label">Category</label>
            {lockCategory ? (
              <input className="scheduler-modal-input" value={category} readOnly />
            ) : (
              <select className="scheduler-modal-input" value={category} onChange={(e) => setCategory(e.target.value)}>
                {categoryOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            )}
          </div>
          <div className="scheduler-modal-field">
            <label className="scheduler-modal-label">Date</label>
            <input
              type="date"
              className="scheduler-modal-input"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
            />
          </div>
        </div>

        <div className="scheduler-modal-fields">
          <div className="scheduler-modal-field">
            <label className="scheduler-modal-label">Start time</label>
            <input
              type="time"
              className="scheduler-modal-input"
              value={startTime}
              disabled={allDay}
              onChange={(e) => { setStartTime(e.target.value); setError(""); }}
            />
          </div>
          <div className="scheduler-modal-field">
            <label className="scheduler-modal-label">End time</label>
            <input
              type="time"
              className="scheduler-modal-input"
              value={endTime}
              disabled={allDay}
              onChange={(e) => { setEndTime(e.target.value); setError(""); }}
            />
          </div>
        </div>

        <div className="scheduler-modal-field">
          <label className="scheduler-modal-label" style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
            <input
              type="checkbox"
              checked={allDay}
              onChange={(e) => {
                setAllDay(e.target.checked);
                setError("");
              }}
            />
            All day
          </label>
        </div>

        <div className="scheduler-modal-fields">
          <div className="scheduler-modal-field">
            <label className="scheduler-modal-label">Repeat</label>
            <select
              className="scheduler-modal-input"
              value={repeat}
              onChange={(e) => {
                const value = e.target.value as "none" | "daily" | "weekly";
                setRepeat(value);
                if (value === "none") setRepeatUntil("");
                setError("");
              }}
            >
              <option value="none">Does not repeat</option>
              <option value="daily">Every day</option>
              <option value="weekly">Every week</option>
            </select>
          </div>
          <div className="scheduler-modal-field">
            <label className="scheduler-modal-label">Repeat until</label>
            <input
              type="date"
              className="scheduler-modal-input"
              value={repeatUntil}
              disabled={repeat === "none"}
              min={scheduledDate}
              onChange={(e) => {
                setRepeatUntil(e.target.value);
                setError("");
              }}
            />
          </div>
        </div>

        {error && <p className="scheduler-modal-error">{error}</p>}

        <div className="scheduler-modal-field">
          <label className="scheduler-modal-label">Notes (optional)</label>
          <textarea
            className="scheduler-modal-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything attendees should know…"
          />
        </div>

        <div className="scheduler-modal-actions">
          <button className="scheduler-modal-cancel" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button className="scheduler-modal-confirm" onClick={handleConfirm} disabled={saving}>
            {saving ? "Saving…" : "Add event"}
          </button>
        </div>
      </div>
    </div>
  );
}
