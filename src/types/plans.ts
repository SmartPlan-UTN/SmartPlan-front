import { BaseEntity, CatalogEntity } from './common';
import type { User } from './users';
import type { PlanRequest } from './recommendation';
import type { Activity } from './activities';

/**
 * Plan made up of activities (CU12, CU13, CU17, CU24-CU31, CU60).
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
 * Individual item in a plan (CU13, CU27-CU30).
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
 * Expected keys for a plan's status (CU22, CU26, CU60).
 * Values match exactly what's seeded in SmartPlan-back
 * (`src/database/seeds/definitions.ts`).
 */
export type PlanStatusKey =
  | 'generated'
  | 'selected'
  | 'confirmed'
  | 'completed'
  | 'cancelled';

/**
 * Status of a plan (CU22, CU26, CU60).
 */
export interface PlanStatus extends CatalogEntity<PlanStatusKey> {
  key: PlanStatusKey;
}
