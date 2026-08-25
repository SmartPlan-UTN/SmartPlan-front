const arsFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

/**
 * Formats an amount as Argentine pesos (`$12.345`), the currency used
 * throughout the product.
 */
export function formatArs(amount: number): string {
  return arsFormatter.format(amount);
}
