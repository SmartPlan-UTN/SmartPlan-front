/**
 * Copy for marking the intent to do a plan (CU22). Everyday, reversible tone,
 * shared by the results rail (PAN 11) and the plan detail (PAN 17).
 *
 * Forbidden: "Elegir este plan", "Sí, este es", "Tu plan elegido",
 * "¿Está seguro…?", "Powered by AI" — anything that sounds definitive.
 */
export const PLAN_SELECTION = {
  results: {
    intend: "Lo voy a hacer",
    intended: "Lo vas a hacer", // preceded by a ✓
    undo: "Ya no lo voy a hacer",
    viewChosen: "Ver plan",
    announceOn: (title: string) =>
      `Marcamos «${title}» como uno que vas a hacer.`,
    announceOff: (title: string) => `Sacamos «${title}» de tus planes.`,
  },
  detail: {
    intend: "Lo voy a hacer",
    intended: "Lo vas a hacer",
    undo: "Ya no lo voy a hacer",
    /** State C (CU23): the plan already happened. Reads as a record, not a CTA. */
    completed: "Hiciste este plan",
    announceOn: "Lo marcamos como un plan que vas a hacer.",
    announceOff: "Lo sacamos de tus planes.",
  },
  error: {
    /** The plan's real state changed on the server; the view was reconciled. */
    reconciled: "Este plan cambió de estado. Lo actualizamos.",
    /** Network / unknown: nothing was saved, the control stays as it was. */
    retry: "No pudimos guardar el cambio. Probá de nuevo.",
  },
} as const;
