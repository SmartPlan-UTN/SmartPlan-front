import type { PaginatedResult } from './common';
import type { MediaImage } from './media';
import type { FeedbackTag } from './recommendation';
import type { PriceCompleteness } from './pricing';

/**
 * One person's shared experience of a published plan (#106), as the
 * community sees it. Matches `ExperienceDto` in `SmartPlan-back`.
 */
export interface CommunityExperience {
  id: number;
  rating: number;
  likeCount?: number;
  /** Distinct completed outings explicitly attached to this review. */
  visitCount?: number;
  likedByViewer?: boolean;
  tags: FeedbackTag[];
  /** `null` when there is none, or when it is hidden after a report (#156). */
  comment: string | null;
  /** The viewer wrote it, so they cannot report it (#156). */
  isOwn: boolean;
  /** When the outing was done. */
  completedAt: string | null;
  author: { alias: string; username?: string; avatarUrl: string | null };
  inspiredBy?: { id: number; title: string; creatorUsername: string | null } | null;
  /** The published idea it was lived from; `null` when it is not public. */
  plan?: { id: number; title: string; creatorUsername: string | null } | null;
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
  likeCount?: number;
  /** When they joined. */
  memberSince?: string;
  /** Published plans by other people adapted from theirs. */
  adaptationsReceived?: number;
  /** Categories their published plans lean to; derived, never declared. */
  tasteTags?: string[];
}

/** A person with something public, as the hub lists them. */
export type CommunityCreatorSummary = Pick<CommunityCreator, "username" | "bio" | "avatarUrl" | "planCount" | "experienceCount"> & { likeCount?: number };

export interface CommunityPlan {
  id: number;
  title: string;
  description: string | null;
  estimatedTotalCost: number | null;
  estimatedTotalCostMax: number | null;
  priceCompleteness?: PriceCompleteness;
  estimatedTotalDuration: number;
  imageUrl: string | null;
  /** `google_maps` photos are credited to Google Maps. */
  imageSource?: 'uploaded' | 'google_maps' | null;
  authorUsername?: string | null;
  authorAvatarUrl?: string | null;
  peopleCount?: number;
  /** Names of the stops, in order. */
  stops?: string[];
  /** Shared experiences lived from it. */
  experienceCount?: number;
  sharedAverageRating?: number | null;
  /** Published plans others adapted from it. */
  adaptationCount?: number;
  inspiredBy?: { id: number; title: string; creatorUsername: string | null } | null;
}

/** Request-ranked public itinerary returned alongside generated proposals. */
export interface CommunityPlanRecommendation extends CommunityPlan {
  currentPriceMin: number | null;
  currentPriceMax: number | null;
  sharedAverageRating: number | null;
  sharedExperienceCount: number;
  latestExperienceAt: string | null;
  decisionGrade: boolean;
  matchReasons: string[];
  uncertainties: string[];
}

export interface ResultRecommendationSource {
  source: "generated" | "community";
  planId: number;
}

export type CommunityFeedFilter = "all" | "plans" | "experiences";
export type CommunityPlanSort = "recent" | "popular" | "highest_rated" | "most_reviewed";
export type CommunityFeedItem =
  | { kind: "plan"; plan: CommunityPlan }
  | { kind: "experience"; experience: CommunityExperience };
