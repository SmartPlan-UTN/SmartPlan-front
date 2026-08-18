import { EntidadBase } from './common';
import type { Usuario } from './usuarios';
import type { Actividad } from './actividades';

/**
 * Agrupación personalizada de actividades creada por el usuario (CU32-CU38).
 */
export interface Coleccion extends EntidadBase {
  idUsuario: number;
  nombreColeccion: string;
  fechaGuardado: string;
  usuario?: Usuario;
  actividades?: ColeccionFavorito[];
}

/**
 * Actividad perteneciente a una colección (CU35-CU37). Relación N:M entre Coleccion y Actividad.
 */
export interface ColeccionFavorito extends EntidadBase {
  idColeccion: number;
  idActividad: number;
  orden: number | null;
  coleccion?: Coleccion;
  actividad?: Actividad;
}

