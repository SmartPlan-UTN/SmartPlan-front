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
 * Rol del sistema (CU57, CU62).
 * Keys previstas: 'usuario', 'administrador'.
 */
export type Rol = EntidadCatalogo;

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
 * Estado de la cuenta de un usuario (CU2, CU7, CU57).
 * Keys previstas: 'activo', 'suspendido', 'baneado'.
 */
export type EstadoUsuario = EntidadCatalogo;

/**
 * Categoría preferida por un usuario (CU8, CU18, CU21). Relación N:M entre Usuario y Categoria.
 */
export interface PreferenciaUsuario extends EntidadBase {
  idUsuario: number;
  idCategoria: number;
  usuario?: Usuario;
  categoria?: Categoria;
}
