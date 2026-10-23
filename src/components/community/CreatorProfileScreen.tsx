"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthenticatedImage } from "@/components/media";
import { getCommunityCreator, getCreatorExperiences, getCreatorPlans } from "@/lib/api";
import { communityExperienceRoute, planDetailRoute } from "@/lib/routes";
import type { CommunityCreator, CommunityExperience, CommunityPlan } from "@/types";
import styles from "./community.module.css";

export function CreatorProfileScreen({ username }: { username: string }) {
  const [creator, setCreator] = useState<CommunityCreator | null>(null);
  const [stories, setStories] = useState<CommunityExperience[]>([]);
  const [plans, setPlans] = useState<CommunityPlan[]>([]);
  const [tab, setTab] = useState<"experiences" | "plans">("experiences");
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => {
    let active = true;
    Promise.all([getCommunityCreator(username), getCreatorExperiences(username, { limit: 30 }), getCreatorPlans(username, { limit: 30 })])
      .then(([profile, experiences, ideas]) => { if (active) { setCreator(profile); setStories(experiences.data); setPlans(ideas.data); setState("ready"); } })
      .catch(() => { if (active) setState("error"); });
    return () => { active = false; };
  }, [username]);
  if (state === "loading") return <div className={styles.page}><p className={styles.state} role="status">Abriendo perfil…</p></div>;
  if (state === "error" || !creator) return <div className={styles.page}><p className={styles.state}>No encontramos este perfil.</p></div>;
  return <div className={styles.page}>
    <header className={styles.profileHero}>
      <div className={styles.profileAvatar}>{creator.avatarUrl ? <AuthenticatedImage url={creator.avatarUrl} alt={`Foto de perfil de @${creator.username}`} width={112} height={112} /> : <span aria-hidden="true">{creator.username.slice(0, 1).toUpperCase()}</span>}</div>
      <div><p className={styles.eyebrow}>PERSONA DE LA COMUNIDAD</p><h1>@{creator.username}</h1>{creator.bio ? <p className={styles.bio}>{creator.bio}</p> : <p className={styles.bioMuted}>Una persona que explora y comparte.</p>}<p className={styles.profileCounts}><span>{creator.experienceCount} {creator.experienceCount === 1 ? "vivencia" : "vivencias"}</span><span>{creator.planCount} {creator.planCount === 1 ? "idea" : "ideas"}</span></p></div>
    </header>
    <div className={styles.tabs} role="tablist" aria-label="Publicaciones de la persona">
      <button role="tab" aria-selected={tab === "experiences"} onClick={() => setTab("experiences")}>Vivencias</button>
      <button role="tab" aria-selected={tab === "plans"} onClick={() => setTab("plans")}>Planes para hacer</button>
    </div>
    {tab === "experiences" ? <div className={styles.storyGrid}>{stories.length ? stories.map((story) => <Link className={`${styles.profileTile} ${story.photos.length ? "" : styles.profileTileNoPhoto}`} key={story.id} href={communityExperienceRoute(story.id)}>{story.photos[0] ? <AuthenticatedImage url={story.photos[0].url} alt="Foto de vivencia" width={520} height={420} /> : <span>Vivencia · {story.rating}/5</span>}<strong>{story.comment || "Una salida vivida"}</strong></Link>) : <p className={styles.empty}>Todavía no compartió vivencias.</p>}</div> : <div className={styles.planGrid}>{plans.length ? plans.map((plan) => <Link className={styles.planCard} href={planDetailRoute(plan.id)} key={plan.id}>{plan.imageUrl ? <AuthenticatedImage url={plan.imageUrl} alt="" width={520} height={360} /> : null}<div className={styles.planCopy}><span className={styles.ideaInline}>Idea</span><strong className={styles.planTitle}>{plan.title}</strong><p>{plan.description}</p></div></Link>) : <p className={styles.empty}>Todavía no compartió planes para hacer.</p>}</div>}
  </div>;
}
