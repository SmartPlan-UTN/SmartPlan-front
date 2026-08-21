import { BaseEntity, CatalogEntity } from './common';
import type { User } from './users';
import type { Department } from './places';
import type { Category } from './categories';

/**
 * Expected keys for the outing type (CU17, CU19).
 * Values match exactly what's expected in SmartPlan-back.
 */
export type OutingTypeKey =
  | 'couple'
  | 'friends'
  | 'family'
  | 'solo'
  | 'couple'
  | 'friends'
  | 'family';

/**
 * Outing type for generating a plan (CU17, CU19).
 */
export interface OutingType extends CatalogEntity<OutingTypeKey> {
  key: OutingTypeKey;
}

/**
 * Parameters submitted by the user to generate a plan (CU17, CU19, CU31).
 */
export interface PlanRequest extends BaseEntity {
  idUser: number;
  budget: number;
  idDepartment: number;
  availableDuration: number;
  requestedAt: string;
  idOutingType: number;
  idRequestStatus: number;
  notes: string | null;
  user?: User;
  department?: Department;
  outingType?: OutingType;
  status?: RequestStatus;
  categories?: PlanRequestCategory[];
}

/**
 * Category chosen within a request (CU17, CU19). N:M relationship between PlanRequest and Category.
 */
export interface PlanRequestCategory extends BaseEntity {
  idPlanRequest: number;
  idCategory: number;
  description: string | null;
  request?: PlanRequest;
  category?: Category;
}

/**
 * User's feedback after completing a plan (CU21, CU23).
 */
export interface Feedback extends BaseEntity {
  title: string;
  description: string | null;
  actualCost: number | null;
  actualDuration: number | null;
  idPlanRequest: number;
  idFeedbackStatus: number;
  request?: PlanRequest;
  status?: FeedbackStatus;
}

/**
 * Expected keys for a plan request's status (CU17, CU19, CU31).
 * Values match exactly what's expected in SmartPlan-back.
 */
export type RequestStatusKey =
  | 'pending'
  | 'processing'
  | 'generated'
  | 'failed';

/**
 * Processing status of a plan request (CU17, CU19, CU31).
 */
export interface RequestStatus extends CatalogEntity<RequestStatusKey> {
  key: RequestStatusKey;
}

/**
 * Expected keys for feedback status (CU21, CU23).
 * Values match exactly what's seeded in SmartPlan-back.
 */
export type FeedbackStatusKey =
  | 'pending'
  | 'processed'
  | 'discarded';

/**
 * Processing status of a feedback entry (CU21, CU23).
 */
export interface FeedbackStatus extends CatalogEntity<FeedbackStatusKey> {
  key: FeedbackStatusKey;
}
