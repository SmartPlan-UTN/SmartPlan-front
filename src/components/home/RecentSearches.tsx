"use client";

import Link from "next/link";

import { Icon } from "@/components/ui";
import { useRecentPlanRequests } from "@/hooks";
import { planRequestRoute } from "@/lib/routes";
import type { PlanRequestSummary } from "@/types";

import styles from "./recent-searches.module.css";

/**
 * The most recent search under the hero composer, kept compact so it is easy
 * to resume without competing with the primary planning action.
 */
export function RecentSearches() {
  const { status, requests, retry } = useRecentPlanRequests();
  const latest = latestRequest(requests);

  if (status === "idle" || status === "empty") return null;

  return (
    <section className={styles.section} aria-labelledby="recent-searches-title">
      <h2 id="recent-searches-title" className={styles.title}>
        Tu última búsqueda
      </h2>
      {status === "loading" ? (
        <div className={styles.placeholder} aria-busy="true" aria-label="Cargando tu última búsqueda" />
      ) : status === "error" ? (
        <p className={styles.error}>
          No pudimos cargar tu última búsqueda.{" "}
          <button type="button" className={styles.retry} onClick={retry}>
            Reintentar
          </button>
        </p>
      ) : (
        <ul className={styles.list}>
          {latest ? (
            <li>
              <RecentSearchLink request={latest} />
            </li>
          ) : null}
        </ul>
      )}
    </section>
  );
}

function RecentSearchLink({ request }: { request: PlanRequestSummary }) {
  const label = searchLabel(request);

  return (
    <Link
      href={planRequestRoute(request.id)}
      className={styles.item}
      title={label}
      aria-label={`${label}, ${relativeDay(request.requestedAt)}, ${resultLabel(request)}`}
    >
      <span className={styles.iconWrap} aria-hidden="true">
        <Icon name="clock" size={17} className={styles.icon} />
      </span>
      <span className={styles.content}>
        <span className={styles.query}>{label}</span>
        <span className={styles.meta}>
          {relativeDay(request.requestedAt)} <span aria-hidden="true">·</span> {resultLabel(request)}
        </span>
      </span>
      <Icon name="arrow-right" size={16} aria-hidden="true" className={styles.arrow} />
    </Link>
  );
}

function latestRequest(requests: PlanRequestSummary[]): PlanRequestSummary | undefined {
  return requests.reduce<PlanRequestSummary | undefined>((latest, request) => {
    if (!latest) return request;
    const requestTime = Date.parse(request.requestedAt);
    const latestTime = Date.parse(latest.requestedAt);
    if (requestTime > latestTime || (requestTime === latestTime && request.id > latest.id)) {
      return request;
    }
    return latest;
  }, undefined);
}

function searchLabel(request: PlanRequestSummary): string {
  if (request.mode === "surprise" || !request.query) return "Sorpréndeme";
  return `«${request.query}»`;
}

function resultLabel(request: PlanRequestSummary): string {
  if (request.statusKey !== "generated") return "Generando…";
  return request.planCount === 1 ? "1 plan" : `${request.planCount} planes`;
}

/** "hoy", "ayer", dd/mm, or dd/mm/aa before this year, in the visitor's local time. */
export function relativeDay(isoDate: string, now = new Date()): string {
  const date = new Date(isoDate);
  const startOfDay = (value: Date) =>
    new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (days === 0) return "hoy";
  if (days === 1) return "ayer";
  const dayMonth = `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
  if (date.getFullYear() === now.getFullYear()) return dayMonth;
  return `${dayMonth}/${String(date.getFullYear() % 100).padStart(2, "0")}`;
}
