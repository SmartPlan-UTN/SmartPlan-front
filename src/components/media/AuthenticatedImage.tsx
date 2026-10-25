"use client";

import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";
import { downloadMedia } from "@/lib/api/media";
import type { ImageAttribution } from "@/types";
import styles from "./media.module.css";

interface AuthenticatedImageProps {
  url: string | null | undefined;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  /**
   * How a Google Places photo is credited (SmartPlan-back#102). Google Maps
   * is always named; `full` also links the photo's authors, which Google
   * requires wherever the image is shown large. Thumbnails stay `compact`:
   * the policies let them omit the authors when a larger view credits them.
   * `external` draws no credit over the photo: only for spots too small to
   * hold it, whose caller must name Google Maps right beside the image.
   */
  attribution?: "compact" | "full" | "external";
  /** Drawn instead of the neutral placeholder when there is no image to show. */
  fallback?: ReactNode;
  /** Optional compact content while downloading, e.g. an avatar's initials. */
  loadingFallback?: ReactNode;
  /** Where the credit sits: `top` clears a hero whose title covers the bottom. */
  attributionPlacement?: "bottom" | "top";
}

interface LoadedImage {
  source: string;
  attribution: ImageAttribution | null;
}

export function AuthenticatedImage(props: AuthenticatedImageProps) {
  // A replacement URL starts fresh, including image/decode failures. The old
  // request and its blob URL are cleaned up before the new photo is displayed.
  return <AuthenticatedImageContent key={props.url ?? ""} {...props} />;
}

function AuthenticatedImageContent({
  url,
  alt,
  className,
  width = 320,
  height = 180,
  attribution = "compact",
  fallback,
  loadingFallback,
  attributionPlacement = "bottom",
}: AuthenticatedImageProps) {
  const [image, setImage] = useState<LoadedImage | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!url) return;
    let active = true;
    let objectUrl: string | null = null;
    downloadMedia(url)
      .then((download) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(download.blob);
        setImage({ source: objectUrl, attribution: download.attribution });
        setError(false);
      })
      .catch(() => {
        // A missing provider photo (404), an exhausted quota or any other
        // failure all fall back to the same placeholder as no image at all.
        if (active) setError(true);
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  if (!url || error) {
    return (
      fallback ?? (
        <span
          className={styles.placeholder}
          role="img"
          aria-label={`Sin imagen de ${alt}`}
        />
      )
    );
  }
  if (!image)
    return (
      loadingFallback ?? (
        <span
          className={styles.skeleton}
          role="status"
          aria-label={`Cargando imagen de ${alt}`}
        />
      )
    );

  const picture = (
    <Image
      unoptimized
      src={image.source}
      alt={alt}
      width={width}
      height={height}
      className={className ?? styles.image}
      onError={() => setError(true)}
    />
  );
  if (!image.attribution || attribution === "external") return picture;

  const authors = attribution === "full" ? image.attribution.authors : [];
  return (
    <span className={styles.attributed}>
      {picture}
      <span
        className={
          attributionPlacement === "top"
            ? `${styles.attribution} ${styles.attributionTop}`
            : styles.attribution
        }
      >
        {/* Google's text attribution: never translated, wrapped or restyled. */}
        <span className={styles.attributionProvider} translate="no">
          Google Maps
        </span>
        {authors.length > 0 ? (
          <span className={styles.attributionAuthors}>
            {"Foto: "}
            {authors.map((author, index) => (
              <span key={`${author.displayName}-${index}`}>
                {index > 0 ? ", " : null}
                {author.uri ? (
                  <a
                    href={author.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {author.displayName}
                  </a>
                ) : (
                  author.displayName
                )}
              </span>
            ))}
          </span>
        ) : null}
      </span>
    </span>
  );
}
