"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const LAPTOP_FRAMES = [
  { src: "/images/landing/home-laptop-1.png", width: 2838, height: 1484 },
  { src: "/images/landing/home-laptop-2.png", width: 2862, height: 1476 },
  { src: "/images/landing/home-laptop-3.png", width: 2838, height: 1450 },
  { src: "/images/landing/home-laptop-4.png", width: 2794, height: 1448 },
  { src: "/images/landing/home-laptop-5.png", width: 2806, height: 1470 },
];

const MOBILE_FRAMES = [
  { src: "/images/landing/home-mobile-fit-5.png", width: 429, height: 916 },
  { src: "/images/landing/home-mobile-fit-6.png", width: 436, height: 930 },
  { src: "/images/landing/home-mobile-fit-7.png", width: 428, height: 914 },
];

export default function LandingDevices() {
  const [laptopFrameIndex, setLaptopFrameIndex] = useState(0);
  const [mobileFrameIndex, setMobileFrameIndex] = useState(0);
  const activeMobileFrame = MOBILE_FRAMES[mobileFrameIndex] ?? MOBILE_FRAMES[0];

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setLaptopFrameIndex((current) => (current + 1) % LAPTOP_FRAMES.length);
      setMobileFrameIndex((current) => (current + 1) % MOBILE_FRAMES.length);
    }, 6200);
    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <div className="landing-showcase-inner">
      <div className="landing-about-copy">
        <span className="landing-about-kicker">Product preview</span>
        <h2 className="landing-about-heading">One workspace for the week ahead</h2>
        <p className="landing-about-text">
          Lesson packs, library resources, notes and weekly scheduling stay in
          one place, shaped around real primary school practice.
        </p>
      </div>

      <div className="landing-device-showcase" aria-label="PrimaryAI dashboard preview">
        <div className="landing-laptop-wrap">
          <div className="landing-laptop-screen-shell">
            <div className="landing-laptop-screen">
              <div className="landing-frame-stage">
                {LAPTOP_FRAMES.map((frame, index) => (
                  <Image
                    key={frame.src}
                    className={`landing-frame-image landing-frame-layer${index === laptopFrameIndex ? " is-active" : ""}`}
                    src={frame.src}
                    alt="PrimaryAI dashboard screen"
                    width={frame.width}
                    height={frame.height}
                    priority={index === 0}
                    loading="eager"
                    quality={85}
                    sizes="(max-width: 760px) 100vw, (max-width: 1200px) 40vw, 500px"
                  />
                ))}
              </div>
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
            <div className="landing-frame-stage landing-frame-stage-phone">
              <Image
                key={activeMobileFrame.src}
                className="landing-frame-image landing-frame-image-phone landing-frame-layer is-active"
                src={activeMobileFrame.src}
                alt="PrimaryAI dashboard screen on mobile"
                width={activeMobileFrame.width}
                height={activeMobileFrame.height}
                priority
                loading="eager"
                quality={85}
                sizes="(max-width: 760px) 26vw, 120px"
              />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
