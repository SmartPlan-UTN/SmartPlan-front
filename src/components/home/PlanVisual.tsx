"use client";

import { useState } from "react";
import { anchorOf, itineraryOf } from "@/lib/plans/story";
import { isHomeStop, stopPlace } from "@/lib/plans/stops";
import type { PlanDetailResult } from "@/types";
import { PlaceVisual, type PlaceVisualProps } from "./PlaceVisual";
import styles from "./place-visual.module.css";

/** Try the cover, then each stop in order. Never fetch other venues until needed. */
export function PlanVisual({ plan, size = "hero" }: {
  plan: PlanDetailResult;
  size?: "hero" | "thumb";
}) {
  const planAnchor = anchorOf(plan);
  const atHome = Boolean(planAnchor && isHomeStop(planAnchor.item));
  const anchor = planAnchor?.place;
  const places = itineraryOf(plan).filter((item) => !isHomeStop(item)).map(stopPlace).filter((place) => place !== null);
  const ownImage = plan.images?.find((image) => image.isPrimary)?.url
    ?? plan.images?.[0]?.url
    ?? (plan.imageSource !== "google_maps" && !plan.imageUrl?.includes("/photo") ? plan.imageUrl : null);
  const candidates: PlaceVisualProps[] = [];
  if (ownImage) candidates.push({
    name: plan.title, kind: atHome ? "home" : anchor?.kind ?? null, kindLabel: anchor?.kindLabel ?? null,
    googlePlaceId: null, ownImageUrl: ownImage,
  });
  const seen = new Set<string>();
  for (const place of places) {
    if (!place.googlePlaceId || seen.has(place.googlePlaceId)) continue;
    seen.add(place.googlePlaceId);
    candidates.push({ name: place.name, kind: place.kind, kindLabel: place.kindLabel, googlePlaceId: place.googlePlaceId });
  }
  const [index, setIndex] = useState(0);
  const current = candidates[index];
  const fallback: PlaceVisualProps = {
    name: anchor?.name ?? plan.title, kind: atHome ? "home" : anchor?.kind ?? null,
    kindLabel: anchor?.kindLabel ?? null, googlePlaceId: null,
  };
  return <div className={styles.planVisual}>
    <PlaceVisual key={`${plan.id}:${index}`} {...(current ?? fallback)} size={size}
      onUnavailable={current ? () => setIndex((value) => value + 1) : undefined} />
    {current?.googlePlaceId && current.name !== anchor?.name ? <span className={styles.sourceLabel}>Foto de {current.name}</span> : null}
  </div>;
}
