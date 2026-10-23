"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AuthenticatedImage, MediaLightbox } from "@/components/media";
import { ReportButton, useContentReporter, type ReportTarget } from "@/components/reports";
import { FEEDBACK_TAG_LABELS } from "@/components/feedback";
import { getCommunityExperience } from "@/lib/api";
import { communityCreatorRoute, planDetailRoute } from "@/lib/routes";
import type { CommunityExperience } from "@/types";
import styles from "./community.module.css";

export function ExperienceDetailScreen({ id }: { id: number }) {
  const [experience, setExperience] = useState<CommunityExperience | null>(null);
  const [failed, setFailed] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const hideReported = useCallback(({ contentType, contentId }: ReportTarget) => {
    setLightboxIndex(null);
    setExperience((current) => {
      if (!current) return current;
      if (contentType === "experience_comment") return { ...current, comment: null };
      return { ...current, photos: current.photos.filter((photo) => photo.id !== contentId) };
    });
  }, []);
  const reporter = useContentReporter(hideReported);
  useEffect(() => { let active = true; getCommunityExperience(id).then((item) => { if (active) setExperience(item); }).catch(() => { if (active) setFailed(true); }); return () => { active = false; }; }, [id]);
  if (!experience && !failed) return <div className={styles.page}><p className={styles.state} role="status">Abriendo esta vivencia…</p></div>;
  if (failed || !experience) return <div className={styles.page}><p className={styles.state}>Esta vivencia ya no está disponible.</p></div>;
  const username = experience.author.username ?? "viajero";
  return <div className={styles.page}>
    <article className={styles.experienceDetail}>
      <div className={styles.detailGallery}>{experience.photos.length ? experience.photos.map((photo, index) => <button className={styles.galleryPhoto} type="button" key={photo.id} onClick={() => setLightboxIndex(index)} aria-label={`Ver foto ${index + 1} de ${experience.photos.length}`}><AuthenticatedImage url={photo.url} alt="" width={1000} height={760} /></button>) : <div className={styles.coverFallback}><span>Un momento para recordar</span></div>}</div>
      <div className={styles.detailCopy}><p className={styles.eyebrow}>VIVENCIA · SALIDA COMPLETADA</p><Link href={communityCreatorRoute(username)} className={styles.byline}>@{username}</Link>{experience.completedAt ? <p className={styles.note}>{new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(experience.completedAt))}</p> : null}<h1>Así se sintió estar ahí.</h1><p className={styles.ratingLarge} aria-label={`Calificación ${experience.rating} de 5`}>{"★".repeat(experience.rating)}<span>{"★".repeat(5 - experience.rating)}</span></p>{experience.comment ? <div><blockquote>{experience.comment}</blockquote><ReportButton isOwn={experience.isOwn} label={`Denunciar comentario de @${username}`} onRequest={() => reporter.request({ contentType: "experience_comment", contentId: experience.id, title: "Denunciar comentario" })} /></div> : <p className={styles.note}>Compartida por @{username}.</p>}<div className={styles.tagRow}>{experience.tags.map((tag) => <span key={tag}>{FEEDBACK_TAG_LABELS[tag]}</span>)}</div>{experience.inspiredBy ? <section className={styles.inspired}><p className={styles.eyebrow}>EL PLAN QUE LA INSPIRÓ</p><Link href={planDetailRoute(experience.inspiredBy.id)}>{experience.inspiredBy.title} ↗</Link>{experience.inspiredBy.creatorUsername ? <p>Creado por <Link href={communityCreatorRoute(experience.inspiredBy.creatorUsername)}>@{experience.inspiredBy.creatorUsername}</Link></p> : null}</section> : <p className={styles.note}>Esta vivencia se compartió sin publicar un plan de origen.</p>}</div>
    </article>
    {reporter.element}
    {lightboxIndex !== null && experience.photos.length ? <MediaLightbox images={experience.photos} index={lightboxIndex} resourceName={`Vivencia de @${username}`} onIndexChange={setLightboxIndex} onClose={() => setLightboxIndex(null)} renderActions={(photo) => <ReportButton tone="overlay" isOwn={experience.isOwn} label={`Denunciar foto de @${username}`} onRequest={() => { setLightboxIndex(null); reporter.request({ contentType: "experience_photo", contentId: photo.id, title: "Denunciar foto" }); }} />} /> : null}
  </div>;
}
