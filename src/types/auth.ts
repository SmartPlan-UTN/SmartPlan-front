import { EntidadBase } from './common';
import type { Usuario } from './usuarios';

/**
 * Sesión abierta por un usuario (CU1, CU4).
 * Nota: tokenHash no se expone en el frontend por seguridad.
 */
export interface SesionUsuario extends EntidadBase {
  idUsuario: number;
  fechaInicio: string;
  activa: boolean;
  ip: string | null;
  usuario?: Usuario;
}

/**
 * Solicitud de recuperación de contraseña (CU3).
 * Nota: tokenHash no se expone en el frontend por seguridad.
 */
export interface RecuperacionContrasena extends EntidadBase {
  idUsuario: number;
  fechaCreacion: string;
  fechaExpiracion: string;
  usado: boolean;
  usuario?: Usuario;
}

