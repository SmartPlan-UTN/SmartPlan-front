import { BaseEntity } from './common';
import type { User } from './users';

/**
 * Sesión abierta por un user (CU1, CU4).
 * Nota: tokenHash no se expone en el frontend por seguridad.
 */
export interface UserSession extends BaseEntity {
  idUser: number;
  startedAt: string;
  active: boolean;
  ip: string | null;
  user?: User;
}

/**
 * Solicitud de recuperación de contraseña (CU3).
 * Nota: tokenHash no se expone en el frontend por seguridad.
 */
export interface PasswordRecovery extends BaseEntity {
  idUser: number;
  tokenCreatedAt: string;
  expiresAt: string;
  used: boolean;
  user?: User;
}

