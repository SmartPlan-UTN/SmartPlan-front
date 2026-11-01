import { createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";

import { categoryPresentation } from "@/components/preferences/categoryPresentation";
import { iconRegistry, type IconName } from "@/components/ui/iconRegistry";
import {
  activitySubtypePresentation,
  placeKindPresentation,
  type ArtworkFamily,
} from "@/lib/catalog/taxonomy";
import type { ExploreMapMarker } from "@/types";

/** One solid tone per artwork family, readable under a white glyph. */
const FAMILY_COLORS: Record<ArtworkFamily, string> = {
  wine: "#8e2f45",
  food: "#c4622d",
  night: "#3d2f6b",
  culture: "#4a5a70",
  outdoors: "#4f7a3f",
  adventure: "#7a5230",
  wellness: "#3f8077",
  shopping: "#a0663a",
  sports: "#3b6a94",
  other: "#7a6152",
};

export interface MarkerPresentation {
  icon: IconName;
  color: string;
}

/**
 * What a map point shows: the activity's subtype when SmartPlan knows it,
 * else its place's kind, else its first category. Places use their kind.
 */
export function markerPresentation(marker: ExploreMapMarker): MarkerPresentation {
  const candidates =
    marker.itemType === "ACTIVITY"
      ? [
          activitySubtypePresentation(marker.type),
          placeKindPresentation(marker.place?.kind),
        ]
      : [placeKindPresentation(marker.kind)];
  const known = candidates.find((candidate) => candidate.icon !== "map-pin");
  if (known) return { icon: known.icon, color: FAMILY_COLORS[known.family] };

  const category = marker.categories?.[0];
  const categoryIcon = category
    ? categoryPresentation({ id: category.id, name: category.name, description: null }).iconName
    : null;
  return {
    icon: categoryIcon && categoryIcon !== "tag" ? categoryIcon : "map-pin",
    color: FAMILY_COLORS.other,
  };
}

const glyphCache = new Map<IconName, string>();

/** The Lucide glyph as SVG markup, rendered once per icon. */
function glyphMarkup(icon: IconName): string {
  const cached = glyphCache.get(icon);
  if (cached !== undefined) return cached;
  const host = document.createElement("div");
  const root = createRoot(host);
  flushSync(() => {
    root.render(
      createElement(iconRegistry[icon], {
        size: 18,
        color: "#ffffff",
        strokeWidth: 2.25,
        x: 9,
        y: 9,
      }),
    );
  });
  const markup = host.innerHTML;
  root.unmount();
  glyphCache.set(icon, markup);
  return markup;
}

/**
 * A round badge with the glyph inside, as an image URL for
 * `google.maps.Marker`. Places without an activity are drawn lighter.
 */
export function markerIconUrl(
  presentation: MarkerPresentation,
  { muted = false }: { muted?: boolean } = {},
): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">` +
    `<circle cx="18" cy="18" r="16" fill="${presentation.color}" fill-opacity="${muted ? 0.72 : 1}" stroke="#ffffff" stroke-width="2.5"/>` +
    glyphMarkup(presentation.icon) +
    `</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
