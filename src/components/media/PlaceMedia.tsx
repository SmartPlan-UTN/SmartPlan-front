"use client";

import { useEffect, useRef, useState } from "react";

import { Icon, type IconName } from "@/components/ui";
import { getPlacePhotoMedia } from "@/lib/api";
import { ARTWORK_GRADIENTS, type ArtworkFamily } from "@/lib/catalog/taxonomy";
import type { PlaceImage, PlacePhotoMedia, PlaceSummary } from "@/types";

import { AuthenticatedImage } from "./AuthenticatedImage";
import { GoogleUiKitMedia } from "./GoogleUiKitMedia";
import styles from "./media.module.css";

export interface PlaceMediaProps {
  /** SmartPlan-owned photo of the activity (served by our API). */
  ownImageUrl?: string | null;
  place?: PlaceSummary | null;
  alt: string;
  /** Artwork shown when there is no real photo (or while one loads). */
  artwork: { family: ArtworkFamily; icon: IconName; label?: string | null };
  /** `card`: Explore/map cards. `hero`: a detail page header. */
  variant?: "card" | "hero";
  /** Usage-log label for Google UI Kit allowances. */
  screen?: string;
}

function isHttpUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function Artwork({
  family,
  icon,
  label,
  variant,
}: PlaceMediaProps["artwork"] & { variant: "card" | "hero" }) {
  return (
    <div
      className={variant === "hero" ? styles.artworkHero : styles.artwork}
      style={{ background: ARTWORK_GRADIENTS[family] }}
      aria-hidden="true"
    >
      <Icon name={icon} size={variant === "hero" ? 72 : 40} className={styles.artworkIcon} />
      {label ? <span className={styles.artworkLabel}>{label}</span> : null}
    </div>
  );
}

/** Open-licensed photo with the credit its licence requires. */
function OpenImage({
  image,
  alt,
  variant,
  onUnavailable,
}: {
  image: PlaceImage;
  alt: string;
  variant: "card" | "hero";
  onUnavailable: () => void;
}) {
  const [broken, setBroken] = useState(false);
  if (broken) return null;
  const credit = [image.author, image.license].filter(Boolean).join(" · ");
  return (
    <figure className={variant === "hero" ? styles.openImageHero : styles.openImage}>
      {/* Wikimedia Commons serves the file; next/image is not configured for it. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.url}
        alt={alt}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => { setBroken(true); onUnavailable(); }}
      />
      <figcaption className={styles.openImageCredit}>
        {isHttpUrl(image.sourceUrl) ? (
          <a href={image.sourceUrl} target="_blank" rel="noopener noreferrer">
            Foto: {credit || "Wikimedia Commons"}
          </a>
        ) : (
          <>Foto: {credit || "Wikimedia Commons"}</>
        )}
      </figcaption>
    </figure>
  );
}

/** A live Google photo for a detail header, with its required credit. */
function GoogleHeroPhoto({
  googlePlaceId,
  alt,
  onUnavailable,
  onLoaded,
}: {
  googlePlaceId: string;
  alt: string;
  onUnavailable: () => void;
  onLoaded: () => void;
}) {
  const [media, setMedia] = useState<{
    placeId: string;
    value: PlacePhotoMedia;
  } | null>(null);
  // Kept in a ref: each fetch is a (capped) billed photo, so it must run
  // once per place, never again because the parent re-rendered.
  const unavailableRef = useRef(onUnavailable);
  useEffect(() => {
    unavailableRef.current = onUnavailable;
  }, [onUnavailable]);

  useEffect(() => {
    let active = true;
    getPlacePhotoMedia(googlePlaceId, 1200)
      .then((value) => {
        if (active) setMedia({ placeId: googlePlaceId, value });
      })
      .catch(() => {
        // No photo, the free allowance is used up, or the provider is off:
        // the header keeps SmartPlan's artwork.
        if (active) unavailableRef.current();
      });
    return () => {
      active = false;
    };
  }, [googlePlaceId]);

  if (!media || media.placeId !== googlePlaceId) return null;
  const { photoUri, authors } = media.value;
  return (
    <figure className={styles.openImageHero}>
      {/* Short-lived Google URI: loaded directly, never stored. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photoUri}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={onUnavailable}
        onLoad={onLoaded}
      />
      <figcaption className={styles.openImageCredit}>
        {authors.length > 0 ? (
          <>
            Foto:{" "}
            {authors.map((author, index) => (
              <span key={`${author.displayName}-${index}`}>
                {index > 0 ? ", " : ""}
                {isHttpUrl(author.uri) ? (
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
        Google Maps
      </figcaption>
    </figure>
  );
}

/**
 * The photo of an Explore card or detail header, from the cheapest real
 * source available (USD 0 policy, in this order):
 * 1. SmartPlan-owned photo, 2. open-licensed place photo (credited),
 * 3. Google: Places UI Kit on cards (free allowance), one capped live photo
 *    on detail headers, 4. SmartPlan's designed artwork.
 */
export function PlaceMedia({
  ownImageUrl,
  place,
  alt,
  artwork,
  variant = "card",
  screen = "explore",
}: PlaceMediaProps) {
  const [googleFailedFor, setGoogleFailedFor] = useState<string | null>(null);
  const [uiKitShownFor, setUiKitShownFor] = useState<string | null>(null);
  const [heroShownFor, setHeroShownFor] = useState<string | null>(null);
  const [brokenImageUrl, setBrokenImageUrl] = useState<string | null>(null);
  const googlePlaceId = place?.googlePlaceId ?? null;

  if (ownImageUrl) {
    return (
      <div className={variant === "hero" ? styles.ownImageHero : styles.ownImage}>
        <AuthenticatedImage url={ownImageUrl} alt={alt} width={640} height={360} />
      </div>
    );
  }

  if (place?.image && place.image.url !== brokenImageUrl) {
    const image = place.image;
    return <OpenImage key={image.url} image={image} alt={alt} variant={variant} onUnavailable={() => setBrokenImageUrl(image.url)} />;
  }

  const googleAvailable =
    googlePlaceId !== null && googleFailedFor !== googlePlaceId;

  if (variant === "hero") {
    return (
      <div className={styles.heroMedia}>
        {heroShownFor !== googlePlaceId || !googleAvailable ? <Artwork {...artwork} variant="hero" /> : null}
        {googleAvailable ? (
          <GoogleHeroPhoto
            googlePlaceId={googlePlaceId}
            alt={alt}
            onUnavailable={() => setGoogleFailedFor(googlePlaceId)}
            onLoaded={() => setHeroShownFor(googlePlaceId)}
          />
        ) : null}
      </div>
    );
  }

  const uiKitShown = googlePlaceId !== null && uiKitShownFor === googlePlaceId;
  return (
    <div className={styles.cardMedia} data-google-slot={googlePlaceId !== null || undefined} data-media={uiKitShown ? "google" : "artwork"}>
      {!uiKitShown ? <Artwork {...artwork} variant="card" /> : null}
      {googleAvailable ? (
        <div className={uiKitShown ? styles.uiKitVisible : styles.uiKitPending}>
          <GoogleUiKitMedia
            key={googlePlaceId}
            googlePlaceId={googlePlaceId}
            screen={screen}
            onSettled={(shown) => {
              if (shown) setUiKitShownFor(googlePlaceId);
              else setGoogleFailedFor(googlePlaceId);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
