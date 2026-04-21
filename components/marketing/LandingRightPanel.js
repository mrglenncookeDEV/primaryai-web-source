"use client";

import Link from "next/link";
import LandingDevices from "./LandingDevices";

export default function LandingRightPanel() {
  return (
    <div className="landing-panel-outer">
      <aside className="landing-split-right">
        <LandingDevices />
        <div className="landing-panel-cta">
          <div className="landing-waitlist-actions">
            <Link className="landing-waitlist-btn" href="/survey">Join the waitlist</Link>
            <Link className="landing-waitlist-btn landing-waitlist-btn--secondary" href="/stories">Contribute to development</Link>
          </div>
          <h2 className="landing-waitlist-heading">Be among the first to try PrimaryAI</h2>
          <p className="landing-waitlist-text">Join the waitlist for early access and help shape the product.</p>
          <p className="landing-footer-note landing-footer-note--plain">
            Launching Spring 2026 | Design &amp; Build by{" "}
            <a className="landing-onepoint-link" href="https://www.onepointconsult.com">
              onepointconsult.com
            </a>
          </p>
        </div>
      </aside>
    </div>
  );
}
