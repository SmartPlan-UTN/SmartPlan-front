import { EntidadBase } from './common';
import type { Lugar } from './lugares';
import type { Categoria } from './categorias';

/**
 * Experiencia concreta del catálogo (CU9-CU11, CU14, CU50, CU53).
 */
export interface Actividad extends EntidadBase {
  nombre: string;
  descripcion: string;
  costoEstimado: number;
  duracionEstimada: number;
  categorias?: ActividadCategoria[];
  lugares?: ActividadLugar[];
}

/**
 * Ubicación de una actividad (CU14, CU16, CU50). Relación N:M entre Actividad y Lugar.
 */
export interface ActividadLugar extends EntidadBase {
  idActividad: number;
  idLugar: number;
  latitud: number | null;
  longitud: number | null;
  observaciones: string | null;
  actividad?: Actividad;
  lugar?: Lugar;
}

/**
 * Categoría de una actividad (CU10, CU53). Relación N:M entre Actividad y Categoria.
 */
export interface ActividadCategoria extends EntidadBase {
  idActividad: number;
  idCategoria: number;
  actividad?: Actividad;
  categoria?: Categoria;
}

