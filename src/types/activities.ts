import { BaseEntity } from './common';
import type { Place } from './places';
import type { Category } from './categories';

/**
 * A specific catalog experience (CU9-CU11, CU14, CU50, CU53).
 */
export interface Activity extends BaseEntity {
  name: string;
  description: string;
  estimatedCost: number;
  estimatedDuration: number;
  categories?: ActivityCategory[];
  places?: ActivityPlace[];
}
/**
 * Location of an activity (CU14, CU16, CU50). N:M relationship between Activity and Place.
 */
export interface ActivityPlace extends BaseEntity {
  idActivity: number;
  idPlace: number;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  activity?: Activity;
  place?: Place;
}

/**
 * Category of an activity (CU10, CU53). N:M relationship between Activity and Category.
 */
export interface ActivityCategory extends BaseEntity {
  idActivity: number;
  idCategory: number;
  activity?: Activity;
  category?: Category;
}
