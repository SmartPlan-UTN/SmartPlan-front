import { BaseEntity } from './common';
import type { User } from './users';

/**
 * Possible actions recorded in the audit log.
 * Values match `AuditAction` in SmartPlan-back
 * (`src/administration/entities/audit-log.entity.ts`).
 */
export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'start_session'
  | 'end_session';

/**
 * System audit log entry.
 */
export interface AuditLog extends BaseEntity {
  action: AuditAction;
  affectedEntity: string;
  affectedEntityId: number;
  original: Record<string, unknown> | null;
  changes: Record<string, unknown> | null;
}
/**
 * Configurable system parameter.
 */
export interface SystemParameter extends BaseEntity {
  name: string;
  value: number;
  description: string | null;
}

/**
 * Notification addressed to a user.
 */
export interface Notification extends BaseEntity {
  idUser: number;
  title: string;
  message: string;
  user?: User;
}
