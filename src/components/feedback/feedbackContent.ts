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
