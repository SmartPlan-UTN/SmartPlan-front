"use client";

import { useEffect, useState, type RefObject } from "react";
import Link from "next/link";

import { Icon } from "./Icon";

import styles from "./FloatingBackLink.module.css";

export interface FloatingBackLinkProps {
  href: string;
  label: string;
  /**
   * The dark hero section this pill starts over — watched to know when to
   * switch to the light style. Omit on a page with no dark hero (e.g. the
   * map view): the pill then stays in its light style throughout.
   */
  heroRef?: RefObject<HTMLElement | null>;
}

/**
 * A "Volver" pill that follows the scroll for the whole page (CU13/CU14
 * detail views, the CU16 map view), instead of disappearing once scrolled
 * past. Switches from a translucent dark pill to a light card-styled one
 * once `heroRef`'s element scrolls behind the sticky navbar, so it stays
 * readable over the cream content below.
 */
export function FloatingBackLink({ href, label, heroRef }: FloatingBackLinkProps) {
  const [onDark, setOnDark] = useState(heroRef != null);

  useEffect(() => {
    const node = heroRef?.current;
    if (!node) return;

    // Negative top margin roughly matches where this pill sits (just under
    // the sticky navbar): the hero counts as "gone" once it scrolls behind
    // that point, not only once it's fully off-screen.
    const observer = new IntersectionObserver(
      ([entry]) => {
        setOnDark(entry.isIntersecting);
      },
      { rootMargin: "-96px 0px 0px 0px" },
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, [heroRef]);

  return (
    <Link
      href={href}
      className={`${styles.link} ${onDark ? styles.onDark : styles.onLight}`}
    >
      <Icon name="arrow-left" size={14} aria-hidden="true" />
      {label}
    </Link>
  );
}
