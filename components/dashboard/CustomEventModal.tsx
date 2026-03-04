"use client";

import { useState } from "react";

type Props = {
  date: string;
  saving: boolean;
  onConfirm: (data: {
    title: string;
    category: string;
    scheduledDate: string;
    startTime: string;
    endTime: string;
    notes: string;
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
  "Personal",
  "Holiday",
  "Training",
  "Parent Meeting",
  "School Event",
  "Deadline",
  "Other",
];

export default function CustomEventModal({ date, saving, onConfirm, onCancel }: Props) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Meeting");
  const [scheduledDate, setScheduledDate] = useState(date);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [notes, setNotes] = useState("");
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
    if (startTime >= endTime) {
      setError("End time must be after start time.");
      return;
    }
    setError("");
    onConfirm({
      title: title.trim(),
      category,
      scheduledDate,
      startTime,
      endTime,
      notes,
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
            <select className="scheduler-modal-input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
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
              onChange={(e) => { setStartTime(e.target.value); setError(""); }}
            />
          </div>
          <div className="scheduler-modal-field">
            <label className="scheduler-modal-label">End time</label>
            <input
              type="time"
              className="scheduler-modal-input"
              value={endTime}
              onChange={(e) => { setEndTime(e.target.value); setError(""); }}
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
