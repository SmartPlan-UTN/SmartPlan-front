"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/** Protect navigation links and browser reload/close while this form has edits. */
export function usePreferencesNavigation(dirty: boolean, busy: boolean) {
  const router = useRouter();
  const [pending, setPending] = useState<(() => void) | null>(null);
  const allowed = useRef(false);
  const latest = useRef({ dirty, busy });
  useEffect(() => { latest.current = { dirty, busy }; }, [dirty, busy]);

  const request = useCallback((navigate: () => void) => {
    if (allowed.current || !latest.current.dirty) {
      navigate();
      return;
    }
    if (!latest.current.busy) setPending(() => navigate);
  }, []);

  useEffect(() => {
    if (!dirty) return;
    function beforeUnload(event: BeforeUnloadEvent) {
      if (allowed.current) return;
      event.preventDefault();
      event.returnValue = "";
    }
    function click(event: MouseEvent) {
      if (allowed.current || event.defaultPrevented || event.button !== 0 ||
          event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute("download") ||
          (anchor.target && anchor.target !== "_self") || anchor.getAttribute("aria-disabled") === "true") return;
      const destination = new URL(anchor.href, window.location.href);
      if (!["http:", "https:"].includes(destination.protocol)) return;
      if (destination.origin === window.location.origin && destination.pathname === window.location.pathname &&
          destination.search === window.location.search) return;
      event.preventDefault();
      event.stopPropagation();
      request(() => {
        if (destination.origin === window.location.origin) {
          router.push(destination.pathname + destination.search + destination.hash);
        } else window.location.assign(destination.href);
      });
    }
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", click, true);
    };
  }, [dirty, request, router]);

  function proceed() {
    if (!pending) return;
    allowed.current = true;
    setPending(null);
    pending();
  }

  return { pending: pending !== null, cancel: () => setPending(null), proceed, request };
}
