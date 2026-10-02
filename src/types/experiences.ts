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
  /** `null` when there is none or moderation took it down. */
  comment: string | null;
  /** When the outing was done. */
  completedAt: string | null;
  author: { alias: string; avatarUrl: string | null };
  photos: MediaImage[];
}

export interface CommunityExperiencesSummary {
  averageRating: number;
  experienceCount: number;
  photoCount: number;
  /** The most recent photos across every experience. */
  photos: MediaImage[];
}

/** `GET /plans/:id/experiences`: a page of experiences plus the summary. */
export interface CommunityExperiencesPage extends PaginatedResult<CommunityExperience> {
  summary: CommunityExperiencesSummary;
}

/** Moderation state of shared content; `unreviewed` is already public. */
export type CommunityContentStatus = 'unreviewed' | 'approved' | 'rejected';

export interface AdminExperiencePhoto extends MediaImage {
  communityStatus: CommunityContentStatus;
  communityReason: string | null;
}

/** A shared experience in the moderation queue. Matches `AdminExperienceDto`. */
export interface AdminExperience {
  id: number;
  rating: number;
  tags: FeedbackTag[];
  comment: string | null;
  commentStatus: CommunityContentStatus | null;
  commentModerationReason: string | null;
  shared: boolean;
  sharedAt: string | null;
  completedAt: string | null;
  outingId: number;
  plan: { id: number; title: string } | null;
  author: { id: number; name: string; lastName: string };
  photos: AdminExperiencePhoto[];
}

/** The two queues of `GET /admin/experiences`. */
export type ExperienceModerationQueue = 'unreviewed' | 'rejected';

export interface AdminExperiencesQuery {
  status?: ExperienceModerationQueue;
  page?: number;
  limit?: number;
}

export type AdminExperiencesResult = PaginatedResult<AdminExperience>;

/** A rejection always carries the reason the author is told. */
export type ModerateExperienceContentInput =
  | { status: 'approved' }
  | { status: 'rejected'; reason: string };

export type AdminExperienceCounts = Record<ExperienceModerationQueue, number>;
