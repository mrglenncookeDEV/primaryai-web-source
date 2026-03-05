"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  srcs: string[];
  nativeWidth?: number;
  nativeHeight?: number;
  /** ms each screen is shown before fading to the next */
  interval?: number;
  /** alternates iframe theme light/dark by slide index */
  alternateTheme?: boolean;
  title: string;
}

export default function CyclingIframe({
  srcs,
  nativeWidth = 1440,
  nativeHeight = 900,
  interval = 9000,
  alternateTheme = false,
  title,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const iframeRefs = useRef<Array<HTMLIFrameElement | null>>([]);
  const [scale, setScale] = useState(1);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(() => {
      setScale(wrap.offsetWidth / nativeWidth);
    });
    ro.observe(wrap);
    setScale(wrap.offsetWidth / nativeWidth);
    return () => ro.disconnect();
  }, [nativeWidth]);

  useEffect(() => {
    if (srcs.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((i) => (i + 1) % srcs.length);
    }, interval);
    return () => clearInterval(timer);
  }, [srcs.length, interval]);

  return (
    <div
      ref={wrapRef}
      style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}
    >
      {srcs.map((src, i) => (
        <iframe
          key={src}
          ref={(node) => {
            iframeRefs.current[i] = node;
          }}
          src={src}
          title={`${title} — screen ${i + 1}`}
          width={nativeWidth}
          height={nativeHeight}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            border: "none",
            pointerEvents: "none",
            transformOrigin: "top left",
            transform: `scale(${scale})`,
            userSelect: "none",
            opacity: i === current ? 1 : 0,
            transition: "opacity 1s ease",
          }}
          tabIndex={-1}
          aria-hidden={i !== current}
          loading="lazy"
          onLoad={() => {
            if (!alternateTheme) return;
            const node = iframeRefs.current[i];
            const doc = node?.contentDocument;
            if (!doc?.documentElement) return;
            const theme = i % 2 === 0 ? "light" : "dark";
            doc.documentElement.dataset.theme = theme;
            doc.documentElement.dataset.palette = "slate";
          }}
        />
      ))}

      {/* pill-style progress dots */}
      {srcs.length > 1 && (
        <div
          style={{
            position: "absolute",
            bottom: 10,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: 5,
            zIndex: 10,
            pointerEvents: "none",
          }}
          aria-hidden="true"
        >
          {srcs.map((_, i) => (
            <div
              key={i}
              style={{
                height: 5,
                width: i === current ? 20 : 5,
                borderRadius: 3,
                background:
                  i === current
                    ? "rgba(255,255,255,0.9)"
                    : "rgba(255,255,255,0.3)",
                transition: "width 0.4s ease, background 0.4s ease",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
