import { BaseEntity } from './common';
import type { User } from './users';
import type { Activity } from './activities';
import type { Plan } from './plans';
import type { PlanStatusKey } from './plans';

/**
 * A user's favorites list (CU15, CU39-CU43).
 */
export interface FavoriteList extends BaseEntity {
  idUser: number;
  user?: User;
  activities?: FavoriteActivity[];
  plans?: FavoritePlan[];
}
/**
 * Activity saved to a favorites list (CU15, CU39, CU41). N:M relationship between FavoriteList and Activity.
 */
export interface FavoriteActivity extends BaseEntity {
  idFavoriteList: number;
  idActivity: number;
  savedAt?: string;
  list?: FavoriteList;
  activity?: Activity;
}

/**
 * Plan saved to a favorites list (CU40, CU42, CU43). N:M relationship between FavoriteList and Plan.
 */
export interface FavoritePlan extends BaseEntity {
  idFavoriteList: number;
  idPlan: number;
  savedAt?: string;
  list?: FavoriteList;
  plan?: Plan;
}

/** Activity projection returned by the favorites API (CU15, CU39, CU41). */
export interface FavoriteActivitySummary {
  id: number;
  name: string;
  description: string;
  estimatedCost: number;
  estimatedDuration: number;
  type: string | null;
}

/** Response returned by `POST/GET /favorite-activities`. */
export interface FavoriteActivityResponse {
  id: number;
  idActivity: number;
  savedAt: string;
  activity: FavoriteActivitySummary;
}

/** Plan projection returned by the favorites API (CU40, CU42, CU43). */
export interface FavoritePlanSummary {
  id: number;
  title: string;
  description: string | null;
  estimatedTotalCost: number;
  estimatedTotalDuration: number;
  peopleCount: number;
  activityCount: number;
  status: { key: PlanStatusKey; name: string };
}

/** Response returned by `POST/GET /favorite-plans`. */
export interface FavoritePlanResponse {
  id: number;
  idPlan: number;
  savedAt: string;
  plan: FavoritePlanSummary;
}
