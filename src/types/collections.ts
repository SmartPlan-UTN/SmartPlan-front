import { BaseEntity } from './common';
import type { User } from './users';
import type { Activity } from './activities';

/**
 * Custom grouping of activities created by the user (CU32-CU38).
 */
export interface Collection extends BaseEntity {
  idUser: number;
  nameCollection: string;
  savedAt: string;
  user?: User;
  activities?: FavoriteCollection[];
}
/**
 * Activity belonging to a collection (CU35-CU37). N:M relationship between Collection and Activity.
 */
export interface FavoriteCollection extends BaseEntity {
  idCollection: number;
  idActivity: number;
  order: number | null;
  collection?: Collection;
  activity?: Activity;
}
