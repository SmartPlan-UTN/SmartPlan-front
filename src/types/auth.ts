import { BaseEntity } from './common';
import type { User } from './users';

/**
 * Session opened by a user (CU1, CU4).
 * Note: tokenHash is never exposed to the frontend for security reasons.
 */
export interface UserSession extends BaseEntity {
  idUser: number;
  startedAt: string;
  expiresAt: string;
  active: boolean;
  ip: string | null;
  user?: User;
}

/**
 * Password recovery request (CU3).
 * Note: tokenHash is never exposed to the frontend for security reasons.
 */
export interface PasswordRecovery extends BaseEntity {
  idUser: number;
  tokenCreatedAt: string;
  expiresAt: string;
  used: boolean;
  user?: User;
}
