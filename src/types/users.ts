import { BaseEntity, CatalogEntity } from './common';
import type { Category } from './categories';

/**
 * User del sistema (CU2, CU5, CU6, CU7, CU57).
 * Nota: passwordHash no se expone en el frontend por seguridad.
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
 * Claves previstas para el role de user (CU57, CU62).
 */
export type RoleKey = 'user' | 'admin';

/**
 * Role del sistema (CU57, CU62).
 */
export interface Role extends CatalogEntity<RoleKey> {
  key: RoleKey;
}

/**
 * Permission concreto envelope un resource del sistema (CU61).
 * Formato de key: 'resource.action'.
 */
export type Permission = CatalogEntity;

/**
 * Asignación de permission a role (CU61). Relación N:M entre Role y Permission.
 */
export interface RolePermission extends BaseEntity {
  idRole: number;
  idPermission: number;
  role?: Role;
  permission?: Permission;
}

/**
 * Claves previstas para el status de cuenta de un user (CU2, CU7, CU57).
 */
export type UserStatusKey = 'active' | 'suspended' | 'banned';

/**
 * Status de la cuenta de un user (CU2, CU7, CU57).
 */
export interface UserStatus extends CatalogEntity<UserStatusKey> {
  key: UserStatusKey;
}

/**
 * Categoría preferida por un user (CU8, CU18, CU21). Relación N:M entre User y Category.
 */
export interface UserPreference extends BaseEntity {
  idUser: number;
  idCategory: number;
  user?: User;
  category?: Category;
}
