import { BaseEntity } from './common';
import type { User } from './users';
import type { Activity } from './activities';
import type { Plan } from './plans';

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
  list?: FavoriteList;
  activity?: Activity;
}

/**
 * Plan saved to a favorites list (CU40, CU42, CU43). N:M relationship between FavoriteList and Plan.
 */
export interface FavoritePlan extends BaseEntity {
  idFavoriteList: number;
  idPlan: number;
  list?: FavoriteList;
  plan?: Plan;
}
