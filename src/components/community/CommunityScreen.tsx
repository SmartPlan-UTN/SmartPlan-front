"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { AuthenticatedImage } from "@/components/media";
import { FEEDBACK_TAG_LABELS } from "@/components/feedback";
import { Button, Icon } from "@/components/ui";
import { getCommunityExperiences, getCommunityPlans } from "@/lib/api";
import { communityCreatorRoute, communityExperienceRoute, planDetailRoute, ROUTES } from "@/lib/routes";
import type { CommunityExperience, CommunityPlan } from "@/types";
import styles from "./community.module.css";

export function CommunityScreen() {
  const [stories, setStories] = useState<CommunityExperience[]>([]);
  const [plans, setPlans] = useState<CommunityPlan[]>([]);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [storiesState, setStoriesState] = useState<"loading" | "ready" | "error">("loading");
  const [plansState, setPlansState] = useState<"loading" | "ready" | "error">("loading");
  const requestSequence = useRef(0);

  const fetchResults = useCallback(async (search: string, sequence: number) => {
    const results = await Promise.allSettled([
      getCommunityExperiences({ page: 1, limit: 8, q: search || undefined }),
      getCommunityPlans({ page: 1, limit: 6, q: search || undefined }),
    ]);
    if (sequence !== requestSequence.current) return;

    const [experienceResult, planResult] = results;
    if (experienceResult.status === "fulfilled") {
      setStories(experienceResult.value.data);
      setStoriesState("ready");
    } else {
      setStoriesState("error");
    }
    if (planResult.status === "fulfilled") {
      setPlans(planResult.value.data);
      setPlansState("ready");
    } else {
      setPlansState("error");
    }
  }, []);

  const load = useCallback(async (search = "") => {
    const sequence = ++requestSequence.current;
    setStories([]);
    setPlans([]);
    setStoriesState("loading");
    setPlansState("loading");
    await fetchResults(search, sequence);
  }, [fetchResults]);

  useEffect(() => {
    const sequence = ++requestSequence.current;
    void Promise.resolve().then(() => fetchResults("", sequence));
    return () => { requestSequence.current += 1; };
  }, [fetchResults]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuery(draft.trim());
    void load(draft.trim());
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>BITÁCORA ABIERTA · SMARTPLAN</p>
        <h1>Lo que vivimos<br /><em>inspira lo que sigue.</em></h1>
        <p className={styles.intro}>Ideas para salir y experiencias reales, compartidas por quienes ya estuvieron ahí.</p>
        <form className={styles.search} onSubmit={submit} role="search">
          <Icon name="search" size={19} aria-hidden="true" />
          <label className="sr-only" htmlFor="community-search">Buscar experiencias o planes</label>
          <input id="community-search" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Un lugar, un momento, algo para hacer…" />
          <Button type="submit" size="sm">Buscar</Button>
        </form>
      </header>

      <section className={styles.section} aria-labelledby="stories-heading" aria-busy={storiesState === "loading"}>
        <div className={styles.sectionHead}><div><p className={styles.eyebrow}>VIVENCIAS</p><h2 id="stories-heading">Así se sintió estar ahí</h2></div><span className={styles.note}>Salidas completadas y compartidas</span></div>
        {storiesState === "loading" ? <p className={styles.empty} role="status">Buscando vivencias…</p> : null}
        {storiesState === "error" ? <p className={styles.empty} role="alert">No pudimos cargar las vivencias. <button className={styles.emptyLink} type="button" onClick={() => void load(query)}>Reintentar</button></p> : null}
        {storiesState === "ready" && stories.length > 0 ? <div className={styles.storyGrid}>{stories.map((story, index) => <StoryCard key={story.id} story={story} featured={index === 0} />)}</div> : null}
        {storiesState === "ready" && stories.length === 0 ? <div className={styles.empty}>
          <p>{query ? "No encontramos vivencias con esa búsqueda." : "Todavía no hay vivencias compartidas por acá."}</p>
          {query ? <Link className={styles.emptyLink} href="#ideas-heading">Explorar ideas de la comunidad</Link> : <Link className={styles.emptyLink} href={ROUTES.outings}>¿Ya saliste? Compartí una vivencia desde Mis salidas</Link>}
        </div> : null}
      </section>
      <section className={styles.section} aria-labelledby="ideas-heading" aria-busy={plansState === "loading"}>
        <div className={styles.sectionHead}><div><p className={styles.eyebrow}>IDEAS PARA HACER</p><h2 id="ideas-heading">Un buen plan empieza acá</h2></div><span className={styles.note}>Planes públicos de la comunidad</span></div>
        {plansState === "loading" ? <p className={styles.empty} role="status">Buscando ideas…</p> : null}
        {plansState === "error" ? <p className={styles.empty} role="alert">No pudimos cargar las ideas. <button className={styles.emptyLink} type="button" onClick={() => void load(query)}>Reintentar</button></p> : null}
        {plansState === "ready" && plans.length > 0 ? <div className={styles.planGrid}>{plans.map((plan) => <PlanCard key={plan.id} plan={plan} />)}</div> : null}
        {plansState === "ready" && plans.length === 0 ? <div className={styles.empty}>
          <p>{query ? "No encontramos planes con esa búsqueda." : "Cuando alguien comparta una idea, la vas a encontrar acá."}</p>
          <Link className={styles.emptyLink} href={ROUTES.createPlan}>Crear un plan para la comunidad</Link>
        </div> : null}
      </section>
    </div>
  );
}

export function StoryCard({ story, featured = false }: { story: CommunityExperience; featured?: boolean }) {
  // Without a username there is no profile to open: never guess one.
  const username = story.author.username ?? null;
  const author = username ? `@${username}` : story.author.alias;
  const cover = story.photos[0];
  return <article className={`${styles.story} ${featured ? styles.featured : ""}`}>
    <Link href={communityExperienceRoute(story.id)} className={styles.storyCover} aria-label={`Abrir vivencia de ${author}`}>
      {cover ? <AuthenticatedImage url={cover.url} alt="Foto de una salida compartida" width={850} height={650} /> : <div className={styles.coverFallback}><Icon name="camera" size={30} /><span>Una salida para recordar</span></div>}
      <span className={styles.lived}>Vivida</span>
    </Link>
    <div className={styles.storyCopy}>
      {username ? <Link href={communityCreatorRoute(username)} className={styles.byline}>{author}</Link> : <span className={styles.byline}>{author}</span>}
      {story.completedAt ? <p className={styles.note}>{new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(story.completedAt))}</p> : null}
      <div className={styles.rating} aria-label={`Calificación ${story.rating} de 5`}>{"★".repeat(story.rating)}<span>{"★".repeat(5 - story.rating)}</span></div>
      {story.comment ? <p className={styles.quote}>“{story.comment}”</p> : <p className={styles.quoteMuted}>Una experiencia compartida en SmartPlan.</p>}
      {story.tags.length ? <p className={styles.note}>{story.tags.map((tag) => FEEDBACK_TAG_LABELS[tag]).join(" · ")}</p> : null}
      {story.inspiredBy ? <Link className={styles.inspiration} href={planDetailRoute(story.inspiredBy.id)}>Inspirado en · {story.inspiredBy.title}</Link> : null}
      <Link className={styles.readMore} href={communityExperienceRoute(story.id)}>Abrir vivencia <span aria-hidden="true">↗</span></Link>
    </div>
  </article>;
}

export function PlanCard({ plan, compact = false }: { plan: CommunityPlan; compact?: boolean }) {
  return <article className={`${styles.planCard}${compact ? ` ${styles.findingPlanCard}` : ""}`}>
    <Link href={planDetailRoute(plan.id)} className={styles.planImage}>
      {plan.imageUrl ? <AuthenticatedImage url={plan.imageUrl} alt="" width={520} height={360} /> : <div className={styles.coverFallback}><Icon name="map" size={26} /></div>}
      <span className={styles.idea}>Idea</span>
    </Link>
    <div className={styles.planCopy}>{plan.authorUsername ? <Link href={communityCreatorRoute(plan.authorUsername)} className={styles.byline}>@{plan.authorUsername}</Link> : null}<Link href={planDetailRoute(plan.id)} className={styles.planTitle}>{plan.title}</Link><p>{plan.description || "Un plan compartido para inspirar tu próxima salida."}</p><Link className={styles.readMore} href={planDetailRoute(plan.id)}>Explorar plan <span aria-hidden="true">↗</span></Link></div>
  </article>;
}
