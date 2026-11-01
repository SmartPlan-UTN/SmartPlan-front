/**
 * Every word the help page says, in one file — same convention as
 * `landingContent.ts`: copy in Spanish with voseo, code in English.
 *
 * The answers describe only what the product does today. When a flow
 * changes, the matching answer changes with it, or the help page ends up
 * teaching a screen that no longer exists.
 */

/** Where support requests go. Shown as text and used for the `mailto:` link. */
export const SUPPORT_EMAIL = "smartplan@admin.com";

/**
 * The user manual is written outside the app (Docs/PDF). Drop the exported
 * file at `public/docs/manual-de-usuario.pdf`, or point this at its shared
 * link, and the page picks it up without touching the component.
 */
export const USER_MANUAL_URL = "/docs/manual-de-usuario.pdf";

export const HELP_COPY = {
  metaTitle: "Ayuda y soporte",
  kicker: "Ayuda y soporte",
  title: "¿En qué te",
  titleAccent: "ayudamos?",
  lead: "Consultá el manual, revisá las preguntas frecuentes o escribinos si algo no funciona como esperabas.",
  manual: {
    title: "Manual de usuario",
    body: "La guía completa de smartplan, paso a paso: crear tu cuenta, planificar una salida, armar tus planes y gestionar tu perfil.",
    action: "Abrir el manual",
  },
  faq: {
    title: "Preguntas frecuentes",
  },
  contact: {
    title: "Contacto y soporte",
    body: "¿No encontraste lo que buscabas o algo no anda bien? Escribinos y contanos qué pasó. Si podés, sumá en qué pantalla estabas y qué intentabas hacer.",
    action: "Escribir a soporte",
  },
} as const;

export interface FrequentQuestion {
  question: string;
  answer: string;
}

export const FAQS: readonly FrequentQuestion[] = [
  {
    question: "¿Necesito una cuenta para usar smartplan?",
    answer:
      "Podés explorar actividades y planes públicos sin cuenta. Para armar tus planes, guardar favoritos y llevar registro de tus salidas tenés que crear una cuenta e iniciar sesión.",
  },
  {
    question: "¿Cómo planifico una salida?",
    answer:
      "En Inicio, escribí con tus palabras qué tenés ganas de hacer. Si querés, sumá el momento del día, la cantidad de personas y el presupuesto. smartplan te devuelve alternativas con lugares, tiempos y costos. Si no tenés ninguna idea, probá con «Sorpréndeme».",
  },
  {
    question: "¿Otras personas pueden ver mis planes?",
    answer:
      "No, salvo que vos lo decidas. Todo plan nuevo es privado. Desde Mis planes o desde el detalle del plan podés publicarlo para que aparezca en Explorar, y volverlo privado cuando quieras. Para publicarlo tiene que tener al menos una actividad.",
  },
  {
    question: "¿Cómo agrego un plan a Mis salidas?",
    answer:
      "Cuando un plan te guste, tocá «Lo voy a hacer». Aparece en Mis salidas, en la pestaña «Por hacer».",
  },
  {
    question: "¿Cómo cuento cómo me fue en una salida?",
    answer:
      "En Mis salidas, abrí la salida y tocá «Marcar como realizada». Pasa a «Realizadas» y ahí podés contar tu experiencia y calificar las actividades.",
  },
  {
    question: "¿Qué diferencia hay entre Favoritos y las colecciones?",
    answer:
      "Favoritos es donde guardás lo que te interesa para más adelante. Las colecciones te sirven para agruparlo por tema, por ejemplo «Para ir con amigos» o «Fin de semana».",
  },
  {
    question: "¿Para qué usa smartplan mi ubicación?",
    answer:
      "Para proponerte salidas cerca tuyo y para «Sorpréndeme». Es opcional: lo configurás en Preferencias, junto con la distancia máxima que estás dispuesto a recorrer.",
  },
  {
    question: "Olvidé mi contraseña, ¿qué hago?",
    answer:
      "En la pantalla de inicio de sesión tocá «¿Olvidaste tu contraseña?» e ingresá tu email. Te enviamos un enlace para elegir una nueva.",
  },
  {
    question: "¿Cómo elimino mi cuenta?",
    answer:
      "Desde Mi perfil, en «Eliminar cuenta». Esta acción es irreversible y borra todos tus datos.",
  },
  {
    question: "Mi cuenta aparece como suspendida, ¿qué puedo hacer?",
    answer:
      "Escribinos al email de soporte que figura en esta página, desde la misma dirección con la que te registraste, y revisamos tu caso.",
  },
];
