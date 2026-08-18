import { EntidadBase, EntidadCatalogo } from './common';
import type { Categoria } from './categorias';

/**
 * Usuario del sistema (CU2, CU5, CU6, CU7, CU57).
 * Nota: passwordHash no se expone en el frontend por seguridad.
 */
export interface Usuario extends EntidadBase {
  nombre: string;
  apellido: string;
  email: string;
  idRol: number;
  idEstadoUsuario: number;
  rol?: Rol;
  estado?: EstadoUsuario;
  preferencias?: PreferenciaUsuario[];
}

/**
 * Claves previstas para el rol de usuario (CU57, CU62).
 */
export type ClaveDeRol = 'usuario' | 'administrador';

/**
 * Rol del sistema (CU57, CU62).
 */
export interface Rol extends EntidadCatalogo<ClaveDeRol> {
  key: ClaveDeRol;
}

/**
 * Permiso concreto sobre un recurso del sistema (CU61).
 * Formato de key: 'recurso.accion'.
 */
export type Permiso = EntidadCatalogo;

/**
 * Asignación de permiso a rol (CU61). Relación N:M entre Rol y Permiso.
 */
export interface RolPermiso extends EntidadBase {
  idRol: number;
  idPermiso: number;
  rol?: Rol;
  permiso?: Permiso;
}

/**
 * Claves previstas para el estado de cuenta de un usuario (CU2, CU7, CU57).
 */
export type ClaveDeEstadoUsuario = 'activo' | 'suspendido' | 'baneado';

/**
 * Estado de la cuenta de un usuario (CU2, CU7, CU57).
 */
export interface EstadoUsuario extends EntidadCatalogo<ClaveDeEstadoUsuario> {
  key: ClaveDeEstadoUsuario;
}

/**
 * Categoría preferida por un usuario (CU8, CU18, CU21). Relación N:M entre Usuario y Categoria.
 */
export interface PreferenciaUsuario extends EntidadBase {
  idUsuario: number;
  idCategoria: number;
  usuario?: Usuario;
  categoria?: Categoria;
}
