import { BaseEntity } from './common';
import type { Place } from './places';
import type { Category } from './categories';

/**
 * Experiencia concreta del catálogo (CU9-CU11, CU14, CU50, CU53).
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
 * Ubicación de una activity (CU14, CU16, CU50). Relación N:M entre Activity y Place.
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
 * Categoría de una activity (CU10, CU53). Relación N:M entre Activity y Category.
 */
export interface ActivityCategory extends BaseEntity {
  idActivity: number;
  idCategory: number;
  activity?: Activity;
  category?: Category;
}
