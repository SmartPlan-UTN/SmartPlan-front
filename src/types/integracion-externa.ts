import { EntidadBase, EntidadCatalogo } from './common';

/**
 * Claves previstas para el proveedor de servicios externos (CU48-CU52).
 */
export type ClaveDeProveedorExterno = 'google_maps' | 'gemini';

/**
 * Proveedor de servicios externos (CU48-CU52).
 */
export interface ProveedorExterno extends EntidadCatalogo<ClaveDeProveedorExterno> {
  key: ClaveDeProveedorExterno;
  activo: boolean;
  sincronizaciones?: SincronizacionExterna[];
}

/**
 * Registro de sincronización con un proveedor externo (CU49, CU51, CU52).
 */
export interface SincronizacionExterna extends EntidadBase {
  idProveedorExterno: number;
  entidad: string;
  estado: string;
  fechaInicio: string;
  fechaFin: string | null;
  cantidadRegistros: number;
  mensajeError: string | null;
  proveedor?: ProveedorExterno;
}

