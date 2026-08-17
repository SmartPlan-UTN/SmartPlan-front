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
 * Estado de una categoría (CU54).
 * Keys previstas: 'activa', 'inactiva'.
 */
export type EstadoCategoria = EntidadCatalogo;
