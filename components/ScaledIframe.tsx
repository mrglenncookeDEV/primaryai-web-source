"use client";

import { useEffect, useRef } from "react";

interface Props {
  src: string;
  nativeWidth?: number;
  nativeHeight?: number;
  title: string;
}

export default function ScaledIframe({ src, nativeWidth = 1440, nativeHeight = 900, title }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const iframe = iframeRef.current;
    if (!wrap || !iframe) return;

    function applyScale() {
      const s = wrap!.offsetWidth / nativeWidth;
      iframe!.style.transform = `scale(${s})`;
    }

    const ro = new ResizeObserver(applyScale);
    ro.observe(wrap);
    applyScale();
    return () => ro.disconnect();
  }, [nativeWidth]);

  return (
    <div
      ref={wrapRef}
      style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}
    >
      <iframe
        ref={iframeRef}
        src={src}
        title={title}
        width={nativeWidth}
        height={nativeHeight}
        loading="lazy"
        style={{
          border: "none",
          pointerEvents: "none",
          transformOrigin: "top left",
          display: "block",
          userSelect: "none",
        }}
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
}
