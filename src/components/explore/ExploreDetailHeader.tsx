"use client";

import { useRef, type ReactNode } from "react";

import { PlaceMedia, type PlaceMediaProps } from "@/components/media";
import { FloatingBackLink } from "@/components/ui";
import { ROUTES } from "@/lib/routes";

import styles from "./ExploreDetailHeader.module.css";

/** Shared Places presentation for every Explore detail entry point. */
export function ExploreDetailHeader({
  media,
  heroAction,
  children,
}: {
  media: Omit<PlaceMediaProps, "variant">;
  heroAction?: ReactNode;
  children: ReactNode;
}) {
  const heroRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <FloatingBackLink href={ROUTES.explore} label="Volver" heroRef={heroRef} />
      <div className={styles.hero} ref={heroRef}>
        <PlaceMedia {...media} variant="hero" />
        {heroAction}
      </div>
      <div className={styles.summary}>{children}</div>
    </>
  );
}
