/**
 * Who an activity suits and its mood (SmartPlan-back `src/catalog/taxonomy.ts`,
 * #135). Keys are API values; `src/lib/occasions.ts` holds the Spanish labels.
 */
export const OCCASION_KEYS = [
  'romantic',
  'friends',
  'family',
  'kids',
  'solo',
  'big_group',
  'quiet',
  'party',
  'outdoor',
  'indoor',
  'adventure',
  'special',
] as const;

export type Occasion = (typeof OCCASION_KEYS)[number];

/** `who` occasions filter strictly; `mood` ones rank. */
export type OccasionGroup = 'who' | 'mood';
