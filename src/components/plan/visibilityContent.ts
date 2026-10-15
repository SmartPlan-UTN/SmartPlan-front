import type { PlanVisibility } from "@/types";

/**
 * Copy for publishing a plan the person created (#130). Only authored plans
 * have it: results from "Planificar" and outings are always private.
 */
export const VISIBILITY_COPY = {
  label: {
    public: "Público",
    private: "Privado",
  } satisfies Record<PlanVisibility, string>,
  hint: {
    public: "Cualquiera puede encontrarlo en Explorar y elegirlo.",
    private: "Solo vos lo ves.",
  } satisfies Record<PlanVisibility, string>,
  action: {
    publish: "Publicar",
    unpublish: "Hacer privado",
  },
  dialog: {
    publish: {
      title: "¿Publicar este plan?",
      body: "Va a aparecer en Explorar y en las recomendaciones, y otras personas van a poder elegirlo. Podés volverlo privado cuando quieras.",
      confirm: "Sí, publicar",
      confirming: "Publicando…",
    },
    unpublish: {
      title: "¿Hacer privado este plan?",
      body: "Deja de aparecer en Explorar y en las recomendaciones. Las salidas que otras personas ya eligieron no cambian.",
      confirm: "Sí, hacer privado",
      confirming: "Guardando…",
    },
    back: "Volver",
  },
  errors: {
    empty: "Sumale al menos una actividad antes de publicarlo.",
    generic: "No pudimos cambiar la visibilidad. Probá de nuevo.",
  },
  announce: {
    public: "Publicamos el plan.",
    private: "El plan ahora es privado.",
  } satisfies Record<PlanVisibility, string>,
} as const;
