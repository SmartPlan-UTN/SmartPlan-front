export type MediaTarget = 'activity' | 'place' | 'plan' | 'rating' | 'feedback';

export interface MediaImage {
  id: number;
  url: string;
  isPrimary: boolean;
  displayOrder: number;
  createdAt: string;
}

export interface AvatarImage {
  id: number;
  url: string;
  createdAt: string;
}
