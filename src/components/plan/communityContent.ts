/**
 * Spanish copy for the community experiences section (#106). Tone: people
 * telling how it went, as proof the plan is worth it — never a review site,
 * never moderation vocabulary.
 */
export const COMMUNITY_COPY = {
  kicker: "experiencias de la comunidad",
  title: "Cómo les fue a quienes lo hicieron",
  loading: "Cargando experiencias",
  error: "No pudimos cargar las experiencias.",
  retry: "Reintentar",
  empty: {
    title: "Todavía nadie contó cómo le fue",
    body: "Si hacés este plan, al dejar tu opinión podés compartir tu experiencia y tus fotos acá.",
  },
  counts: (experiences: number, photos: number) => {
    const people = experiences === 1 ? "1 experiencia" : `${experiences} experiencias`;
    if (photos === 0) return people;
    return `${people} · ${photos === 1 ? "1 foto" : `${photos} fotos`}`;
  },
  wallLabel: (plan: string) => `Fotos de la comunidad en ${plan}`,
  listLabel: "Experiencias compartidas",
  cardLabel: (author: string) => `Experiencia de ${author}`,
  photosBy: (author: string) => `Fotos de ${author}`,
  viewPhoto: (position: number, total: number) => `Ver foto ${position} de ${total}`,
  doneIn: (month: string) => `Lo hizo en ${month}`,
  loadMore: "Ver más experiencias",
  loadingMore: "Cargando…",
  moreError: "No pudimos cargar más. Intentá de nuevo.",
} as const;
