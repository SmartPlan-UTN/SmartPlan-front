import { BaseEntity } from './common';
import type { User } from './users';

/**
 * Acciones posibles registradas en auditoría.
 */
export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'start_session'
  | 'end_session';

/**
 * Registro de auditoría del sistema.
 */
export interface AuditLog extends BaseEntity {
  action: AuditAction;
  affectedEntity: string;
  affectedEntityId: number;
  original: Record<string, unknown> | null;
  changes: Record<string, unknown> | null;
}
/**
 * Parámetro configurable del sistema.
 */
export interface SystemParameter extends BaseEntity {
  name: string;
  value: number;
  description: string | null;
}

/**
 * Notificación dirigida a un user.
 */
export interface Notification extends BaseEntity {
  idUser: number;
  title: string;
  message: string;
  user?: User;
}
