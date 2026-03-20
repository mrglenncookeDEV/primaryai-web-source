"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import dynamic from "next/dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExcalidrawImperativeAPI = any;

type ExcalidrawData = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  elements: readonly any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  appState: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  files: Record<string, any>;
};

const Excalidraw = dynamic(
  () => import("@excalidraw/excalidraw").then((m) => m.Excalidraw),
  { ssr: false, loading: () => <div className="whiteboard-loading">Loading whiteboard…</div> }
);

type Props = {
  noteId: string;
  initialData?: ExcalidrawData | null;
  isDark?: boolean;
  onSave?: (data: ExcalidrawData) => void;
};

const SAVE_DEBOUNCE_MS = 1500;

export default function WhiteboardEditor({ noteId, initialData, isDark, onSave }: Props) {
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saving, setSaving] = useState(false);

  const save = useCallback(async (data: ExcalidrawData) => {
    setSaving(true);
    try {
      await fetch(`/api/notes/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content_json: data }),
      });
      onSave?.(data);
    } finally {
      setSaving(false);
    }
  }, [noteId, onSave]);

  const handleChange = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (elements: readonly any[], appState: any, files: any) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        save({ elements, appState: { viewBackgroundColor: appState.viewBackgroundColor }, files });
      }, SAVE_DEBOUNCE_MS);
    },
    [save]
  );

  // Cleanup timer on unmount
  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  return (
    <div className="whiteboard-wrap">
      <div className="whiteboard-save-indicator" aria-live="polite">
        {saving && <span>Saving…</span>}
      </div>
      <Excalidraw
        excalidrawAPI={(api) => { apiRef.current = api; }}
        initialData={initialData ?? undefined}
        onChange={handleChange}
        theme={isDark ? "dark" : "light"}
        UIOptions={{
          canvasActions: {
            saveToActiveFile: false,
            loadScene: false,
            export: { saveFileToDisk: true },
          },
        }}
      />
    </div>
  );
}
