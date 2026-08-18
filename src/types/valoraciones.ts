import { EntidadBase } from './common';
import type { Actividad } from './actividades';
import type { Retroalimentacion } from './recomendacion';

/**
 * Puntaje a una actividad (CU44-CU47, CU55).
 */
export interface Valoracion extends EntidadBase {
  puntaje: number;
  idActividad: number;
  idRetroalimentacion: number | null;
  actividad?: Actividad;
  retroalimentacion?: Retroalimentacion | null;
}

