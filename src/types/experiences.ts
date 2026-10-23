import type { PaginatedResult } from './common';
import type { MediaImage } from './media';
import type { FeedbackTag } from './recommendation';

/**
 * One person's shared experience of a published plan (#106), as the
 * community sees it. Matches `ExperienceDto` in `SmartPlan-back`.
 */
export interface CommunityExperience {
  id: number;
  rating: number;
  tags: FeedbackTag[];
  /** `null` when there is none, or when it is hidden after a report (#156). */
  comment: string | null;
  /** The viewer wrote it, so they cannot report it (#156). */
  isOwn: boolean;
  /** When the outing was done. */
  completedAt: string | null;
  author: { alias: string; username?: string; avatarUrl: string | null };
  inspiredBy?: { id: number; title: string; creatorUsername: string | null } | null;
  photos: MediaImage[];
}

export interface CommunityExperiencesSummary {
  averageRating: number;
  experienceCount: number;
  photoCount: number;
  /** The most recent photos across every experience. */
  photos: CommunityPhoto[];
}

/** A photo of the community gallery; reportable unless the viewer took it. */
export interface CommunityPhoto extends MediaImage {
  isOwn: boolean;
}

/** `GET /plans/:id/experiences`: a page of experiences plus the summary. */
export interface CommunityExperiencesPage extends PaginatedResult<CommunityExperience> {
  summary: CommunityExperiencesSummary;
}

export interface CommunityCreator {
  username: string;
  bio: string | null;
  avatarUrl: string | null;
  planCount: number;
  experienceCount: number;
}

export interface CommunityPlan {
  id: number;
  title: string;
  description: string | null;
  estimatedTotalCost: number | null;
  estimatedTotalCostMax: number | null;
  priceCompleteness: string | null;
  estimatedTotalDuration: number;
  imageUrl: string | null;
  authorUsername?: string | null;
}
