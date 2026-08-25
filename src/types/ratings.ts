import { BaseEntity } from './common';
import type { Activity } from './activities';
import type { Feedback } from './recommendation';

/**
 * Score given to an activity (CU44-CU47, CU55).
 */
export interface Rating extends BaseEntity {
  score: number;
  idActivity: number;
  idFeedback: number | null;
  activity?: Activity;
  feedback?: Feedback | null;
}
