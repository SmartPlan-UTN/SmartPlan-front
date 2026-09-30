/**
 * Copy for "Lo voy a hacer" (CU22, #130), shared by the results rail
 * (PAN 11) and the plan detail (PAN 17). One-shot: choosing a plan adds an
 * outing to "Mis salidas"; there is no undo here — an outing is cancelled
 * from Mis salidas, with a confirmation.
 *
 * Forbidden: "Elegir este plan", "Sí, este es", "Tu plan elegido",
 * "¿Está seguro…?", "Powered by AI" — anything that sounds definitive.
 */
export const PLAN_SELECTION = {
  intend: "Lo voy a hacer",
  /** Shown instead of the button once the outing exists (preceded by a ✓). */
  added: "Agregado a Mis salidas",
  viewOuting: "Ver en Mis salidas",
  announceAdded: (title: string) => `Agregamos «${title}» a Mis salidas.`,
  error: {
    /** The plan's real state changed on the server; the view was reconciled. */
    reconciled: "Este plan cambió de estado. Lo actualizamos.",
    /** Network / unknown: nothing was saved, the control stays as it was. */
    retry: "No pudimos agregarlo a Mis salidas. Probá de nuevo.",
  },
} as const;
