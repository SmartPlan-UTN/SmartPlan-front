import type { PaginatedResult } from './common';
import type { PriceInput } from './pricing';

export type CandidateEntityType = 'activity' | 'place';
export type CandidateStatus = 'pending' | 'approved' | 'discarded';
/** Where a proposal comes from: the initial load, the monthly refresh or by hand. */
export type CandidateOrigin = 'initial_load' | 'monthly_refresh' | 'manual';

export interface CatalogCandidatePrice {
  kind: 'FREE' | 'FIXED' | 'FROM' | 'RANGE' | 'UNKNOWN';
  min: number | null;
  max: number | null;
  unit: string | null;
  source: string | null;
  sourceRef: string | null;
  verifiedAt: string | null;
}

/** One proposal in "Candidatos del catálogo" (`/admin/catalog-candidates`). */
export interface CatalogCandidateSummary {
  id: number;
  entityType: CandidateEntityType;
  status: CandidateStatus;
  origin: CandidateOrigin;
  name: string;
  description: string | null;
  place: {
    id: number;
    slug: string | null;
    name: string;
    kind: string | null;
    departmentName: string | null;
  } | null;
  price: CatalogCandidatePrice | null;
  occasions: string[];
  durationMinutes: number | null;
  minPeople: number | null;
  maxPeople: number | null;
  /** Warnings: `source_unverified`, `possible_duplicate_of:<slug>`. */
  notes: string[];
  sourceRefs: { url: string; checkedAt: string | null }[];
  createdAt: string;
  reviewedAt: string | null;
  discardReason: string | null;
  appliedEntityId: number | null;
}

export interface CatalogCandidateDetail extends CatalogCandidateSummary {
  payload: Record<string, unknown>;
  originalPayload: Record<string, unknown>;
  /** Fields the review changed against what was proposed. */
  changedFields: string[];
  existingActivities: {
    id: number;
    slug: string | null;
    name: string;
    type: string | null;
    occasions: string[];
  }[];
  model: string | null;
}

export type CatalogCandidatesResult = PaginatedResult<CatalogCandidateSummary>;

export interface CatalogCandidatesQuery {
  status?: CandidateStatus;
  entityType?: CandidateEntityType;
  origin?: CandidateOrigin;
  idDepartment?: number;
  idPlace?: number;
  placeKind?: string;
  search?: string;
  sortBy?: 'createdAt' | 'placeName';
  direction?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface CatalogCandidateCounts {
  byStatus: Record<CandidateStatus, number>;
  pendingByOrigin: Record<CandidateOrigin, number>;
}

/** What a reviewer can change before approving; only the fields sent change. */
export interface UpdateCatalogCandidateInput {
  name?: string;
  description?: string;
  durationMinutes?: number;
  price?: PriceInput | CatalogCandidatePrice;
  occasions?: string[];
  minPeople?: number | null;
  maxPeople?: number | null;
  minAge?: number | null;
  idPlace?: number;
}

export interface BulkApproveCandidatesResult {
  results: {
    id: number;
    status: 'approved' | 'possible_duplicate' | 'invalid' | 'not_pending';
    appliedEntityId?: number | null;
    errors?: string[];
  }[];
}
