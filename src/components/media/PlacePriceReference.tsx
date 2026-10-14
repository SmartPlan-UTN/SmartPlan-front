import { formatArs } from "@/lib/utils";
import type { ExternalPrice } from "@/types";

import styles from "./media.module.css";

const LEVEL_LABEL: Record<string, string> = {
  PRICE_LEVEL_FREE: "Gratis",
  PRICE_LEVEL_INEXPENSIVE: "Económico ($)",
  PRICE_LEVEL_MODERATE: "Precio moderado ($$)",
  PRICE_LEVEL_EXPENSIVE: "Caro ($$$)",
  PRICE_LEVEL_VERY_EXPENSIVE: "Muy caro ($$$$)",
};

/**
 * Text for a place-level Google price (a range, a lower bound or a coarse
 * level), or null. Only ARS amounts are shown as amounts.
 */
export function placePriceReferenceText(
  price: ExternalPrice | null | undefined,
): string | null {
  if (!price) return null;
  const arsOnly = price.currency === "ARS";
  if (arsOnly && (price.min !== null || price.max !== null)) {
    if (price.min !== null && price.max !== null) {
      return `${formatArs(price.min)} – ${formatArs(price.max)}`;
    }
    if (price.min !== null) return `Desde ${formatArs(price.min)}`;
    if (price.max !== null) return `Hasta ${formatArs(price.max)}`;
  }
  return price.level ? (LEVEL_LABEL[price.level] ?? null) : null;
}

/**
 * A compact, attributed reference of what the PLACE costs according to
 * Google Maps. Shown only when SmartPlan has no price of its own for the
 * item; it is context about the venue, never the activity's price, and it
 * never counts in a plan total.
 */
export function PlacePriceReference({
  price,
}: {
  price: ExternalPrice | null | undefined;
}) {
  const text = placePriceReferenceText(price);
  if (!text) return null;
  return (
    <span
      className={styles.priceRef}
      title="Rango de precios del lugar según Google Maps (no es el precio de esta actividad)"
    >
      Ref. del lugar en Google Maps: {text}
    </span>
  );
}
