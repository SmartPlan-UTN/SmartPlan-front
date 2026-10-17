import { useEffect } from "react";

/**
 * Stops the page behind a modal from scrolling while the calling component
 * is mounted: without it, the wheel over a dialog's backdrop moves the page
 * instead of the dialog. Locks are nestable (a confirmation over a dialog):
 * each one restores what it found.
 */
export function useScrollLock(): void {
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, []);
}
