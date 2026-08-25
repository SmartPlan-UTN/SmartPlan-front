import { BaseEntity } from './common';
import type { User } from './users';
import type { Activity } from './activities';

/**
 * Custom grouping of activities created by the user (CU32-CU38).
 */
export interface Collection extends BaseEntity {
  idUser: number;
  nameCollection: string;
  description: string | null;
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

/** Input accepted by POST /collections (CU32). */
export interface CreateCollectionInput {
  nameCollection: string;
  description?: string;
}

/** Activity membership projected by a collection detail response. */
export interface CollectionActivityDetail {
  id: number;
  idCollection: number;
  idActivity: number;
  order: number | null;
  activity: {
    id: number;
    name: string;
    description: string;
    estimatedCost: number;
    estimatedDuration: number;
    type: string | null;
  };
}

/** Safe collection detail returned by the collections API. */
export interface CollectionDetail {
  id: number;
  nameCollection: string;
  description: string | null;
  savedAt: string;
  activityCount: number;
  createdAt: string;
  updatedAt: string;
  activities: CollectionActivityDetail[];
}
