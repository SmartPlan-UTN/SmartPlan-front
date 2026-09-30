import type { ComposerStop } from "./draft";
import { formatArs, formatDuration } from "@/lib/utils";
import type { PlanVisibility } from "@/types";

import styles from "./ReviewStep.module.css";

interface ReviewStepProps {
  title: string;
  description: string;
  peopleCount: number;
  visibility: PlanVisibility;
  stops: ComposerStop[];
  totalCost: number;
  totalDuration: number;
  costPerPerson: number;
  disabled: boolean;
  onEditIdea: () => void;
  onEditRoute: () => void;
}

export function ReviewStep({
  title,
  description,
  peopleCount,
  visibility,
  stops,
  totalCost,
  totalDuration,
  costPerPerson,
  disabled,
  onEditIdea,
  onEditRoute,
}: ReviewStepProps) {
  return (
    <div className={styles.review}>
      <div className={styles.reviewIntro}>
        <span className={styles.eyebrow}>03 / ANTES DE SALIR</span>
        <h3>Un último vistazo</h3>
        <p>
          Todo queda guardado junto cuando confirmes. Hasta entonces, los
          cambios viven solo en este borrador.
        </p>
      </div>

      <section
        className={styles.reviewCard}
        aria-labelledby="review-idea-title"
      >
        <div className={styles.reviewCardHeader}>
          <div>
            <span className={styles.eyebrow}>LA IDEA</span>
            <h4 id="review-idea-title">{title.trim()}</h4>
          </div>
          <button type="button" onClick={onEditIdea} disabled={disabled}>
            Editar
          </button>
        </div>
        {description.trim() ? (
          <p className={styles.reviewDescription}>{description}</p>
        ) : null}
        <div className={styles.reviewMeta}>
          <span>
            {peopleCount} {peopleCount === 1 ? "persona" : "personas"}
          </span>
          <span>{visibility === "private" ? "Solo vos" : "Público"}</span>
        </div>
      </section>

      <section
        className={styles.reviewCard}
        aria-labelledby="review-route-title"
      >
        <div className={styles.reviewCardHeader}>
          <div>
            <span className={styles.eyebrow}>EL RECORRIDO</span>
            <h4 id="review-route-title">
              {stops.length} {stops.length === 1 ? "parada" : "paradas"}
            </h4>
          </div>
          <button type="button" onClick={onEditRoute} disabled={disabled}>
            Editar
          </button>
        </div>

        <ol className={styles.reviewStops}>
          {stops.map((stop, index) => (
            <li key={stop.detailId ?? `new-${stop.activity.id}`}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{stop.activity.name}</strong>
              <small>
                {formatDuration(stop.estimatedDuration)} ·{" "}
                {formatArs(stop.estimatedCost)}
              </small>
            </li>
          ))}
        </ol>

        <div className={styles.reviewTotals}>
          <span>
            Duración estimada <b>{formatDuration(totalDuration)}</b>
          </span>
          <span>
            Costo por persona <b>{formatArs(costPerPerson)}</b>
          </span>
          <span>
            Costo total <b>{formatArs(totalCost)}</b>
          </span>
        </div>
      </section>
    </div>
  );
}
