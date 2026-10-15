"use client";

import Link from "next/link";

import { Icon } from "@/components/ui";
import { useRecentPlanRequests } from "@/hooks";
import { planRequestRoute } from "@/lib/routes";
import type { PlanRequestSummary } from "@/types";

import styles from "./recent-searches.module.css";

/**
 * "Tus últimas búsquedas" under the hero composer (#189): a way back to
 * results already generated, so leaving them by mistake no longer means
 * asking again and getting different plans. Quiet by design — nothing at
 * all without a session or without searches, one line on error.
 */
export function RecentSearches() {
  const { status, requests, retry } = useRecentPlanRequests();

  if (status === "idle" || status === "empty") return null;

  return (
    <section className={styles.section} aria-labelledby="recent-searches-title">
      <h2 id="recent-searches-title" className={styles.title}>
        Tus últimas búsquedas
      </h2>
      {status === "loading" ? (
        <div className={styles.placeholder} aria-busy="true" aria-label="Cargando tus búsquedas" />
      ) : status === "error" ? (
        <p className={styles.error}>
          No pudimos cargar tus búsquedas.{" "}
          <button type="button" className={styles.retry} onClick={retry}>
            Reintentar
          </button>
        </p>
      ) : (
        <ul className={styles.list}>
          {requests.map((request) => (
            <li key={request.id}>
              <Link href={planRequestRoute(request.id)} className={styles.item}>
                <Icon name="arrow-right" size={13} aria-hidden="true" className={styles.icon} />
                <span className={styles.query}>{searchLabel(request)}</span>
                <span className={styles.meta}>
                  {relativeDay(request.requestedAt)} · {resultLabel(request)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function searchLabel(request: PlanRequestSummary): string {
  if (request.mode === "surprise" || !request.query) return "Sorpréndeme";
  return `«${request.query}»`;
}

function resultLabel(request: PlanRequestSummary): string {
  if (request.statusKey !== "generated") return "Generando…";
  return request.planCount === 1 ? "1 plan" : `${request.planCount} planes`;
}

/** "hoy", "ayer" or dd/mm, in the visitor's local time. */
export function relativeDay(isoDate: string, now = new Date()): string {
  const date = new Date(isoDate);
  const startOfDay = (value: Date) =>
    new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (days === 0) return "hoy";
  if (days === 1) return "ayer";
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
}
