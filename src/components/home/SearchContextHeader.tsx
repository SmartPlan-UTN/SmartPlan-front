"use client";

import { Badge, Icon } from "@/components/ui";
import { formatArs, formatDuration } from "@/lib/utils";
import { categoryLabel } from "@/lib/utils/catalogLabels";
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
 * badge, never a placeholder. Explicit selections and interpreted values
 * both describe the effective search constraints.
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
      <div className={styles.resultsHeaderTop}>
        <h2 className={`sp-h3 ${styles.resultsTitle}`}>
          {surprise
            ? "Elegimos estas ideas para vos"
            : `${planCount} ${planCount === 1 ? "plan" : "planes"} para vos`}
        </h2>
      </div>

      <p className={`sp-small ${styles.resultsSubtitle}`}>
        {surprise
          ? "Cualquiera de las alternativas es un buen plan."
          : "Mirá cada una en el mapa y marcá la que pensás hacer."}
      </p>
      {note ? <p className={`sp-small ${styles.resultsSubtitle}`}>{note}</p> : null}

      {hasQuery || resolvedContext ? (
        <div className={styles.resultsMetaRow}>
          {hasQuery ? (
            <p className={styles.searchedQuery}>
              Buscaste: <span>&ldquo;{query}&rdquo;</span>
            </p>
          ) : null}
          {resolvedContext ? <ContextBadges context={resolvedContext} /> : null}
        </div>
      ) : null}
    </div>
  );
}

function ContextBadges({ context }: { context: ResolvedPlanContext }) {
  const hasAny =
    context.travelMode != null ||
    context.timeOfDay != null ||
    context.availableDuration != null ||
    context.appliedMaxDistanceKm != null ||
    context.budget != null ||
    context.partySize != null ||
    context.departmentName != null ||
    context.categories.length > 0;

  if (!hasAny) return null;

  return (
    <div className={styles.contextBadges}>
      {context.travelMode ? <Badge variant="tag">{{ drive: 'En auto', walk: 'Caminando', bicycle: 'En bicicleta' }[context.travelMode]}</Badge> : null}
      {context.timeOfDay ? <Badge variant="tag">{{ morning: "Mañana", afternoon: "Tarde", evening: "Noche", night: "Madrugada" }[context.timeOfDay]}</Badge> : null}
      {context.availableDuration != null ? <Badge variant="tag">Hasta {formatDuration(context.availableDuration)}</Badge> : null}
      {context.appliedMaxDistanceKm != null ? (
        <Badge variant="tag">Hasta {context.appliedMaxDistanceKm} km</Badge>
      ) : null}
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
      {context.categories.slice(0, 2).map((category) => (
        <Badge variant="tag" key={category.id}>
          {categoryLabel(category.name)}
        </Badge>
      ))}
    </div>
  );
}
