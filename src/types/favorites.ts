import { BaseEntity } from './common';
import type { User } from './users';
import type { Activity } from './activities';
import type { Plan } from './plans';

/**
 * Lista de favorites de un user (CU15, CU39-CU43).
 */
export interface FavoriteList extends BaseEntity {
  idUser: number;
  user?: User;
  activities?: FavoriteActivity[];
  plans?: FavoritePlan[];
}
/**
 * Activity guardada en list de favorites (CU15, CU39, CU41). Relación N:M entre FavoriteList y Activity.
 */
export interface FavoriteActivity extends BaseEntity {
  idFavoriteList: number;
  idActivity: number;
  list?: FavoriteList;
  activity?: Activity;
}

/**
 * Plan guardado en list de favorites (CU40, CU42, CU43). Relación N:M entre FavoriteList y Plan.
 */
export interface FavoritePlan extends BaseEntity {
  idFavoriteList: number;
  idPlan: number;
  list?: FavoriteList;
  plan?: Plan;
}
