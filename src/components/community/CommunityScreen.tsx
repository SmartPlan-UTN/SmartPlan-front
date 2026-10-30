"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Button, Icon } from "@/components/ui";
import { getCommunityCreators, getCommunityFeed, getCommunityPlans } from "@/lib/api";
import { ROUTES } from "@/lib/routes";
import type {
  CommunityCreatorSummary,
  CommunityFeedFilter,
  CommunityFeedItem,
  CommunityPlanSort,
} from "@/types";
import { PlanCard, StoryCard } from "./cards";
import { PersonLink } from "./Person";
import styles from "./community.module.css";

const FILTERS = [
  { id: "all", label: "Todo" },
  { id: "plans", label: "Planes" },
  { id: "experiences", label: "Experiencias" },
] as const;
const SORTS: Array<{ id: CommunityPlanSort; label: string }> = [
  { id: "recent", label: "Más recientes" },
  { id: "popular", label: "Más populares" },
  { id: "highest_rated", label: "Mejor puntuados" },
  { id: "most_reviewed", label: "Más reseñados" },
];
const POSITION_KEY = "smartplan:community-position";
const itemKey = (item: CommunityFeedItem) =>
  item.kind === "plan"
    ? `plan:${item.plan.id}`
    : `experience:${item.experience.id}`;
type Position = { q?: string; type?: string; sort?: CommunityPlanSort; page?: number; scroll?: number };

export function CommunityScreen({
  initialQuery = "",
  initialFilter = "all",
  initialSort = "recent",
}: {
  initialQuery?: string;
  initialFilter?: CommunityFeedFilter;
  initialSort?: CommunityPlanSort;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [draft, setDraft] = useState(initialQuery);
  const [filter, setFilter] = useState<CommunityFeedFilter>(initialFilter);
  const [sort, setSort] = useState<CommunityPlanSort>(initialSort);
  const [items, setItems] = useState<CommunityFeedItem[]>([]);
  const [creators, setCreators] = useState<CommunityCreatorSummary[]>([]);
  const [creatorsState, setCreatorsState] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [creatorsRetry, setCreatorsRetry] = useState(0);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [retry, setRetry] = useState(0);
  const [moreState, setMoreState] = useState<"idle" | "loading" | "error">(
    "idle",
  );
  const sequence = useRef(0);
  const request = useCallback(
    async (pageNumber: number) => {
      const params = { q: query || undefined, page: pageNumber, limit: 12 };
      if (filter === "plans") {
        const result = await getCommunityPlans({ ...params, sort });
        return {
          ...result,
          data: result.data.map((plan) => ({ kind: "plan" as const, plan })),
        };
      }
      return getCommunityFeed({ ...params, type: filter });
    },
    [query, filter, sort],
  );

  useEffect(() => {
    const current = ++sequence.current;
    let restore: Position | null = null;
    try {
      restore = JSON.parse(
        sessionStorage.getItem(POSITION_KEY) ?? "null",
      ) as Position | null;
    } catch {
      /* Storage is optional. */
    }
    const lastPage =
      restore?.q === query && restore?.type === filter && restore?.sort === sort
        ? Math.min(restore.page ?? 1, 10)
        : 1;
    void Promise.all(
      Array.from({ length: Math.max(1, lastPage) }, (_, index) =>
        request(index + 1),
      ),
    )
      .then((pages) => {
        if (current !== sequence.current) return;
        const unique = new Map(
          pages
            .flatMap((result) => result.data)
            .map((item) => [itemKey(item), item]),
        );
        setItems([...unique.values()]);
        setPage(pages.length);
        setTotalPages(pages[0].pagination.totalPages);
        setState("ready");
        if (
          restore?.q === query &&
          restore?.type === filter &&
          restore?.sort === sort &&
          restore.scroll
        ) {
          requestAnimationFrame(() =>
            window.scrollTo({ top: restore.scroll ?? 0, behavior: "instant" }),
          );
        }
      })
      .catch(() => {
        if (current === sequence.current) setState("error");
      });
    return () => {
      sequence.current += 1;
    };
  }, [query, filter, request, retry, sort]);

  useEffect(() => {
    let active = true;
    void getCommunityCreators()
      .then((people) => {
        if (active) {
          setCreators(people);
          setCreatorsState("ready");
        }
      })
      .catch(() => {
        if (active) setCreatorsState("error");
      });
    return () => {
      active = false;
    };
  }, [creatorsRetry]);

  useEffect(() => {
    const savePosition = () => {
      try {
        sessionStorage.setItem(
          POSITION_KEY,
          JSON.stringify({
            q: query,
            type: filter,
            sort,
            page,
            scroll: window.scrollY,
          }),
        );
      } catch {
        /* Storage is optional. */
      }
    };
    window.addEventListener("pagehide", savePosition);
    document.addEventListener("click", savePosition, true);
    return () => {
      window.removeEventListener("pagehide", savePosition);
      document.removeEventListener("click", savePosition, true);
    };
  }, [query, filter, sort, page]);

  function change(
    nextQuery: string,
    nextFilter: CommunityFeedFilter,
    nextSort: CommunityPlanSort =
      nextFilter === "plans" && filter !== "plans" ? "popular" : sort,
  ) {
    setState("loading");
    setItems([]);
    setMoreState("idle");
    setPage(1);
    setQuery(nextQuery);
    setFilter(nextFilter);
    setSort(nextSort);
    const params = new URLSearchParams();
    if (nextQuery) params.set("q", nextQuery);
    if (nextFilter !== "all") params.set("type", nextFilter);
    if (nextSort !== "recent") params.set("sort", nextSort);
    window.history.replaceState(
      null,
      "",
      `${ROUTES.community}${params.size ? `?${params}` : ""}`,
    );
    try {
      sessionStorage.removeItem(POSITION_KEY);
    } catch {
      /* Storage is optional. */
    }
    setRetry((value) => value + 1);
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    change(draft.trim(), filter);
  }

  async function loadMore() {
    const current = sequence.current;
    setMoreState("loading");
    try {
      const result = await request(page + 1);
      if (current !== sequence.current) return;
      setItems((previous) => [
        ...new Map(
          [...previous, ...result.data].map((item) => [itemKey(item), item]),
        ).values(),
      ]);
      setPage(result.pagination.page);
      setTotalPages(result.pagination.totalPages);
      setMoreState("idle");
    } catch {
      if (current === sequence.current) setMoreState("error");
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.masthead}>
        <div>
          <h1 className={styles.title}>Salir se contagia.</h1>
          <p className={styles.intro}>
            Personas, planes y esas salidas que dan ganas de repetir.
          </p>
        </div>
        <Link className={styles.primaryAction} href={ROUTES.createPlan}>
          <Icon name="plus" size={17} />
          Compartir un plan
        </Link>
      </header>
      <div className={styles.communityLayout}>
        <div className={styles.feedColumn}>
          <div className={styles.feedControls}>
            <form className={styles.search} onSubmit={submit} role="search">
              <Icon name="search" size={18} />
              <label className="sp-sr-only" htmlFor="community-search">
                Buscar experiencias o planes
              </label>
              <input
                id="community-search"
                maxLength={100}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Un lugar, un plan, alguien…"
              />
              <Button type="submit" size="sm">
                Buscar
              </Button>
            </form>
            <div
              className={styles.filters}
              role="group"
              aria-label="Tipo de publicación"
            >
              {FILTERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={filter === item.id}
                  onClick={() => {
                    if (filter !== item.id) change(query, item.id);
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
            {filter === "plans" ? (
              <label className={styles.sortControl}>
                <span>Ordenar por</span>
                <select
                  value={sort}
                  onChange={(event) =>
                    change(query, filter, event.target.value as CommunityPlanSort)
                  }
                >
                  {SORTS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
          {filter === "plans" ? (
            <h2 className={styles.feedHeading}>
              {sort === "popular"
                ? "Planes más populares"
                : sort === "highest_rated"
                  ? "Planes mejor puntuados"
                  : sort === "most_reviewed"
                    ? "Planes con más reseñas"
                    : "Planes compartidos recientemente"}
            </h2>
          ) : null}
          {query ? (
            <p className={styles.searchSummary}>
              Resultados para <strong>“{query}”</strong>
              <button
                type="button"
                onClick={() => {
                  setDraft("");
                  change("", filter);
                }}
              >
                Limpiar búsqueda
              </button>
            </p>
          ) : null}
          <div className={styles.feed} aria-busy={state === "loading"}>
            {state === "loading" ? (
              <div
                className={styles.feedSkeleton}
                role="status"
                aria-label="Cargando publicaciones"
              >
                <span />
                <span />
                <span />
              </div>
            ) : null}
            {state === "error" ? (
              <div className={styles.state} role="alert">
                <h2 className={styles.stateTitle}>
                  No pudimos cargar las publicaciones
                </h2>
                <p>Tu búsqueda sigue acá. Probá otra vez.</p>
                <Button
                  variant="ghostLight"
                  onClick={() => {
                    setState("loading");
                    setRetry((value) => value + 1);
                  }}
                >
                  Reintentar
                </Button>
              </div>
            ) : null}
            {state === "ready" && items.length === 0 ? (
              <div className={styles.emptyCommunity}>
                <Icon name={query ? "search" : "route"} size={34} />
                <h2>
                  {query
                    ? "Por acá todavía no encontramos coincidencias"
                    : filter === "experiences"
                      ? "Tu salida también puede inspirar a alguien"
                      : "El próximo buen plan puede ser tuyo"}
                </h2>
                <p>
                  {query
                    ? "Probá otro lugar, una actividad o el nombre de alguien."
                    : filter === "experiences"
                      ? "Después de una salida, compartí tus fotos y contá cómo te fue. Tu experiencia aparece acá cuando vos lo decidís."
                      : "Compartí un plan que te entusiasme o contá cómo te fue en una salida. Las dos cosas tienen su lugar acá."}
                </p>
                {query ? (
                  <Button
                    variant="ghostLight"
                    onClick={() => {
                      setDraft("");
                      change("", "all");
                    }}
                  >
                    Ver todas las publicaciones
                  </Button>
                ) : filter === "experiences" ? (
                  <div className={styles.actionRow}>
                    <Link
                      className={styles.primaryAction}
                      href={ROUTES.outings}
                    >
                      Compartir una experiencia
                    </Link>
                    <button
                      type="button"
                      className={styles.textButton}
                      onClick={() => change("", "plans")}
                    >
                      Descubrir planes <Icon name="arrow-right" size={15} />
                    </button>
                  </div>
                ) : (
                  <div className={styles.actionRow}>
                    <Link
                      className={styles.primaryAction}
                      href={ROUTES.createPlan}
                    >
                      Crear un plan
                    </Link>
                    <Link className={styles.textButton} href={ROUTES.outings}>
                      Compartir una experiencia{" "}
                      <Icon name="arrow-right" size={15} />
                    </Link>
                  </div>
                )}
              </div>
            ) : null}
            {state === "ready"
              ? items.map((item) =>
                  item.kind === "plan" ? (
                    <PlanCard key={itemKey(item)} plan={item.plan} />
                  ) : (
                    <StoryCard key={itemKey(item)} story={item.experience} />
                  ),
                )
              : null}
          </div>
          {state === "ready" && page < totalPages ? (
            <div className={styles.loadMore}>
              {moreState === "error" ? (
                <p role="alert">No pudimos traer más publicaciones.</p>
              ) : null}
              <Button
                variant="ghostLight"
                disabled={moreState === "loading"}
                onClick={() => void loadMore()}
              >
                {moreState === "loading"
                  ? "Cargando…"
                  : moreState === "error"
                    ? "Reintentar"
                    : "Ver más publicaciones"}
              </Button>
            </div>
          ) : null}
        </div>
        <aside className={styles.sidebar} aria-label="Descubrir y participar">
          <section className={styles.people}>
            <h2>Personas que inspiran</h2>
            <p>
              Ordenadas por los me gusta acumulados en sus experiencias
              públicas.
            </p>
            {creatorsState === "loading" ? (
              <div
                className={styles.peopleSkeleton}
                role="status"
                aria-label="Cargando personas"
              >
                <span />
                <span />
                <span />
              </div>
            ) : creatorsState === "error" ? (
              <div className={styles.peopleError}>
                <p>No pudimos cargar el ranking ahora.</p>
                <button
                  type="button"
                  onClick={() => {
                    setCreatorsState("loading");
                    setCreatorsRetry((value) => value + 1);
                  }}
                >
                  Reintentar
                </button>
              </div>
            ) : creators.length ? creators.slice(0, 5).map((person, index) => (
              <div className={styles.personRow} key={person.username}>
                <span className={styles.rankNumber} aria-label={`${index + 1} en la comunidad`}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <PersonLink
                  username={person.username}
                  avatarUrl={person.avatarUrl}
                  size={42}
                  note={`${new Intl.NumberFormat("es-AR").format(person.likeCount ?? 0)} ${person.likeCount === 1 ? "me gusta" : "me gusta"} en sus experiencias`}
                />
              </div>
            )) : (
              <p className={styles.peopleEmpty}>
                Todavía no hay me gusta en experiencias públicas. Cuando aparezcan, vas a encontrar acá a quienes las compartieron.
              </p>
            )}
          </section>
          {state !== "ready" || items.length > 0 ? (
            <section className={styles.invitation}>
              <Icon name="camera" size={24} />
              <h2>¿Cómo estuvo tu última salida?</h2>
              <p>
                Una foto, un detalle, tu recomendación. Lo que viviste puede
                inspirar a alguien más.
              </p>
              <Link className={styles.textButton} href={ROUTES.outings}>
                Contar mi experiencia <Icon name="arrow-right" size={16} />
              </Link>
            </section>
          ) : null}
          <p className={styles.sidebarNote}>
            Tus planes y reseñas son privados hasta que vos decidas
            compartirlos.
          </p>
        </aside>
      </div>
    </div>
  );
}
