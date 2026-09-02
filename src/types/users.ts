import { BaseEntity, CatalogEntity } from "./common";
import type { Category } from "./categories";

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
export type RoleKey = "user" | "admin";

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
export type UserStatusKey = "active" | "suspended" | "banned";

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

/**
 * A single category in the signed-in user's preference set (CU8, CU18).
 * Matches the category projection inside `UserPreferencesResponseDto` in
 * `SmartPlan-back` — same three fields as `CategoryOption`, but reached
 * through `/users/me/preferences` rather than the public catalog.
 */
export interface PreferenceCategory {
  id: number;
  name: string;
  description: string | null;
}

/**
 * A preferred area resolved against `GET /external-integration/places/search`
 * (CU8, CU18, PAN 15). `label` is what the user sees; `placeId` + coordinates
 * are the machine-usable reference the backend stores and CU19 will use as a
 * search centre. Matches `PreferredAreaDto` / `PreferredAreaResponseDto` in
 * `SmartPlan-back`.
 */
export interface PreferredArea {
  label: string;
  placeId: string;
  latitude: number;
  longitude: number;
}

/**
 * Response of `GET /users/me/preferences` and `PATCH /users/me/preferences`
 * (CU8, CU18). Distinct from `UserPreference`, which is the raw N:M join
 * row: this is the flattened view the API actually returns. Matches
 * `UserPreferencesResponseDto` in `SmartPlan-back`. Every scalar is `null`
 * until the user sets it; `useDeviceLocation` defaults to `false`.
 */
export interface UserPreferencesResponse {
  categories: PreferenceCategory[];
  usualBudget: number | null;
  usualPeopleCount: number | null;
  preferredArea: PreferredArea | null;
  useDeviceLocation: boolean;
  maxDistanceKm: number | null;
}

/**
 * Body accepted by `PATCH /users/me/preferences` (CU8, CU18, PAN 15).
 * Matches `UpdatePreferencesDto` in `SmartPlan-back`. `categoryIds` is
 * required and is a full replacement. The five scalar fields are each
 * optional in the contract: omitting one leaves the stored value untouched,
 * an explicit `null` clears it. The form always sends every field (a full
 * snapshot), so this type keeps them required.
 */
export interface UpdateUserPreferencesInput {
  categoryIds: number[];
  usualBudget: number | null;
  usualPeopleCount: number | null;
  preferredArea: PreferredArea | null;
  useDeviceLocation: boolean;
  maxDistanceKm: number | null;
}

/** Editable profile view returned by the user profile endpoints (CU5). */
export interface UserProfile {
  id: number;
  name: string;
  lastName: string;
  email: string;
  role: { key: RoleKey; name: string };
  status: { key: UserStatusKey; name: string };
}
