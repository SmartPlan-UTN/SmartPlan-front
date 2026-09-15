"use client";

import { Badge, Icon } from "@/components/ui";
import { formatArs } from "@/lib/utils";
import type { ResolvedPlanContext } from "@/types";

import styles from "./generation.module.css";

export interface SearchContextHeaderProps {
  mode: "auto" | "surprise";
  query?: string | null;
  resolvedContext?: ResolvedPlanContext | null;
  planCount: number;
  note?: string | null;
}

/**
 * What the user searched for and what the system understood from it
 * (CU17) — replacing a header that used to say nothing more than "your
 * plan is ready". The badge row is built only from non-null
 * `resolvedContext` fields: a value the system never resolved gets no
 * badge, never a placeholder. `timeOfDay` is deliberately never shown here
 * even though it can be part of the request — it's a pick, not something
 * the system "detected", and this row is specifically about what got
 * understood from the request.
 */
export function SearchContextHeader({
  mode,
  query,
  resolvedContext,
  planCount,
  note,
}: SearchContextHeaderProps) {
  const surprise = mode === "surprise";
  const hasQuery = !surprise && !!query;

  return (
    <div className={styles.resultsHeader}>
      <Badge variant="ai" className={styles.resultsEyebrow}>
        <Icon name="sparkles" size={11} aria-hidden="true" />
        Generado con IA
      </Badge>

      {hasQuery ? (
        <p className={styles.searchedQuery}>
          Buscaste: <span>&ldquo;{query}&rdquo;</span>
        </p>
      ) : null}

      <h2 className={`sp-h2 ${styles.resultsTitle}`}>
        {surprise
          ? "Elegimos estas ideas para vos"
          : `Encontramos ${planCount} ${planCount === 1 ? "plan" : "planes"} para vos`}
      </h2>
      <p className={`sp-body ${styles.resultsSubtitle}`}>
        {surprise
          ? "Cualquiera de las alternativas es un buen plan."
          : "Mirá cada una en el mapa y marcá la que pensás hacer."}
      </p>
      {note ? <p className={`sp-small ${styles.resultsSubtitle}`}>{note}</p> : null}

      {resolvedContext ? <ContextBadges context={resolvedContext} /> : null}
    </div>
  );
}

function ContextBadges({ context }: { context: ResolvedPlanContext }) {
  const hasAny =
    context.budget != null ||
    context.partySize != null ||
    context.departmentName != null ||
    context.categories.length > 0;

  if (!hasAny) return null;

  return (
    <div className={styles.contextBadges}>
      {context.budget != null ? (
        <Badge variant="cost">
          <Icon name="wallet" size={11} aria-hidden="true" />~{formatArs(context.budget)}
        </Badge>
      ) : null}
      {context.partySize != null ? (
        <Badge variant="tag">
          <Icon name="users" size={11} aria-hidden="true" />
          {context.partySize} {context.partySize === 1 ? "persona" : "personas"}
        </Badge>
      ) : null}
      {context.departmentName != null ? (
        <Badge variant="tag">
          <Icon name="map-pin" size={11} aria-hidden="true" />
          {context.departmentName}
        </Badge>
      ) : null}
      {context.categories.map((category) => (
        <Badge variant="tag" key={category.id}>
          {category.name}
        </Badge>
      ))}
    </div>
  );
}
