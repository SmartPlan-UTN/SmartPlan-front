export type MediaTarget = 'activity' | 'place' | 'plan' | 'rating' | 'feedback';

/**
 * Where a card's `imageUrl` comes from (SmartPlan-back#102): a photo someone
 * uploaded, or a Google Places photo that must be attributed to Google Maps.
 */
export type ImageSource = 'uploaded' | 'google_maps';

/** An author Google asks us to credit next to one of its place photos. */
export interface PhotoAuthor {
  displayName: string;
  uri: string | null;
}

/** Attribution that travels with a provider photo's response headers. */
export interface ImageAttribution {
  provider: 'google_maps';
  authors: PhotoAuthor[];
}

export interface MediaImage {
  id: number;
  url: string;
  isPrimary: boolean;
  displayOrder: number;
  createdAt: string;
  /**
   * Only on the owner's own outing photos (#106): moderation took this one
   * down from the community, so it is no longer shown there.
   */
  communityHidden?: true;
}

export interface AvatarImage {
  id: number;
  url: string;
  createdAt: string;
}
