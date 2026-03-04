"use client";

import { useState } from "react";
import { subjectColor } from "@/lib/subjectColor";

export type ModalPayload = {
  pack: { id: string; title: string; subject: string; yearGroup: string };
  date: string;      // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  notes?: string;
};

type Props = {
  payload: ModalPayload;
  saving: boolean;
  mode?: "create" | "edit";
  onConfirm: (data: { startTime: string; endTime: string; notes: string }) => void;
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

export default function ScheduleModal({ payload, saving, onConfirm, onCancel, mode = "create" }: Props) {
  const [startTime, setStartTime] = useState(payload.startTime);
  const [endTime, setEndTime] = useState(payload.endTime);
  const [notes, setNotes] = useState(payload.notes || "");
  const [error, setError] = useState("");

  const color = subjectColor(payload.pack.subject);

  function handleConfirm() {
    if (startTime >= endTime) {
      setError("End time must be after start time.");
      return;
    }
    setError("");
    onConfirm({ startTime, endTime, notes });
  }

  return (
    <div className="scheduler-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="scheduler-modal">
        <div>
          <span
            className="scheduler-modal-subject-chip"
            style={{
              background: `color-mix(in srgb, ${color} 18%, transparent)`,
              color,
              border: `1px solid color-mix(in srgb, ${color} 35%, transparent)`,
            }}
          >
            {payload.pack.subject} · {payload.pack.yearGroup}
          </span>
          <h2 className="scheduler-modal-title">{payload.pack.title}</h2>
          <p className="scheduler-modal-date">{formatDate(payload.date)}</p>
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
            placeholder="e.g. Bring whiteboards, set up laptop trolley…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="scheduler-modal-actions">
          <button className="scheduler-modal-cancel" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button className="scheduler-modal-confirm" onClick={handleConfirm} disabled={saving}>
            {saving ? "Saving…" : mode === "edit" ? "Save changes" : "Add to schedule"}
          </button>
        </div>
      </div>
    </div>
  );
}
