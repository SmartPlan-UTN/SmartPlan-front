import { BaseEntity, CatalogEntity } from './common';
import type { User } from './users';
import type { PlanRequest } from './recommendation';
import type { Activity } from './activities';

/**
 * Plan de activities (CU12, CU13, CU17, CU24-CU31, CU60).
 */
export interface Plan extends BaseEntity {
  title: string;
  description: string | null;
  idUser: number;
  idPlanRequest: number | null;
  idPlanStatus: number;
  estimatedTotalCost: number;
  estimatedTotalDuration: number;
  user?: User;
  request?: PlanRequest | null;
  status?: PlanStatus;
  details?: PlanDetail[];
}

/**
 * Ítem individual de un plan (CU13, CU27-CU30).
 */
export interface PlanDetail extends BaseEntity {
  idPlan: number;
  idActivity: number;
  order: number;
  estimatedCost: number;
  estimatedDuration: number;
  note: string | null;
  plan?: Plan;
  activity?: Activity;
}

/**
 * Claves previstas para el status de un plan (CU22, CU26, CU60).
 */
export type PlanStatusKey =
  | 'generated'
  | 'selected'
  | 'confirmed'
  | 'completed'
  | 'cancelled';

/**
 * Status de un plan (CU22, CU26, CU60).
 */
export interface PlanStatus extends CatalogEntity<PlanStatusKey> {
  key: PlanStatusKey;
}
