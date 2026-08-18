import { EntidadBase, EntidadCatalogo } from './common';

/**
 * Categoría de actividades (CU10, CU54).
 */
export interface Categoria extends EntidadBase {
  nombre: string;
  descripcion: string | null;
  idEstadoCategoria: number;
  estado?: EstadoCategoria;
}

/**
 * Claves previstas para el estado de una categoría (CU54).
 */
export type ClaveDeEstadoCategoria = 'activa' | 'inactiva';

/**
 * Estado de una categoría (CU54).
 */
export interface EstadoCategoria extends EntidadCatalogo<ClaveDeEstadoCategoria> {
  key: ClaveDeEstadoCategoria;
}
