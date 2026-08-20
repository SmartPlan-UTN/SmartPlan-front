import { BaseEntity } from './common';
import type { Activity } from './activities';
import type { Feedback } from './recommendation';

/**
 * Puntaje a una activity (CU44-CU47, CU55).
 */
export interface Rating extends BaseEntity {
  puntaje: number;
  idActivity: number;
  idFeedback: number | null;
  activity?: Activity;
  feedback?: Feedback | null;
}
