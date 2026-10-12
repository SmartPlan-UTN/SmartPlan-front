"use client";

import { useEffect, useState } from "react";

import { apiClient } from "@/lib/api/client";
import { getApiBaseUrl } from "@/lib/api/config";

import styles from "./media.module.css";

interface PhotoAttribution {
  hasPhoto: boolean;
  authors: Array<{ displayName: string; uri: string | null }>;
  provider: "Google Maps";
}

interface GooglePlacePhotoProps {
  /** Google Place ID of the place (an identity link SmartPlan may store). */
  placeId: string;
  alt: string;
  /** Requested width; the server clamps it. */
  maxWidthPx?: number;
}

/**
 * A live Google Maps photo with the attribution its terms require.
 *
 * SmartPlan never copies the image: the browser loads it from Google through a
 * redirect of our API, and the author credit is shown next to it, always, with
 * the provider named. Renders nothing while loading, when the place has no
 * photo, or when the provider is unavailable: a missing optional photo must
 * never look like an error.
 */
export function GooglePlacePhoto({
  placeId,
  alt,
  maxWidthPx = 900,
}: GooglePlacePhotoProps) {
  // Keyed by place so a new place never shows the previous one's photo.
  const [loaded, setLoaded] = useState<{
    placeId: string;
    attribution: PhotoAttribution;
  } | null>(null);
  const [brokenFor, setBrokenFor] = useState<string | null>(null);
  const attribution = loaded?.placeId === placeId ? loaded.attribution : null;
  const broken = brokenFor === placeId;

  useEffect(() => {
    let active = true;
    apiClient
      .get<PhotoAttribution>(
        `/external-integration/places/${encodeURIComponent(placeId)}/photo-attribution`,
      )
      .then((data) => {
        if (active) setLoaded({ placeId, attribution: data });
      })
      .catch(() => {
        // Optional content: stay silent.
      });
    return () => {
      active = false;
    };
  }, [placeId]);

  if (!attribution?.hasPhoto || broken) return null;

  const src = `${getApiBaseUrl()}/external-integration/places/${encodeURIComponent(
    placeId,
  )}/photo?maxWidthPx=${maxWidthPx}`;

  return (
    <figure className={styles.googlePhoto}>
      {/* The image is served by Google behind a redirect; next/image cannot
          optimise (or may not store) it. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setBrokenFor(placeId)}
      />
      <figcaption>
        {attribution.authors.length > 0 ? (
          <>
            Foto:{" "}
            {attribution.authors.map((author, index) => (
              <span key={`${author.displayName}-${index}`}>
                {index > 0 ? ", " : ""}
                {author.uri ? (
                  <a href={author.uri} target="_blank" rel="noopener noreferrer">
                    {author.displayName}
                  </a>
                ) : (
                  author.displayName
                )}
              </span>
            ))}
            {" · "}
          </>
        ) : null}
        <span>Google Maps</span>
      </figcaption>
    </figure>
  );
}
