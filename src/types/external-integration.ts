import { BaseEntity, CatalogEntity } from './common';

/**
 * Claves previstas para el provider de servicios externos (CU48-CU52).
 */
export type ExternalProviderKey = 'google_maps' | 'gemini';

/**
 * Proveedor de servicios externos (CU48-CU52).
 */
export interface ExternalProvider extends CatalogEntity<ExternalProviderKey> {
  key: ExternalProviderKey;
  active: boolean;
  syncs?: ExternalSync[];
}
/**
 * Registro de sincronización con un provider externo (CU49, CU51, CU52).
 */
export interface ExternalSync extends BaseEntity {
  idExternalProvider: number;
  entity: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
  recordCount: number;
  messageError: string | null;
  provider?: ExternalProvider;
}
