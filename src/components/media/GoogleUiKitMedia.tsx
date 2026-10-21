"use client";

import { useEffect, useRef, useState } from "react";

import { loadGoogleMaps } from "@/lib/maps/loadGoogleMaps";
import { requestUiKitAllowance } from "@/lib/maps/uiKitAllowance";

import styles from "./media.module.css";

interface GoogleUiKitMediaProps {
  googlePlaceId: string;
  /** Usage-log label for the allowance ("explore", "map", "quick-view"). */
  screen?: string;
  /** Called once Google rendered (or could not render) the element. */
  onSettled?: (shown: boolean) => void;
}

type MapsWithImport = typeof google.maps & {
  importLibrary(name: string): Promise<unknown>;
};

/**
 * A Google Places UI Kit "place details compact" element reduced to the
 * place's photo, with Google's required name, Maps link and attribution
 * (which are never hidden), themed with SmartPlan's typography and colours.
 *
 * It is only instantiated when the card scrolls near the viewport AND the
 * backend granted an allowance under the USD 0 monthly cap; otherwise
 * nothing renders and the caller keeps its own artwork.
 */
export function GoogleUiKitMedia({
  googlePlaceId,
  screen = "explore",
  onSettled,
}: GoogleUiKitMediaProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const settledRef = useRef(onSettled);
  useEffect(() => {
    settledRef.current = onSettled;
  }, [onSettled]);

  useEffect(() => {
    const node = hostRef.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!near && typeof IntersectionObserver !== "undefined") return;
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;

    void (async () => {
      const allowed = await requestUiKitAllowance(screen);
      if (cancelled) return;
      if (!allowed) {
        settledRef.current?.(false);
        return;
      }
      try {
        await loadGoogleMaps();
        await (google.maps as MapsWithImport).importLibrary("places");
      } catch {
        if (!cancelled) settledRef.current?.(false);
        return;
      }
      if (cancelled) return;

      const element = document.createElement("gmp-place-details-compact");
      element.setAttribute("orientation", "vertical");
      element.className = styles.uiKitElement;
      const request = document.createElement("gmp-place-details-place-request");
      request.setAttribute("place", googlePlaceId);
      const config = document.createElement("gmp-place-content-config");
      config.appendChild(document.createElement("gmp-place-media"));
      const attribution = document.createElement("gmp-place-attribution");
      attribution.setAttribute("light-scheme-color", "gray");
      attribution.setAttribute("dark-scheme-color", "white");
      config.appendChild(attribution);
      element.appendChild(request);
      element.appendChild(config);
      element.addEventListener("gmp-load", () => settledRef.current?.(true), {
        once: true,
      });
      element.addEventListener(
        "gmp-requesterror",
        () => settledRef.current?.(false),
        { once: true },
      );
      host.appendChild(element);
    })().catch(() => {
      if (!cancelled) settledRef.current?.(false);
    });

    return () => {
      cancelled = true;
      host.replaceChildren();
    };
  }, [near, googlePlaceId, screen]);

  return <div ref={hostRef} className={styles.uiKitHost} />;
}
