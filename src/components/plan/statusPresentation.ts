import type { PlanStatusKey } from "@/types";

/**
 * How a plan's domain status reads on screen (CU22, PAN 17). Only shown for
 * states that matter to any viewer: a plan someone confirmed or already did.
 *
 * `generated` and `selected` deliberately get **no** pill — `generated` is the
 * default (a proposal), and a plan's owner marking intent (`selected`) is
 * private to them: it surfaces in the action area, never as a badge a stranger
 * could read. `cancelled` never reaches the public detail (it 404s).
 */
export interface PlanStatusPresentation {
  label: string;
}

const PRESENTATION: Partial<Record<PlanStatusKey, PlanStatusPresentation>> = {
  confirmed: { label: "Confirmado" },
  completed: { label: "Realizado" },
};

export function planStatusPresentation(
  key: PlanStatusKey,
): PlanStatusPresentation | null {
  return PRESENTATION[key] ?? null;
}
