"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CyclingIframe from "@/components/CyclingIframe";
import ScaledIframe from "@/components/ScaledIframe";

export default function LandingHero() {
  const [iconKey, setIconKey] = useState(0);
  const [sparkleLive, setSparkleLive] = useState(false);
  const [showPreviews, setShowPreviews] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowPreviews(true), 180);
    return () => window.clearTimeout(timer);
  }, []);

  function replayIcon() {
    setSparkleLive(false);
    setIconKey((value) => value + 1);
  }

  function onFinalStrokeAnimationEnd(event) {
    if (event.animationName !== "landingHandDraw") {
      return;
    }
    setSparkleLive(true);
  }

  return (
    <section className="landing-hero">
      <div className="landing-title-row">
        <button type="button" className="landing-education-icon" onClick={replayIcon}>
          <svg
            key={iconKey}
            className="landing-replay"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#f3fffb"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeMiterlimit="10"
            shapeRendering="geometricPrecision"
            aria-label="Animated education icon"
          >
            <path
              className="landing-draw-line landing-s-1 landing-roof-stroke"
              pathLength="1"
              d="M2.5,7.5 L11.5,3.1 c0.3,-0.15, 0.7,-0.15, 1,0 L21.5,7.5"
            />
            <path
              className="landing-draw-line landing-s-2"
              pathLength="1"
              d="M19.5,12 v6.5 c0,1.1, -0.9,2, -2,2 h-11 c-1.1,0, -2,-0.9, -2,-2 V12"
            />
            <path
              className="landing-draw-line landing-s-3"
              pathLength="1"
              d="M19.5,12 C17.5,10.2, 14.5,10.2, 12,12"
            />
            <path className="landing-draw-line landing-s-4" pathLength="1" d="M12,12.2 v8.1" />
            <path
              className="landing-draw-line landing-s-5"
              pathLength="1"
              d="M12,12 C9.5,10.2, 6.5,10.2, 4.5,12"
              onAnimationEnd={onFinalStrokeAnimationEnd}
            />
          </svg>
        </button>

        <h1 className="landing-title">
          <span className={sparkleLive ? "landing-ai-sparkle sparkle-live" : "landing-ai-sparkle"}>
            <span className="landing-primary-word">
              Pr<span className="landing-accent-orange">i</span>m
              <span className="landing-accent-orange">a</span>ry
            </span>
            <span className="landing-accent-orange">A</span>
            <span className="landing-accent-orange">I</span>
          </span>
        </h1>
      </div>

      <p className="landing-subtitle">
        Our intelligent SaaS platform is currently under construction.
      </p>

      <div className="landing-device-showcase" aria-label="PrimaryAI dashboard preview">
        <div className="landing-laptop-wrap">
          <div className="landing-laptop-screen-shell">
            <div className="landing-laptop-screen">
              {showPreviews ? (
                <CyclingIframe
                  title="PrimaryAI desktop preview"
                  srcs={[
                    "/preview/dashboard",
                    "/preview/library",
                    "/preview/lesson-result",
                    "/preview/dashboard",
                  ]}
                  nativeWidth={1440}
                  nativeHeight={900}
                  interval={8500}
                  alternateTheme
                />
              ) : null}
            </div>
          </div>
          <div className="landing-laptop-base">
            <div className="landing-laptop-notch" />
          </div>
        </div>

        <div className="landing-phone-back-glow" aria-hidden="true" />
        <div className="landing-phone-wrap">
          <div className="landing-phone-notch" />
          <div className="landing-phone-screen">
            {showPreviews ? (
              <ScaledIframe
                title="PrimaryAI mobile preview"
                src="/preview/library-mobile"
                nativeWidth={430}
                nativeHeight={932}
              />
            ) : null}
          </div>
        </div>
      </div>

      <div className="landing-cta-row">
        <Link className="landing-thoughts-btn" href="/survey">
          Your Thoughts
        </Link>
      </div>

      <p className="landing-footer-note">
        Launching Spring 2026 | Design & Build by{" "}
        <a className="landing-onepoint-link" href="https://www.onepointconsult.com">
          onepointconsult.com
        </a>
      </p>
    </section>
  );
}
