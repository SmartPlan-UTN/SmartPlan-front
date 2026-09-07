"use client";

import { useEffect, useRef, type ElementType, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Milliseconds to hold before this element starts, for staggering. */
  delay?: number;
  as?: ElementType;
}

/**
 * One restrained entrance when an element reaches the viewport.
 *
 * The hidden state is applied by JavaScript, never by CSS. That order is
 * the whole point: if the observer never runs — no JS, an old browser, a
 * crawler, an error earlier on the page — the content was never hidden in
 * the first place, so the failure mode is "the animation didn't play"
 * rather than "the page is blank".
 *
 * Arming is also skipped outright under reduced motion, so nothing is
 * hidden even for the instant before the effect could unhide it.
 */
export function Reveal({ children, className, delay = 0, as }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const Tag = (as ?? "div") as ElementType;

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    if (typeof IntersectionObserver === "undefined") return;

    element.classList.add("sp-reveal-armed");
    if (delay > 0) element.style.setProperty("--reveal-delay", `${delay}ms`);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        element.classList.remove("sp-reveal-armed");
        element.classList.add("sp-reveal-in");
        observer.disconnect();
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.1 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <Tag ref={ref} className={cn(className)}>
      {children}
    </Tag>
  );
}
