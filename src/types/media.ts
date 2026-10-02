export type MediaTarget = 'activity' | 'place' | 'plan' | 'rating' | 'feedback';

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
