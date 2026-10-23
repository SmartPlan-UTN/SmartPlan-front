"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AuthenticatedImage } from "@/components/media";
import { FEEDBACK_TAG_LABELS } from "@/components/feedback";
import { Button, Icon } from "@/components/ui";
import { getCommunityExperiences, getCommunityPlans } from "@/lib/api";
import { communityCreatorRoute, communityExperienceRoute, planDetailRoute } from "@/lib/routes";
import type { CommunityExperience, CommunityPlan } from "@/types";
import styles from "./community.module.css";

export function CommunityScreen() {
  const [stories, setStories] = useState<CommunityExperience[]>([]);
  const [plans, setPlans] = useState<CommunityPlan[]>([]);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback(async (search = "") => {
    setState("loading");
    try {
      const [experiencePage, planPage] = await Promise.all([
        getCommunityExperiences({ page: 1, limit: 8, q: search || undefined }),
        getCommunityPlans({ page: 1, limit: 6, q: search || undefined }),
      ]);
      setStories(experiencePage.data);
      setPlans(planPage.data);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      getCommunityExperiences({ page: 1, limit: 8 }),
      getCommunityPlans({ page: 1, limit: 6 }),
    ]).then(([experiencePage, planPage]) => {
      if (!active) return;
      setStories(experiencePage.data);
      setPlans(planPage.data);
      setState("ready");
    }).catch(() => { if (active) setState("error"); });
    return () => { active = false; };
  }, []);

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

      {state === "error" ? <div className={styles.state}><p>No pudimos traer las historias ahora.</p><Button variant="secondary" onClick={() => void load(query)}>Reintentar</Button></div> : null}
      {state === "loading" ? <div className={styles.state} role="status">Cargando la bitácora…</div> : null}

      {state === "ready" ? <>
        <section className={styles.section} aria-labelledby="stories-heading">
          <div className={styles.sectionHead}><div><p className={styles.eyebrow}>VIVENCIAS</p><h2 id="stories-heading">Así se sintió estar ahí</h2></div><span className={styles.note}>Salidas completadas y compartidas</span></div>
          {stories.length ? <div className={styles.storyGrid}>{stories.map((story, index) => <StoryCard key={story.id} story={story} featured={index === 0} />)}</div> : <p className={styles.empty}>Todavía no hay vivencias para esta búsqueda. Podés empezar con una idea.</p>}
        </section>
        <section className={styles.section} aria-labelledby="ideas-heading">
          <div className={styles.sectionHead}><div><p className={styles.eyebrow}>IDEAS PARA HACER</p><h2 id="ideas-heading">Un buen plan empieza acá</h2></div><span className={styles.note}>Planes públicos de la comunidad</span></div>
          {plans.length ? <div className={styles.planGrid}>{plans.map((plan) => <PlanCard key={plan.id} plan={plan} />)}</div> : <p className={styles.empty}>No encontramos ideas con ese criterio.</p>}
        </section>
      </> : null}
    </div>
  );
}

export function StoryCard({ story, featured = false }: { story: CommunityExperience; featured?: boolean }) {
  const username = story.author.username ?? "viajero";
  const cover = story.photos[0];
  return <article className={`${styles.story} ${featured ? styles.featured : ""}`}>
    <Link href={communityExperienceRoute(story.id)} className={styles.storyCover} aria-label={`Abrir vivencia de @${username}`}>
      {cover ? <AuthenticatedImage url={cover.url} alt="Foto de una salida compartida" width={850} height={650} /> : <div className={styles.coverFallback}><Icon name="camera" size={30} /><span>Una salida para recordar</span></div>}
      <span className={styles.lived}>Vivida</span>
    </Link>
    <div className={styles.storyCopy}>
      <Link href={communityCreatorRoute(username)} className={styles.byline}>@{username}</Link>
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
