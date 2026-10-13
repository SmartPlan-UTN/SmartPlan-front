import { formatArs } from "@/lib/utils";
import { categoryLabel } from "@/lib/utils/catalogLabels";

import styles from "./markers.module.css";

/**
 * The two marker kinds every SmartPlan map draws, as render functions for
 * `lib/maps/htmlMarkerLayer`: a route stop (its number, char on cream) and a
 * catalog result (a paper dot ringed in terracotta). The name shows beside
 * either on hover, focus or selection.
 */
export interface StopMarkerInput {
  number: number;
  name: string;
  selected: boolean;
  /** Just joined the route: the number grows in. */
  arrived?: boolean;
  /** Picked from outside the map: one ring, once. */
  pulse?: boolean;
  /** Context only (a small map beside something else): small, unlabelled. */
  mini?: boolean;
}

export function renderStopMarker(element: HTMLElement, input: StopMarkerInput) {
  element.className = [
    styles.marker,
    styles.stop,
    input.selected ? styles.selected : "",
    input.arrived ? styles.arrived : "",
    input.pulse ? styles.pulse : "",
    input.mini ? styles.mini : "",
  ].join(" ");
  element.setAttribute("aria-label", `Parada ${input.number}: ${input.name}`);
  element.setAttribute("aria-haspopup", "dialog");
  element.setAttribute("aria-expanded", String(input.selected));
  const number = document.createElement("span");
  number.className = styles.number;
  number.textContent = String(input.number);
  const label = document.createElement("span");
  label.className = styles.label;
  label.textContent = input.name;
  element.replaceChildren(number, label);
}

export interface ResultMarkerInput {
  name: string;
  categoryName: string | null;
  estimatedCost: number;
  selected: boolean;
  /** Context only: unlabelled, not interactive. */
  mini?: boolean;
}

export function renderResultMarker(
  element: HTMLElement,
  input: ResultMarkerInput,
) {
  element.className = [
    styles.marker,
    styles.result,
    input.selected ? styles.selected : "",
    input.mini ? styles.mini : "",
  ].join(" ");
  element.setAttribute(
    "aria-label",
    [
      input.name,
      input.categoryName ? categoryLabel(input.categoryName) : null,
      formatArs(input.estimatedCost),
    ]
      .filter(Boolean)
      .join(", "),
  );
  element.setAttribute("aria-haspopup", "dialog");
  element.setAttribute("aria-expanded", String(input.selected));
  const dot = document.createElement("span");
  dot.className = styles.dot;
  const label = document.createElement("span");
  label.className = styles.label;
  label.textContent = input.name;
  element.replaceChildren(dot, label);
}

/** "You are here", when the device's position is in use. */
export function renderMeMarker(element: HTMLElement) {
  element.className = styles.me;
  element.setAttribute("aria-hidden", "true");
}
