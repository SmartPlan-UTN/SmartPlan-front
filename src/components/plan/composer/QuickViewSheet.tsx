"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  motion,
  useDragControls,
  useReducedMotion,
  type PanInfo,
} from "motion/react";

import styles from "./QuickViewSheet.module.css";

interface QuickViewSheetProps {
  titleId: string;
  onClose: () => void;
  children: ReactNode;
}

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/**
 * The phone's Quick View: a sheet rising from the bottom edge over a light
 * scrim, so the search and the list stay visible above it. Dragging its
 * handle down, tapping the scrim or Esc closes it; its content scrolls on
 * its own when taller than the screen allows, and focus stays inside.
 */
export function QuickViewSheet({ titleId, onClose, children }: QuickViewSheetProps) {
  const sheetRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const dragControls = useDragControls();

  // While it is open the page under it does not scroll.
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    const sheet = sheetRef.current;
    sheet?.focus({ preventScroll: true });
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !sheet) return;
      const controls = sheet.querySelectorAll<HTMLElement>(
        "button:not(:disabled), a[href]",
      );
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (!first || !last) {
        event.preventDefault();
        return;
      }
      const active = document.activeElement;
      const inside = active instanceof Node && sheet.contains(active);
      // From the sheet itself (where focus starts) or from outside, Tab goes
      // to the first control and Shift+Tab to the last; never out.
      if (event.shiftKey && (active === first || active === sheet || !inside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !inside)) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function onDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.y > 90 || info.velocity.y > 600) onClose();
  }

  return createPortal(
    <div className={styles.layer}>
      <motion.div
        className={styles.scrim}
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.16 }}
        onClick={onClose}
        aria-hidden="true"
      />
      <motion.section
        ref={sheetRef}
        id="quick-view-sheet"
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        initial={reduceMotion ? false : { y: "100%" }}
        animate={{ y: 0 }}
        exit={reduceMotion ? { opacity: 0 } : { y: "100%" }}
        transition={{ duration: 0.26, ease: EASE_OUT }}
        // Only the handle drags: the content keeps its own scroll.
        drag={reduceMotion ? false : "y"}
        dragListener={false}
        dragControls={dragControls}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.6 }}
        onDragEnd={onDragEnd}
      >
        <div
          className={styles.handle}
          aria-hidden="true"
          onPointerDown={(event) => {
            if (!reduceMotion) dragControls.start(event);
          }}
        >
          <span />
        </div>
        {children}
      </motion.section>
    </div>,
    document.body,
  );
}
