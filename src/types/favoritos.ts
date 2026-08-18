import { EntidadBase } from './common';
import type { Usuario } from './usuarios';
import type { Actividad } from './actividades';
import type { Plan } from './planes';

/**
 * Lista de favoritos de un usuario (CU15, CU39-CU43).
 */
export interface ListaFavorito extends EntidadBase {
  idUsuario: number;
  usuario?: Usuario;
  actividades?: ActividadFavorito[];
  planes?: PlanFavorito[];
}

/**
 * Actividad guardada en lista de favoritos (CU15, CU39, CU41). Relación N:M entre ListaFavorito y Actividad.
 */
export interface ActividadFavorito extends EntidadBase {
  idListaFavorito: number;
  idActividad: number;
  lista?: ListaFavorito;
  actividad?: Actividad;
}

/**
 * Plan guardado en lista de favoritos (CU40, CU42, CU43). Relación N:M entre ListaFavorito y Plan.
 */
export interface PlanFavorito extends EntidadBase {
  idListaFavorito: number;
  idPlan: number;
  lista?: ListaFavorito;
  plan?: Plan;
}

