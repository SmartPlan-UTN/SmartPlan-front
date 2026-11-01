import { formatArs } from "@/lib/utils";

import styles from "./media.module.css";

export interface GooglePlaceRating {
  rating: number;
  ratingCount: number;
  source: "google";
}

export interface GooglePlacePrice {
  min: number | null;
  max: number | null;
  currency: string | null;
  level: string | null;
  source: "google";
}

const LEVEL_LABEL: Record<string, string> = {
  PRICE_LEVEL_FREE: "Gratis",
  PRICE_LEVEL_INEXPENSIVE: "Económico",
  PRICE_LEVEL_MODERATE: "Precio moderado",
  PRICE_LEVEL_EXPENSIVE: "Caro",
  PRICE_LEVEL_VERY_EXPENSIVE: "Muy caro",
};

function priceText(price: GooglePlacePrice): string | null {
  const arsOnly = price.currency === null || price.currency === "ARS";
  if (arsOnly && (price.min !== null || price.max !== null)) {
    if (price.min !== null && price.max !== null) {
      return `${formatArs(price.min)} – ${formatArs(price.max)}`;
    }
    if (price.min !== null) return `Desde ${formatArs(price.min)}`;
    if (price.max !== null) return `Hasta ${formatArs(price.max as number)}`;
  }
  return price.level ? (LEVEL_LABEL[price.level] ?? null) : null;
}

/**
 * Live Google Maps context for a place: its rating and the price range the
 * provider reports for the PLACE. Always labelled with the provider, and the
 * price is never presented as the activity's own price: it is a reference for
 * the venue (a meal there, not this specific experience). Renders nothing when
 * Google returned neither.
 */
export function GooglePlaceContext({
  rating,
  price,
}: {
  rating?: GooglePlaceRating | null;
  price?: GooglePlacePrice | null;
}) {
  const text = price ? priceText(price) : null;
  if (!rating && !text) return null;

  return (
    <div className={styles.googleContext} data-testid="google-place-context">
      {rating ? (
        <p>
          <span aria-hidden="true">★</span> {rating.rating.toFixed(1).replace(".", ",")}
          {` · ${rating.ratingCount.toLocaleString("es-AR")} reseñas en Google Maps`}
        </p>
      ) : null}
      {text ? (
        <p>
          Referencia del lugar en Google Maps: {text}
          <span className={styles.googleContextNote}>
            {" "}
            (precio del local, no de esta actividad)
          </span>
        </p>
      ) : null}
    </div>
  );
}
