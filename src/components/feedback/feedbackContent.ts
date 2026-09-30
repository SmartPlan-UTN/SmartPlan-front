import type { FeedbackTag } from "@/types";

/**
 * Spanish copy for CU23. The tag keys are the backend contract
 * (`FEEDBACK_TAGS`); the labels are ours. Tone: closing an experience the
 * user lived, never "filling in a survey" — no obligation language, no
 * "encuesta vencida", no penalties.
 */

export const FEEDBACK_TAG_LABELS: Record<FeedbackTag, string> = {
  great_value: "Gran relación precio-calidad",
  too_expensive: "Más caro de lo esperado",
  far: "Quedaba lejos",
  would_recommend: "Lo recomendaría",
};

/** Stable order for the chips. */
export const FEEDBACK_TAG_ORDER: readonly FeedbackTag[] = [
  "great_value",
  "would_recommend",
  "far",
  "too_expensive",
];

export const RATING_LABELS = [
  "No fue para mí",
  "Podría mejorar",
  "Estuvo bien",
  "Muy bueno",
  "Excelente",
] as const;

export const RATING_STAR_LABELS = [
  "1 estrella — No fue para mí",
  "2 estrellas — Podría mejorar",
  "3 estrellas — Estuvo bien",
  "4 estrellas — Muy bueno",
  "5 estrellas — Excelente",
] as const;

/** Short label for the history card / read view, e.g. `★ 4 · Muy bueno`. */
export function ratingLabel(rating: number): string {
  return RATING_LABELS[Math.min(5, Math.max(1, Math.round(rating))) - 1];
}

export const FEEDBACK_COPY = {
  invite: {
    title: "¿Cómo estuvo?",
    subtitle: "Contanos tu experiencia",
    dismiss: "Ahora no",
  },
  dialog: {
    heading: "¿Cómo estuvo tu plan?",
    ratingLabel: "Tu calificación",
    ratingPrompt: "Elegí una estrella. Con eso ya alcanza.",
    ratingReady: "Ya podés enviarlo. Los detalles son opcionales.",
    tagsLabel: "¿Qué destacarías?",
    lowRatingTagsLabel: "¿Qué podríamos mejorar?",
    tagsHint: "Opcional",
    costLabel: "¿Cuánto gastaste realmente?",
    costHint: "Opcional",
    estimatedLabel: "Estimado por SmartPlan",
    realLabel: "Gasto real",
    commentToggle: "Agregar un comentario",
    commentLabel: "Tu comentario",
    commentPlaceholder: "Lo que quieras recordar de este plan…",
    submit: "Enviar opinión",
    submitting: "Enviando…",
    dismiss: "Ahora no",
    costError: "Ingresá un monto válido mayor a $0.",
    costMaxError: "El monto máximo es $99.999.999,99.",
  },
  success: {
    title: "¡Gracias por tu opinión!",
    body: "Esto nos ayuda a mejorar tus próximos planes.",
  },
  experience: {
    heading: "Tu experiencia",
    costHeading: "Costo",
    estimatedLabel: "Estimado por SmartPlan",
    realLabel: "Lo que gastaste",
  },
} as const;

/**
 * The optional step after the feedback (CU23 → CU44). Same tone: an offer,
 * never a pending task — "Ahora no" is as visible as the way in.
 */
export const ACTIVITY_RATINGS_COPY = {
  offer: {
    question: "¿Querés valorar las actividades que hiciste?",
    body: "Es opcional. Tus valoraciones ayudan a otras personas a elegir.",
    accept: "Valorar actividades",
    decline: "Ahora no",
  },
  heading: "Valorá las actividades",
  lead: "Solo las que quieras. Las que dejes sin estrellas no se envían.",
  currentRating: "Tu valoración actual",
  saved: "Guardada",
  commentToggle: "Agregar un comentario",
  commentLabel: (activity: string) => `Tu comentario sobre ${activity}`,
  commentPlaceholder: "Qué te gustó, qué no…",
  submit: "Guardar valoraciones",
  submitting: "Guardando…",
  skip: "Omitir",
  done: {
    title: "¡Gracias por valorar!",
    body: "Tus valoraciones ayudan a otras personas a elegir.",
    rejectedBody:
      "Guardamos tus valoraciones, pero algún comentario no pasó la moderación y no se va a publicar. Podés editarlo desde la actividad.",
  },
  errors: {
    generic: "No pudimos guardarla. Intentá de nuevo.",
    experience: "No pudimos verificar esta actividad en tu salida.",
    activityGone: "Esta actividad ya no está disponible.",
    validation: "Revisá el comentario.",
    partial: (failed: number, attempted: number) =>
      failed === attempted
        ? "No pudimos guardar tus valoraciones. Intentá de nuevo."
        : failed === 1
          ? "No pudimos guardar una valoración. Las demás quedaron guardadas."
          : `No pudimos guardar ${failed} valoraciones. Las demás quedaron guardadas.`,
  },
} as const;

/** Neutral phrasing of the gap between estimated and real spend. */
export function costDeltaLabel(estimated: number, actual: number): string | null {
  const delta = Math.round(actual - estimated);
  if (delta === 0) return "Igual a lo estimado";
  const abs = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Math.abs(delta));
  return delta > 0
    ? `${abs} sobre lo estimado`
    : `${abs} menos que lo estimado`;
}
