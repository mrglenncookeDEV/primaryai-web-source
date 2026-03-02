"use client";

import { useState, useEffect, useRef } from "react";

const PALETTES = [
  { id: "duck-egg", label: "Duck egg",   swatch: "#78d8cf" },
  { id: "sage",     label: "Sage green", swatch: "#7ab87a" },
  { id: "lavender", label: "Lavender",   swatch: "#9b8ae0" },
  { id: "rose",     label: "Dusty rose", swatch: "#d47a96" },
  { id: "slate",    label: "Slate blue", swatch: "#6b91c0" },
  { id: "sand",     label: "Warm sand",  swatch: "#d4a870" },
];

function applyPrefs(theme, palette) {
  document.documentElement.dataset.theme   = theme;
  document.documentElement.dataset.palette = palette;
  localStorage.setItem("theme",   theme);
  localStorage.setItem("palette", palette);
}

async function savePrefs(patch) {
  try {
    await fetch("/api/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  } catch {
    // non-fatal — localStorage is already updated
  }
}

export default function ThemeToggle({ userId }) {
  const [theme,   setTheme]   = useState("dark");
  const [palette, setPalette] = useState("duck-egg");
  const [open,    setOpen]    = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (userId) {
      // Logged in: fetch from DB, fall back to localStorage while loading
      const localTheme   = localStorage.getItem("theme")   || "dark";
      const localPalette = localStorage.getItem("palette") || "duck-egg";
      setTheme(localTheme);
      setPalette(localPalette);

      fetch("/api/preferences")
        .then((r) => r.ok ? r.json() : null)
        .then((prefs) => {
          if (!prefs) return;
          setTheme(prefs.theme);
          setPalette(prefs.palette);
          applyPrefs(prefs.theme, prefs.palette);
        })
        .catch(() => {});
    } else {
      // Logged out: localStorage only
      setTheme(localStorage.getItem("theme")   || "dark");
      setPalette(localStorage.getItem("palette") || "duck-egg");
    }
  }, [userId]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyPrefs(next, palette);
    if (userId) savePrefs({ theme: next });
  };

  const choosePalette = (id) => {
    setPalette(id);
    setOpen(false);
    applyPrefs(theme, id);
    if (userId) savePrefs({ palette: id });
  };

  const activePalette = PALETTES.find((p) => p.id === palette) || PALETTES[0];

  return (
    <div className="theme-controls">
      {/* Colour picker dropdown */}
      <div className="palette-picker" ref={wrapperRef}>
        <button
          className={`palette-trigger${open ? " is-open" : ""}`}
          onClick={() => setOpen((v) => !v)}
          aria-label="Choose colour theme"
          aria-expanded={open}
          aria-haspopup="listbox"
        >
          <span
            className="palette-trigger-dot"
            style={{ background: activePalette.swatch }}
          />
          <svg
            className="palette-chevron"
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M2 3.5l3 3 3-3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {open && (
          <div className="palette-panel" role="listbox" aria-label="Colour themes">
            {PALETTES.map(({ id, label, swatch }) => (
              <button
                key={id}
                className={`palette-option${palette === id ? " is-active" : ""}`}
                role="option"
                aria-selected={palette === id}
                onClick={() => choosePalette(id)}
              >
                <span
                  className="palette-option-dot"
                  style={{ background: swatch }}
                />
                <span className="palette-option-label">{label}</span>
                {palette === id && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path
                      d="M2 6l3 3 5-5"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="theme-divider" aria-hidden="true" />

      {/* Dark / light toggle */}
      <button
        className="theme-toggle"
        onClick={toggleTheme}
        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      >
        {theme === "dark" ? (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.75" />
            <path
              d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>
    </div>
  );
}
