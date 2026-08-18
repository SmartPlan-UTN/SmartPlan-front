import { EntidadBase, EntidadCatalogo } from './common';
import type { Usuario } from './usuarios';
import type { SolicitudPlan } from './recomendacion';
import type { Actividad } from './actividades';

/**
 * Plan de actividades (CU12, CU13, CU17, CU24-CU31, CU60).
 */
export interface Plan extends EntidadBase {
  titulo: string;
  descripcion: string | null;
  idUsuario: number;
  idSolicitudPlan: number | null;
  idEstadoPlan: number;
  costoTotalEstimado: number;
  duracionTotalEstimada: number;
  usuario?: Usuario;
  solicitud?: SolicitudPlan | null;
  estado?: EstadoPlan;
  detalles?: DetallePlan[];
}

/**
 * Ítem individual de un plan (CU13, CU27-CU30).
 */
export interface DetallePlan extends EntidadBase {
  idPlan: number;
  idActividad: number;
  orden: number;
  costoEstimado: number;
  duracionEstimada: number;
  observacion: string | null;
  plan?: Plan;
  actividad?: Actividad;
}

/**
 * Claves previstas para el estado de un plan (CU22, CU26, CU60).
 */
export type ClaveDeEstadoPlan =
  | 'generado'
  | 'seleccionado'
  | 'confirmado'
  | 'finalizado'
  | 'cancelado';

/**
 * Estado de un plan (CU22, CU26, CU60).
 */
export interface EstadoPlan extends EntidadCatalogo<ClaveDeEstadoPlan> {
  key: ClaveDeEstadoPlan;
}
