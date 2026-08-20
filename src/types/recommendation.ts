import { BaseEntity, CatalogEntity } from './common';
import type { User } from './users';
import type { Department } from './places';
import type { Category } from './categories';

/**
 * Claves previstas para el type de salida (CU17, CU19).
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
 * Tipo de salida para la generación de un plan (CU17, CU19).
 */
export interface OutingType extends CatalogEntity<OutingTypeKey> {
  key: OutingTypeKey;
}

/**
 * Parámetros solicitados por el user para generar un plan (CU17, CU19, CU31).
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
 * Categoría elegida dentro de una request (CU17, CU19). Relación N:M entre PlanRequest y Category.
 */
export interface PlanRequestCategory extends BaseEntity {
  idPlanRequest: number;
  idCategory: number;
  description: string | null;
  request?: PlanRequest;
  category?: Category;
}

/**
 * Devolución del user tras realizar un plan (CU21, CU23).
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
 * Claves previstas para el status de una request de plan (CU17, CU19, CU31).
 */
export type RequestStatusKey =
  | 'pending'
  | 'processing'
  | 'generated'
  | 'failed';

/**
 * Status del procesamiento de una request de plan (CU17, CU19, CU31).
 */
export interface RequestStatus extends CatalogEntity<RequestStatusKey> {
  key: RequestStatusKey;
}

/**
 * Claves previstas para el status de una retroalimentación (CU21, CU23).
 */
export type FeedbackStatusKey =
  | 'pending'
  | 'processed'
  | 'discarded';

/**
 * Status del procesamiento de una retroalimentación (CU21, CU23).
 */
export interface FeedbackStatus extends CatalogEntity<FeedbackStatusKey> {
  key: FeedbackStatusKey;
}
