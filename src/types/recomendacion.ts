import { EntidadBase, EntidadCatalogo } from './common';
import type { Usuario } from './usuarios';
import type { Departamento } from './lugares';
import type { Categoria } from './categorias';

/**
 * Tipo de salida para la generación de un plan (CU17, CU19).
 */
export type TipoSalida = EntidadCatalogo;

/**
 * Parámetros solicitados por el usuario para generar un plan (CU17, CU19, CU31).
 */
export interface SolicitudPlan extends EntidadBase {
  idUsuario: number;
  presupuesto: number;
  idDepartamento: number;
  duracionDisponible: number;
  fechaSolicitud: string;
  idTipoSalida: number;
  idEstadoSolicitud: number;
  observaciones: string | null;
  usuario?: Usuario;
  departamento?: Departamento;
  tipoSalida?: TipoSalida;
  estado?: EstadoSolicitud;
  categorias?: SolicitudPlanCategoria[];
}

/**
 * Categoría elegida dentro de una solicitud (CU17, CU19). Relación N:M entre SolicitudPlan y Categoria.
 */
export interface SolicitudPlanCategoria extends EntidadBase {
  idSolicitudPlan: number;
  idCategoria: number;
  descripcion: string | null;
  solicitud?: SolicitudPlan;
  categoria?: Categoria;
}

/**
 * Devolución del usuario tras realizar un plan (CU21, CU23).
 */
export interface Retroalimentacion extends EntidadBase {
  titulo: string;
  descripcion: string | null;
  costoReal: number | null;
  duracionReal: number | null;
  idSolicitudPlan: number;
  idEstadoRetroalimentacion: number;
  solicitud?: SolicitudPlan;
  estado?: EstadoRetroalimentacion;
}

/**
 * Estado del procesamiento de una solicitud de plan (CU17, CU19, CU31).
 * Keys previstas: 'pendiente', 'en_proceso', 'generada', 'fallida'.
 */
export type EstadoSolicitud = EntidadCatalogo;

/**
 * Estado del procesamiento de una retroalimentación (CU21, CU23).
 * Keys previstas: 'pendiente', 'procesada', 'descartada'.
 */
export type EstadoRetroalimentacion = EntidadCatalogo;
