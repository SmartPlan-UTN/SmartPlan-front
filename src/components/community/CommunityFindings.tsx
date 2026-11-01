"use client";

import Link from "next/link";
import { Icon, Stars } from "@/components/ui";
import { planDetailRoute, ROUTES } from "@/lib/routes";
import { formatDuration } from "@/lib/utils";
import type { CommunityPlanRecommendation } from "@/types";
import { LazyImage } from "./LazyImage";
import { PersonLink } from "./Person";
import { RoutePreview } from "./cards";
import { SavePlanButton } from "./PublicationActions";
import styles from "./findings.module.css";

const REASONS: Record<string, string> = {
  covers_experiences: "Incluye lo que buscabas",
  fits_location: "En la zona que pediste",
  fits_budget: "Dentro de tu presupuesto",
  fits_party: "Para tu compañía",
};
function cost(plan: CommunityPlanRecommendation) {
  if (plan.currentPriceMin === null || plan.currentPriceMax === null)
    return "Costo por confirmar";
  if (plan.currentPriceMin === 0 && plan.currentPriceMax === 0) return "Gratis";
  if (plan.currentPriceMin === plan.currentPriceMax)
    return `Aprox. $${plan.currentPriceMin.toLocaleString("es-AR")}`;
  return `$${plan.currentPriceMin.toLocaleString("es-AR")}–$${plan.currentPriceMax.toLocaleString("es-AR")}`;
}

/** Only the server's request-matched public plans enter this section. */
export function CommunityFindings({
  recommendations = [],
  returnTo,
}: {
  recommendations?: CommunityPlanRecommendation[];
  returnTo?: string;
}) {
  if (!recommendations.length) return null;
  return (
    <section
      className={styles.findings}
      aria-labelledby="community-findings-title"
    >
      <header className={styles.header}>
        <div>
          <h2 id="community-findings-title">Planes de la comunidad</h2>
          <p>Planes compartidos por otras personas que encajan con lo que buscás.</p>
        </div>
        <Link href={ROUTES.community}>
          Conocer la comunidad <Icon name="arrow-right" size={16} />
        </Link>
      </header>
      <div
        className={`${styles.grid} ${recommendations.length === 1 ? styles.single : ""}`}
      >
        {recommendations.slice(0, 3).map((plan) => (
          <article className={styles.card} key={plan.id}>
            <div className={styles.cover}>
              {plan.imageUrl ? (
                <LazyImage
                  url={plan.imageUrl}
                  alt=""
                  width={640}
                  height={400}
                  attribution="compact"
                  fallback={<RoutePreview stops={plan.stops ?? []} />}
                />
              ) : (
                <RoutePreview stops={plan.stops ?? []} />
              )}
            </div>
            <div className={styles.body}>
              {plan.authorUsername ? (
                <PersonLink
                  username={plan.authorUsername}
                  avatarUrl={plan.authorAvatarUrl}
                  size={32}
                  note="compartió este plan"
                />
              ) : null}
              <h3>
                <Link href={planDetailRoute(plan.id, returnTo)}>
                  {plan.title}
                </Link>
              </h3>
              {plan.description ? (
                <p className={styles.description}>{plan.description}</p>
              ) : null}
              <div className={styles.meta}>
                <span>
                  <Icon name="clock" size={14} />
                  {formatDuration(plan.estimatedTotalDuration)}
                </span>
                <span>{cost(plan)}</span>
              </div>
              <div className={styles.reasons}>
                {plan.matchReasons
                  .flatMap((reason) =>
                    REASONS[reason]
                      ? [
                          <span key={reason}>
                            <Icon name="check" size={13} />
                            {REASONS[reason]}
                          </span>,
                        ]
                      : [],
                  )
                  .slice(0, 2)}
              </div>
              {plan.sharedExperienceCount > 0 ? (
                <Link
                  className={styles.reviews}
                  href={`${planDetailRoute(plan.id, returnTo)}#community-experiences`}
                >
                  {plan.sharedAverageRating !== null ? (
                    <>
                      <Stars rating={plan.sharedAverageRating} size={13} />
                      <span>{plan.sharedAverageRating.toFixed(1)} / 5</span>
                    </>
                  ) : null}
                  <span>
                    {plan.sharedExperienceCount}{" "}
                    {plan.sharedExperienceCount === 1
                      ? "reseña"
                      : "reseñas"}
                  </span>
                </Link>
              ) : null}
              {!plan.decisionGrade ? (
                <p className={styles.uncertainty}>
                  <Icon name="info" size={14} />
                  Hay datos por confirmar antes de salir.
                </p>
              ) : null}
              <div className={styles.actions}>
                <SavePlanButton id={plan.id} title={plan.title} />
                <Link href={planDetailRoute(plan.id, returnTo)}>
                  Ver plan <Icon name="arrow-right" size={15} />
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
