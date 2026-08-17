import { EntidadBase, EntidadCatalogo } from './common';

/**
 * Proveedor de servicios externos (CU48-CU52).
 * Keys previstas: 'google_maps', 'openai'.
 */
export interface ProveedorExterno extends EntidadCatalogo {
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

