import type { UserStatus, Role, PlanStatusKey } from './index';

/**
 * Compiler-level check for catalog type incompatibility in TypeScript.
 * This file demonstrates that:
 * 1. Assigning one catalog to a different one produces a compile error.
 * 2. Assigning an invalid `key` to a catalog produces a compile error.
 *
 * It is not a Vitest suite and `pnpm test` does not run it: it is checked
 * only at compile time, via `pnpm build`. Hence the `.type-check` suffix
 * instead of `.test`.
 */

const validUserStatus: UserStatus = {
  id: 1,
  createdAt: '2026-08-18T00:00:00Z',
  updatedAt: '2026-08-18T00:00:00Z',
  deletedAt: null,
  name: 'Active',
  key: 'active',
  description: 'User active in the system',
};

// 1. Catalog incompatibility: UserStatus is not assignable to Role
// @ts-expect-error - UserStatus is not assignable to Role due to the key mismatch ('active' vs 'user' | 'admin')
export const _invalidRole: Role = validUserStatus;

// 2. Invalid catalog key: 'confirmedd' is not a valid key for PlanStatus
// @ts-expect-error - 'confirmedd' is not an allowed value for PlanStatusKey ('generated' | 'selected' | 'confirmed' | 'completed' | 'cancelled')
export const _invalidPlanStatusKey: PlanStatusKey = 'confirmedd';
