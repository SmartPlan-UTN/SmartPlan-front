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
    public: "Cualquiera puede encontrarlo en Comunidad, en Explorar y en búsquedas que coincidan.",
    private: "Solo vos lo ves.",
  } satisfies Record<PlanVisibility, string>,
  action: {
    publish: "Publicar",
    unpublish: "Hacer privado",
  },
  dialog: {
    publish: {
      title: "¿Publicar este plan?",
      body: "Se va a compartir con tu usuario y foto de perfil en Comunidad, Explorar y búsquedas que coincidan. Otras personas podrán guardarlo, elegirlo o crear su versión con crédito a tu plan. Podés volverlo privado cuando quieras.",
      confirm: "Sí, publicar",
      confirming: "Publicando…",
    },
    unpublish: {
      title: "¿Hacer privado este plan?",
      body: "Deja de aparecer en Comunidad, Explorar y las recomendaciones. Las salidas que otras personas ya eligieron y las experiencias que compartieron no cambian.",
      confirm: "Sí, hacer privado",
      confirming: "Guardando…",
    },
    back: "Volver",
  },
  removed: {
    label: "Dado de baja",
    hint: "Lo dimos de baja de la comunidad tras una denuncia. Sigue siendo tuyo, pero ya no se puede publicar.",
  },
  errors: {
    empty: "Sumale al menos una actividad antes de publicarlo.",
    removed: "Este plan fue dado de baja por moderación y no se puede publicar.",
    generic: "No pudimos cambiar la visibilidad. Probá de nuevo.",
  },
  announce: {
    public: "Publicamos el plan.",
    private: "El plan ahora es privado.",
  } satisfies Record<PlanVisibility, string>,
} as const;
