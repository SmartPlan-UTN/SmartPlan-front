import { BaseEntity, CatalogEntity } from './common';

/**
 * Categoría de activities (CU10, CU54).
 */
export interface Category extends BaseEntity {
  name: string;
  description: string | null;
  idCategoryStatus: number;
  status?: CategoryStatus;
}

/**
 * Claves previstas para el status de una categoría (CU54).
 */
export type CategoryStatusKey = 'active' | 'inactive';

/**
 * Status de una categoría (CU54).
 */
export interface CategoryStatus extends CatalogEntity<CategoryStatusKey> {
  key: CategoryStatusKey;
}
