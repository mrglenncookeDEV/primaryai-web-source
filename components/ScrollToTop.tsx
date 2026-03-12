"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    // Scroll the app-content pane (the inner scroll container)
    const el = document.querySelector<HTMLElement>(".app-content");
    if (el) {
      el.scrollTop = 0;
    }
    // Also reset window scroll as a fallback
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
