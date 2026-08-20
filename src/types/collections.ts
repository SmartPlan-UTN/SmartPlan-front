import { BaseEntity } from './common';
import type { User } from './users';
import type { Activity } from './activities';

/**
 * Agrupación personalizada de activities creada por el user (CU32-CU38).
 */
export interface Collection extends BaseEntity {
  idUser: number;
  nameCollection: string;
  savedAt: string;
  user?: User;
  activities?: FavoriteCollection[];
}
/**
 * Activity perteneciente a una colección (CU35-CU37). Relación N:M entre Collection y Activity.
 */
export interface FavoriteCollection extends BaseEntity {
  idCollection: number;
  idActivity: number;
  order: number | null;
  collection?: Collection;
  activity?: Activity;
}
