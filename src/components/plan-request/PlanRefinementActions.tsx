import { Button } from "@/components/ui";
import { isHomeStop, stopLabel } from "@/lib/plans/stops";
import type { PlanDetailResult, PlanRefinementAction, RefinePlanRequestPayload } from "@/types";
import styles from "./refinement.module.css";

/** Whole-plan adjustments, in the person's words. */
export const REFINEMENT_CHIPS = [
  ["MORE_CALM", "Más tranqui"],
  ["MORE_MODERN", "Más moderno"],
  ["CHEAPER", "Más barato"],
  ["LESS_TRAVEL", "Más cerca"],
  ["MORE_ORIGINAL", "Algo más distinto"],
] as const;

interface RefinementProps {
  plan: Pick<PlanDetailResult, "id" | "details">;
  busy: boolean;
  onRefine: (payload: RefinePlanRequestPayload) => void;
  /** A free or low-budget search: a game at home can close the plan. */
  canAddHomeGame?: boolean;
}

/** "Más tranqui · Más moderno · Más barato…": one tap changes the idea, not the search. */
export function RefinementChips({ plan, busy, onRefine, canAddHomeGame = false }: RefinementProps) {
  const chips: readonly (readonly [PlanRefinementAction, string])[] =
    canAddHomeGame && !plan.details.some(isHomeStop)
      ? [["ADD_HOME_GAME", "Sumar un juego en casa"], ...REFINEMENT_CHIPS]
      : REFINEMENT_CHIPS;
  return (
    <ul className={styles.chips} aria-label="Ajustar la recomendación">
      {chips.map(([action, label]) => (
        <li key={action}>
          <button
            type="button"
            className={styles.chip}
            disabled={busy}
            onClick={() => onRefine({ planId: plan.id, action })}
          >
            {label}
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Change or drop one stop while keeping the others. */
export function StopAdjustments({ plan, busy, onRefine }: RefinementProps) {
  const stops = [...plan.details].sort((a, b) => a.order - b.order);
  return (
    <details className={styles.refinement}>
      <summary>Cambiar una parada</summary>
      <p className={styles.hint}>
        Cambiá una parada y conservamos las demás.
      </p>
      <ol className={styles.stops}>
        {stops.map((stop, stopIndex) => (
          <li key={stop.id}>
            <span>{stopLabel(stop)}</span>
            <div>
              <Button
                type="button"
                size="sm"
                variant="ghostEmber"
                disabled={busy}
                onClick={() =>
                  onRefine({ planId: plan.id, action: "SWAP_STOP", stopIndex })
                }
                aria-label={`Cambiar ${stopLabel(stop)}`}
              >
                Cambiar
              </Button>
              {stops.length > 1 ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghostLight"
                  disabled={busy}
                  onClick={() =>
                    onRefine({
                      planId: plan.id,
                      action: "REMOVE_STOP",
                      stopIndex,
                    })
                  }
                  aria-label={`Quitar ${stopLabel(stop)}`}
                >
                  Quitar
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </details>
  );
}

/** Everything that can adjust a plan, in one place (used where there is room). */
export function PlanRefinementActions(props: RefinementProps) {
  return (
    <div>
      <RefinementChips {...props} />
      <StopAdjustments {...props} />
    </div>
  );
}
