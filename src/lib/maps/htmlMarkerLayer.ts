/**
 * Markers as plain HTML buttons on a Google Map, drawn by one OverlayView.
 *
 * Why not the built-in markers: a classic `Marker` icon is an image (an SVG
 * data URI can't use the page's fonts, can't transition between states, and
 * gets Google's own focus ring; the class is also deprecated), and an
 * `AdvancedMarkerElement` needs a cloud map id, which turns off the JSON map
 * styles the cream basemap depends on. Buttons get the product's type, CSS
 * states, transitions, reduced motion and real keyboard focus for free.
 *
 * Deliberately small: diff by key, position on `draw`, delegate click and
 * hover. Callers decide what each element contains (`render`) and when it
 * must be rebuilt (`signature`).
 */
export interface HtmlMarker {
  key: string;
  lat: number;
  lng: number;
  /** When this changes, `render` runs again on the existing element. */
  signature: string;
  render: (element: HTMLElement) => void;
  /** Non-interactive markers (e.g. "you are here") are not buttons. */
  interactive?: boolean;
  /**
   * Spread out from other such markers when they would cover each other at
   * the current zoom (numbered stops at the same corner): each keeps its own
   * place in a small ring around their shared point.
   */
  declutter?: boolean;
}

/** Closer than this (px), two decluttered markers would cover each other. */
const OVERLAP_PX = 26;

export interface HtmlMarkerLayer {
  setMarkers: (markers: readonly HtmlMarker[]) => void;
  focus: (key: string) => void;
  /**
   * Marks one marker as the one being pointed at elsewhere (a row in a list,
   * a stop in the route) without re-rendering any marker. Survives
   * `setMarkers`; `null` clears it.
   */
  setHighlighted: (key: string | null) => void;
  destroy: () => void;
}

interface Entry {
  element: HTMLElement;
  position: google.maps.LatLng;
  signature: string;
  declutter: boolean;
  /** Position in the last `setMarkers` list: decluttered rings follow it. */
  order: number;
}

/**
 * Offsets for points that would overlap: groups of points closer than
 * `OVERLAP_PX` to the group's first point are laid on a ring around their
 * centre, in their given order, starting at the top. Others stay put.
 */
export function declutterOffsets(
  points: readonly { x: number; y: number }[],
): { dx: number; dy: number }[] {
  const offsets = points.map(() => ({ dx: 0, dy: 0 }));
  const taken = new Set<number>();
  for (let i = 0; i < points.length; i++) {
    if (taken.has(i)) continue;
    const group = [i];
    for (let j = i + 1; j < points.length; j++) {
      if (taken.has(j)) continue;
      const near = group.some(
        (k) =>
          Math.hypot(points[k].x - points[j].x, points[k].y - points[j].y) <
          OVERLAP_PX,
      );
      if (near) group.push(j);
    }
    if (group.length < 2) continue;
    group.forEach((k) => taken.add(k));
    const cx = group.reduce((sum, k) => sum + points[k].x, 0) / group.length;
    const cy = group.reduce((sum, k) => sum + points[k].y, 0) / group.length;
    // Far enough apart for 28px nodes to sit side by side on the ring.
    const radius = Math.max(18, (OVERLAP_PX + 6) / (2 * Math.sin(Math.PI / group.length)));
    group.forEach((k, index) => {
      const angle = -Math.PI / 2 + (2 * Math.PI * index) / group.length;
      offsets[k] = {
        dx: cx + radius * Math.cos(angle) - points[k].x,
        dy: cy + radius * Math.sin(angle) - points[k].y,
      };
    });
  }
  return offsets;
}

export function createHtmlMarkerLayer(
  map: google.maps.Map,
  handlers: {
    /** `viaKeyboard`: Enter/Space on a focused marker, not a pointer. */
    onActivate: (key: string, viaKeyboard: boolean) => void;
    onHover?: (key: string | null) => void;
  },
): HtmlMarkerLayer {
  const entries = new Map<string, Entry>();
  let highlighted: string | null = null;
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "0";
  container.style.top = "0";
  // One compositing layer for every marker: panning moves the layer instead
  // of repainting each marker (measured with 100–300 markers on a phone).
  container.style.willChange = "transform";

  const keyOf = (target: EventTarget | null) =>
    target instanceof Element
      ? (target.closest<HTMLElement>("[data-marker-key]")?.dataset.markerKey ??
        null)
      : null;

  container.addEventListener("click", (event) => {
    const key = keyOf(event.target);
    // A click a key produced has no pointer behind it (`detail` 0).
    if (key) handlers.onActivate(key, event.detail === 0);
  });
  container.addEventListener("pointerover", (event) => {
    handlers.onHover?.(keyOf(event.target));
  });
  container.addEventListener("focusin", (event) => {
    handlers.onHover?.(keyOf(event.target));
  });
  // Leaving the markers altogether (to the map, or away from it) ends it.
  const leave = (event: PointerEvent | FocusEvent) => {
    if (!keyOf(event.relatedTarget)) handlers.onHover?.(null);
  };
  container.addEventListener("pointerout", leave);
  container.addEventListener("focusout", leave);

  class Layer extends google.maps.OverlayView {
    onAdd() {
      this.getPanes()?.overlayMouseTarget.appendChild(container);
      // Clicks on a marker are the marker's, not the map's (which closes
      // the preview); dragging from a marker still pans.
      google.maps.OverlayView.preventMapHitsFrom(container);
    }

    draw() {
      const projection = this.getProjection();
      if (!projection) return;
      const spread: { entry: Entry; x: number; y: number }[] = [];
      for (const entry of entries.values()) {
        const point = projection.fromLatLngToDivPixel(entry.position);
        if (!point) continue;
        if (entry.declutter) {
          spread.push({ entry, x: point.x, y: point.y });
        } else {
          entry.element.style.transform = `translate(${point.x}px, ${point.y}px)`;
        }
      }
      spread.sort((a, b) => a.entry.order - b.entry.order);
      const offsets = declutterOffsets(spread);
      spread.forEach(({ entry, x, y }, index) => {
        const { dx, dy } = offsets[index];
        entry.element.style.transform = `translate(${x + dx}px, ${y + dy}px)`;
      });
    }

    onRemove() {
      container.remove();
    }
  }

  const layer = new Layer();
  layer.setMap(map);

  return {
    setMarkers(markers) {
      const seen = new Set<string>();
      for (const [order, marker] of markers.entries()) {
        seen.add(marker.key);
        let entry = entries.get(marker.key);
        if (!entry) {
          const element = document.createElement(
            marker.interactive === false ? "div" : "button",
          );
          if (element instanceof HTMLButtonElement) element.type = "button";
          element.dataset.markerKey = marker.key;
          element.style.position = "absolute";
          element.style.left = "0";
          element.style.top = "0";
          entry = {
            element,
            position: new google.maps.LatLng(marker.lat, marker.lng),
            signature: "",
            declutter: marker.declutter ?? false,
            order,
          };
          entries.set(marker.key, entry);
          container.appendChild(element);
        } else if (
          entry.position.lat() !== marker.lat ||
          entry.position.lng() !== marker.lng
        ) {
          entry.position = new google.maps.LatLng(marker.lat, marker.lng);
        }
        entry.declutter = marker.declutter ?? false;
        entry.order = order;
        if (entry.signature !== marker.signature) {
          entry.signature = marker.signature;
          marker.render(entry.element);
        }
        entry.element.toggleAttribute(
          "data-highlighted",
          marker.key === highlighted,
        );
      }
      for (const [key, entry] of entries) {
        if (!seen.has(key)) {
          entry.element.remove();
          entries.delete(key);
        }
      }
      layer.draw();
    },

    focus(key) {
      entries.get(key)?.element.focus({ preventScroll: true });
    },

    setHighlighted(key) {
      if (key === highlighted) return;
      if (highlighted) {
        entries.get(highlighted)?.element.removeAttribute("data-highlighted");
      }
      highlighted = key;
      if (key) entries.get(key)?.element.setAttribute("data-highlighted", "");
    },

    destroy() {
      layer.setMap(null);
      entries.clear();
    },
  };
}
