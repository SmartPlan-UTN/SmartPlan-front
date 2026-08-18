import { EntidadBase } from './common';
import type { Usuario } from './usuarios';

/**
 * Acciones posibles registradas en auditoría.
 */
export type AccionAuditoria =
  | 'crear'
  | 'actualizar'
  | 'eliminar'
  | 'iniciar_sesion'
  | 'cerrar_sesion';

/**
 * Registro de auditoría del sistema.
 */
export interface RegistroAuditoria extends EntidadBase {
  accion: AccionAuditoria;
  entidadAfectada: string;
  idEntidadAfectada: number;
  original: Record<string, unknown> | null;
  cambios: Record<string, unknown> | null;
}

/**
 * Parámetro configurable del sistema.
 */
export interface ParametroSistema extends EntidadBase {
  nombre: string;
  valor: number;
  descripcion: string | null;
}

/**
 * Notificación dirigida a un usuario.
 */
export interface Notificacion extends EntidadBase {
  idUsuario: number;
  titulo: string;
  mensaje: string;
  usuario?: Usuario;
}

