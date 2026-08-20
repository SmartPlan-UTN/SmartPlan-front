import type { UserStatus, Role, PlanStatusKey } from './index';

/**
 * Verificación de incompatibilidad de types entre catálogos a nivel de compilador TypeScript.
 * Este archivo demuestra que:
 * 1. Asignar un catálogo a otro distinto produce un error de compilación.
 * 2. Asignar una `key` inválida a un catálogo produce un error de compilación.
 *
 * No es una suite de Vitest y `pnpm test` no lo ejecuta: se verifica solo, al
 * compilar, vía `pnpm build`. De ahí el sufijo `.type-check` y no `.test`.
 */

const validUserStatus: UserStatus = {
  id: 1,
  createdAt: '2026-08-18T00:00:00Z',
  updatedAt: '2026-08-18T00:00:00Z',
  deletedAt: null,
  name: 'Activo',
  key: 'active',
  description: 'User active en el sistema',
};

// 1. Incompatibilidad entre catálogos: UserStatus no es asignable a Role
// @ts-expect-error - UserStatus no es asignable a Role debido a la incompatibilidad de key ('active' vs 'user' | 'admin')
export const _invalidRole: Role = validUserStatus;

// 2. Clave inválida en catálogo: 'confirmedd' no es una key válida para PlanStatus
// @ts-expect-error - 'confirmedd' no es un value permitido en PlanStatusKey ('generated' | 'selected' | 'confirmed' | 'completed' | 'cancelled')
export const _invalidPlanStatusKey: PlanStatusKey = 'confirmedd';
