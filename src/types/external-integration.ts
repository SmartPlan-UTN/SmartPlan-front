import { BaseEntity, CatalogEntity } from "./common";

/**
 * A place resolved by `GET /external-integration/places/search?query=…`
 * (public, cached, rate-limited). Matches `ResolvedPlaceDto` in
 * `SmartPlan-back`. Used by PAN 15 to turn what the user typed for their
 * preferred area into a stored `PreferredArea` (label + placeId + coords).
 */
export interface ResolvedPlace {
  placeId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  rating?: number;
  ratingCount?: number;
}

/**
 * Expected keys for an external service provider (CU48-CU52).
 */
export type ExternalProviderKey = "google_maps" | "gemini";

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
