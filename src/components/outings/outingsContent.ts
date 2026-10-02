/**
 * Spanish copy for "Mis salidas" (#130). Four collections, four meanings,
 * never mixed: a favorite is something saved, a plan in Mis planes something
 * the person created, an outing to do something they chose to do, and an
 * outing done something they lived.
 */
export const OUTINGS_COPY = {
  metaTitle: "Mis salidas",
  kicker: "Lo que elegiste hacer",
  title: "Mis",
  titleAccent: "salidas.",
  lead: "Los planes que elegiste hacer y los que ya hiciste, con tu experiencia en cada uno.",
  tabsLabel: "Estado de tus salidas",
  tabs: {
    toDo: "Por hacer",
    completed: "Realizadas",
  },
  empty: {
    toDo: "Todavía no elegiste ninguna salida. Cuando algo te guste, tocá «Lo voy a hacer» y aparece acá.",
    completed: "Cuando marques una salida como realizada, va a quedar acá con tu experiencia.",
    cta: "Planificar una salida",
  },
  loadError: "No pudimos cargar tus salidas.",
  retry: "Reintentar",
  paginationLabel: "Paginación de tus salidas",
  pageRange: (from: number, to: number, total: number) =>
    `Mostrando ${from}–${to} de ${total} salidas`,
  monthCount: (count: number) => (count === 1 ? "1 salida" : `${count} salidas`),
  filters: {
    label: "Buscar en tus salidas",
    searchLabel: "Buscar por nombre o actividad",
    searchPlaceholder: "Buscar por nombre o actividad",
    clearSearch: "Borrar búsqueda",
    toggle: "Filtros",
    from: "Desde",
    to: "Hasta",
    sortLabel: "Ordenar",
    sort: {
      recent: "Más recientes",
      oldest: "Más antiguas",
      costDesc: "Mayor costo",
      costAsc: "Menor costo",
    },
    rated: {
      label: "Experiencia",
      all: "Todas",
      yes: "Contada",
      no: "Sin contar",
    },
    clear: "Limpiar filtros",
    noResults: "No encontramos salidas con esos filtros.",
  },
  chosenOn: "Elegida el",
  doneOn: "Realizada el",
  completedPill: "Realizada",
  people: (count: number) => (count === 1 ? "1 persona" : `${count} personas`),
  sourceUnavailable: "El plan original ya no está disponible",
  actions: {
    complete: "Marcar como realizada",
    completing: "Guardando…",
    cancel: "Cancelar salida",
    repeat: "Volver a hacer este plan",
    repeating: "Agregando…",
  },
  cancelDialog: {
    title: (title: string) => `¿Cancelar «${title}»?`,
    body: "La salida se va a quitar de «Por hacer». Si cambiás de idea, podés volver a elegir el plan.",
    confirm: "Sí, cancelar salida",
    confirming: "Cancelando…",
    back: "Volver",
  },
  notices: {
    completed: (title: string) => `Marcamos «${title}» como realizada.`,
    cancelled: (title: string) => `Cancelamos «${title}».`,
    repeated: (title: string) => `Agregamos «${title}» a «Por hacer» de nuevo.`,
    alreadyToDo: (title: string) => `«${title}» ya está en «Por hacer».`,
  },
  errors: {
    complete: "No pudimos marcarla como realizada. Probá de nuevo.",
    cancel: "No pudimos cancelar la salida. Probá de nuevo.",
    repeat: "No pudimos volver a agregarla. Probá de nuevo.",
  },
} as const;
