"use client";

import { useRouter } from "next/navigation";

export default function MobileBackButton() {
  const router = useRouter();
  return (
    <button
      className="mobile-back-btn"
      onClick={() => router.back()}
      aria-label="Go back"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5M12 5l-7 7 7 7" />
      </svg>
    </button>
  );
}
