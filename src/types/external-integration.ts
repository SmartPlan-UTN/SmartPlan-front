import { BaseEntity, CatalogEntity } from './common';

/**
 * Expected keys for an external service provider (CU48-CU52).
 */
export type ExternalProviderKey = 'google_maps' | 'gemini';

/**
 * External service provider (CU48-CU52).
 */
export interface ExternalProvider extends CatalogEntity<ExternalProviderKey> {
  key: ExternalProviderKey;
  active: boolean;
  syncs?: ExternalSync[];
}
/**
 * Sync record with an external provider (CU49, CU51, CU52).
 */
export interface ExternalSync extends BaseEntity {
  idExternalProvider: number;
  entity: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
  recordCount: number;
  errorMessage: string | null;
  provider?: ExternalProvider;
}
