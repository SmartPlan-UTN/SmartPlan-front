import { BaseEntity, CatalogEntity } from './common';
import type { Category } from './categories';

/**
 * System user (CU2, CU5, CU6, CU7, CU57).
 * Note: passwordHash is never exposed to the frontend for security reasons.
 */
export interface User extends BaseEntity {
  name: string;
  lastName: string;
  email: string;
  idRole: number;
  idUserStatus: number;
  role?: Role;
  status?: UserStatus;
  preferences?: UserPreference[];
}

/**
 * Expected keys for a user's role (CU57, CU62).
 * Values match exactly what's seeded in SmartPlan-back
 * (`src/database/seeds/definitions.ts`: `USER_ROLE`, `ADMIN_ROLE`).
 */
export type RoleKey = 'user' | 'admin';

/**
 * System role (CU57, CU62).
 */
export interface Role extends CatalogEntity<RoleKey> {
  key: RoleKey;
}

/**
 * Concrete permission over a system resource (CU61).
 * Key format: 'resource.action'.
 */
export type Permission = CatalogEntity;

/**
 * Assignment of a permission to a role (CU61). N:M relationship between Role and Permission.
 */
export interface RolePermission extends BaseEntity {
  idRole: number;
  idPermission: number;
  role?: Role;
  permission?: Permission;
}

/**
 * Expected keys for a user's account status (CU2, CU7, CU57).
 * Values match exactly what's seeded in SmartPlan-back.
 */
export type UserStatusKey = 'active' | 'suspended' | 'banned';

/**
 * Status of a user's account (CU2, CU7, CU57).
 */
export interface UserStatus extends CatalogEntity<UserStatusKey> {
  key: UserStatusKey;
}

/**
 * Category preferred by a user (CU8, CU18, CU21). N:M relationship between User and Category.
 */
export interface UserPreference extends BaseEntity {
  idUser: number;
  idCategory: number;
  user?: User;
  category?: Category;
}
