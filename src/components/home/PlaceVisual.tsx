"use client";

import { Icon, type IconName } from "@/components/ui";
import { PlaceMedia } from "@/components/media/PlaceMedia";
import type { PlaceSummary } from "@/types";

import styles from "./place-visual.module.css";

type Tone = "night" | "table" | "day";

const KIND_TONE: Record<string, Tone> = {
  bar: "night",
  brewery: "night",
  nightclub: "night",
  restaurant: "table",
  winery: "table",
};

const KIND_ICON: Record<string, IconName> = {
  bar: "martini",
  brewery: "beer",
  nightclub: "music-2",
  restaurant: "utensils",
  winery: "wine",
  cafe: "coffee",
  bakery: "coffee",
  ice_cream: "ice-cream-cone",
  park: "trees",
  plaza: "trees",
  museum: "landmark",
  heritage: "landmark",
  viewpoint: "mountain",
};

export interface PlaceVisualProps {
  name: string;
  kind: string | null;
  kindLabel: string | null;
  googlePlaceId: string | null;
  /** `hero` fills a large frame; `thumb` is the small alternative image. */
  size?: "hero" | "thumb";
}

/** The big first letter(s) of the venue, as an editorial mark. */
function glyphOf(name: string): string {
  const words = name
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 1 || /\d/.test(word));
  const first = words[0] ?? name;
  return first.charAt(0).toUpperCase();
}

/**
 * Designed artwork for a place with no photo we may show: a warm "poster"
 * with the venue's own initial and contour lines, tinted by what kind of
 * place it is. It is intentional, never a pastel placeholder, and it is
 * decorative: the real name and kind always sit next to it as text.
 */
export function PlacePoster({
  name,
  kind,
  kindLabel,
}: Pick<PlaceVisualProps, "name" | "kind" | "kindLabel">) {
  const tone = (kind && KIND_TONE[kind]) || "day";
  const icon = (kind && KIND_ICON[kind]) || "map-pin";
  return (
    <div className={styles.poster} data-tone={tone} aria-hidden="true">
      <span className={styles.contours} />
      <span className={styles.glyph}>{glyphOf(name)}</span>
      {kindLabel ? (
        <span className={styles.kind}>
          <Icon name={icon} size={14} aria-hidden="true" />
          {kindLabel}
        </span>
      ) : null}
    </div>
  );
}

/**
 * The picture of a recommended place: a real photo when the compliant photo
 * strategy allows one (with its credit), otherwise the designed poster.
 */
export function PlaceVisual({
  name,
  kind,
  kindLabel,
  googlePlaceId,
  size = "hero",
}: PlaceVisualProps) {
  const place = googlePlaceId
    ? ({
        id: 0,
        name,
        kind,
        kindLabel,
        address: "",
        department: null,
        googlePlaceId,
        latitude: null,
        longitude: null,
        coordinatesOwned: false,
        externalRating: null,
        externalPrice: null,
        image: null,
      } satisfies PlaceSummary)
    : null;
  return (
    <div className={styles.frame} data-size={size}>
      <PlaceMedia
        place={place}
        alt={`Foto de ${name}`}
        variant={size === "hero" ? "hero" : "card"}
        artwork={{ family: "other", icon: "map-pin" }}
        fallback={<PlacePoster name={name} kind={kind} kindLabel={kindLabel} />}
      />
    </div>
  );
}
