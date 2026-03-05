"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const MIN_DISPLAY_MS = 180; // keep transitions snappy without feeling abrupt

function HouseDrawSVG() {
  return (
    <svg
      className="page-loader-house"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeMiterlimit="10"
      shapeRendering="geometricPrecision"
      aria-hidden="true"
    >
      {/* Roof — orange, draws first */}
      <path
        className="pl-stroke pl-s1"
        pathLength="1"
        d="M2.5,7.5 L11.5,3.1 c0.3,-0.15, 0.7,-0.15, 1,0 L21.5,7.5"
      />
      {/* House body */}
      <path
        className="pl-stroke pl-s2"
        pathLength="1"
        d="M19.5,12 v6.5 c0,1.1, -0.9,2, -2,2 h-11 c-1.1,0, -2,-0.9, -2,-2 V12"
      />
      {/* Right arch */}
      <path
        className="pl-stroke pl-s3"
        pathLength="1"
        d="M19.5,12 C17.5,10.2, 14.5,10.2, 12,12"
      />
      {/* Centre divider */}
      <path
        className="pl-stroke pl-s4"
        pathLength="1"
        d="M12,12.2 v8.1"
      />
      {/* Left arch — final stroke */}
      <path
        className="pl-stroke pl-s5"
        pathLength="1"
        d="M12,12 C9.5,10.2, 6.5,10.2, 4.5,12"
      />
    </svg>
  );
}

export default function PageLoader() {
  const pathname = usePathname();
  const [status, setStatus] = useState("idle"); // "idle" | "loading" | "exiting"
  const prevPath = useRef(pathname);
  const showTime = useRef(null);
  const mounted = useRef(false);
  const exitTimer = useRef(null);
  const hideTimer = useRef(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimeout(exitTimer.current);
      clearTimeout(hideTimer.current);
    };
  }, []);

  // Detect route change = new page has loaded
  useEffect(() => {
    if (prevPath.current === pathname) return;
    prevPath.current = pathname;

    if (!mounted.current || status === "idle") return;

    const elapsed = showTime.current ? Date.now() - showTime.current : MIN_DISPLAY_MS;
    const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);

    exitTimer.current = setTimeout(() => {
      if (!mounted.current) return;
      setStatus("exiting");
      hideTimer.current = setTimeout(() => {
        if (mounted.current) setStatus("idle");
      }, 320);
    }, remaining);
  }, [pathname, status]);

  // Intercept internal link clicks to start the loader
  useEffect(() => {
    function handleClick(e) {
      const anchor = e.target.closest("a[href]");
      if (!anchor) return;
      if (anchor.target === "_blank" || anchor.rel?.includes("external")) return;

      const href = anchor.getAttribute("href");
      if (!href || !href.startsWith("/")) return;

      // Resolve against current origin to compare properly
      const dest = new URL(href, window.location.href);
      if (dest.pathname === window.location.pathname) return;

      clearTimeout(exitTimer.current);
      clearTimeout(hideTimer.current);
      showTime.current = Date.now();
      setStatus("loading");
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  if (status === "idle") return null;

  return (
    <div
      className={`page-loader${status === "exiting" ? " is-exiting" : ""}`}
      aria-hidden="true"
    >
      <div className="page-loader-inner">
        <HouseDrawSVG />
        <div className="page-loader-wordmark">
          Primary<span className="page-loader-ai">AI</span>
        </div>
        <div className="page-loader-dots">
          <span className="page-loader-dot" />
          <span className="page-loader-dot" />
          <span className="page-loader-dot" />
        </div>
      </div>
    </div>
  );
}
