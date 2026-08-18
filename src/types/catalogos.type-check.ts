import type { EstadoUsuario, Rol, ClaveDeEstadoPlan } from './index';

/**
 * Verificación de incompatibilidad de tipos entre catálogos a nivel de compilador TypeScript.
 * Este archivo demuestra que:
 * 1. Asignar un catálogo a otro distinto produce un error de compilación.
 * 2. Asignar una `key` inválida a un catálogo produce un error de compilación.
 *
 * No es una suite de Vitest y `pnpm test` no lo ejecuta: se verifica solo, al
 * compilar, vía `pnpm build`. De ahí el sufijo `.type-check` y no `.test`.
 */

const estadoUsuarioValido: EstadoUsuario = {
  id: 1,
  createdAt: '2026-08-18T00:00:00Z',
  updatedAt: '2026-08-18T00:00:00Z',
  deletedAt: null,
  nombre: 'Activo',
  key: 'activo',
  descripcion: 'Usuario activo en el sistema',
};

// 1. Incompatibilidad entre catálogos: EstadoUsuario no es asignable a Rol
// @ts-expect-error - EstadoUsuario no es asignable a Rol debido a la incompatibilidad de key ('activo' vs 'usuario' | 'administrador')
export const _rolInvalido: Rol = estadoUsuarioValido;

// 2. Clave inválida en catálogo: 'confirmadoo' no es una clave válida para EstadoPlan
// @ts-expect-error - 'confirmadoo' no es un valor permitido en ClaveDeEstadoPlan ('generado' | 'seleccionado' | 'confirmado' | 'finalizado' | 'cancelado')
export const _claveEstadoPlanInvalida: ClaveDeEstadoPlan = 'confirmadoo';
