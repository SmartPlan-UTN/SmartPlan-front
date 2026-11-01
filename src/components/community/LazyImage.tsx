"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { AuthenticatedImage } from "@/components/media";

import styles from "./lazyImage.module.css";

export interface LazyImageProps {
  url: string | null | undefined;
  alt: string;
  width?: number;
  height?: number;
  /** A Google Maps photo is always credited; `full` also names its authors. */
  attribution?: "compact" | "full";
  attributionPlacement?: "bottom" | "top";
  /** Above the fold: fetch at once instead of when it nears the screen. */
  eager?: boolean;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
  className?: string;
}

/**
 * Fills its (positioned) parent with a photograph that is only requested when
 * it is about to be seen. Every photo here goes through an authenticated
 * download, so a long page must not fetch the ones nobody has scrolled to.
 */
export function LazyImage({
  eager = false,
  className,
  ...image
}: LazyImageProps) {
  const [near, setNear] = useState(eager);
  const ref = useRef<HTMLDivElement>(null);
  const loadingFallback =
    image.loadingFallback === undefined
      ? image.fallback
      : image.loadingFallback;

  useEffect(() => {
    if (near) return;
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      // No way to tell: show it rather than leave a hole.
      const frame = requestAnimationFrame(() => setNear(true));
      return () => cancelAnimationFrame(frame);
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: "320px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [near]);

  return (
    <div
      ref={ref}
      className={className ? `${styles.fill} ${className}` : styles.fill}
    >
      {near ? (
        <AuthenticatedImage
          url={image.url}
          alt={image.alt}
          width={image.width}
          height={image.height}
          attribution={image.attribution}
          attributionPlacement={image.attributionPlacement}
          fallback={image.fallback}
          loadingFallback={loadingFallback}
        />
      ) : (
        (loadingFallback ?? null)
      )}
    </div>
  );
}
