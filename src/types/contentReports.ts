import type { PaginatedResult, SortDirection } from './common';

/**
 * Report-based moderation (#156): content is published at once, a user's
 * report hides it from everyone but its author, and an administrator keeps
 * it or removes it. A reported plan is the exception: it stays visible until
 * an administrator removes it. Matches `ContentStatus` in `SmartPlan-back`.
 */
export type ContentStatus = 'published' | 'under_review' | 'kept' | 'removed';

/** What can be reported. Matches `ReportableContentType`. */
export type ReportableContentType =
  | 'rating'
  | 'experience_comment'
  | 'experience_photo'
  | 'plan';

export type ReportReason =
  | 'harassment'
  | 'hate_speech'
  | 'sexual_content'
  | 'violence'
  | 'spam'
  | 'other';

/** The reasons in the order the report dialog offers them. */
export const REPORT_REASONS: readonly { value: ReportReason; label: string }[] = [
  { value: 'harassment', label: 'Acoso o insulto' },
  { value: 'hate_speech', label: 'Discurso de odio' },
  { value: 'sexual_content', label: 'Contenido sexual' },
  { value: 'violence', label: 'Amenaza o violencia' },
  { value: 'spam', label: 'Spam o publicidad' },
  { value: 'other', label: 'Otro' },
];

export const REPORT_REASON_LABELS = Object.fromEntries(
  REPORT_REASONS.map(({ value, label }) => [value, label]),
) as Record<ReportReason, string>;

/** The longest report detail or removal reason the backend accepts. */
export const MODERATION_TEXT_MAX_LENGTH = 500;

/** Payload for `POST /content-reports`; `detail` is required for `other`. */
export interface CreateContentReportInput {
  contentType: ReportableContentType;
  contentId: number;
  reason: ReportReason;
  detail?: string;
}

/** Reported content as an administrator reviews it. Matches `ReportedContentDto`. */
export interface ReportedContent {
  type: ReportableContentType;
  id: number;
  status: ContentStatus;
  /** The rating, experience comment or plan description; `null` for a photo. */
  text: string | null;
  /** The rating's or the experience's score; `null` for a photo or plan. */
  score: number | null;
  /** The photo itself; `null` otherwise. */
  imageUrl: string | null;
  createdAt: string;
  author: { id: number; name: string; lastName: string };
  /** The rated activity, the reviewed plan, or the reported plan itself. */
  context: { kind: 'activity' | 'plan'; id: number; title: string };
}

/** One piece of content with open reports. Matches `ContentReportSummaryDto`. */
export interface ContentReportSummary {
  contentType: ReportableContentType;
  contentId: number;
  reportCount: number;
  firstReportedAt: string;
  lastReportedAt: string;
  /** An administrator kept it before, and someone reported it again. */
  previouslyKept: boolean;
  /** `null` when the content no longer exists. */
  content: ReportedContent | null;
}

export interface ContentReportItem {
  id: number;
  reason: ReportReason;
  detail: string | null;
  createdAt: string;
  /** Raised by the system when the old automatic moderation ended. */
  system: boolean;
  /** `null` for a system report, and for a reporter whose account was deleted. */
  reporter: { id: number; name: string; lastName: string } | null;
}

export interface ContentReportDetail extends ContentReportSummary {
  reports: ContentReportItem[];
}

export type ContentReportSortField = 'firstReportedAt' | 'reportCount';

export interface ContentReportsQuery {
  type?: ReportableContentType;
  page?: number;
  limit?: number;
  sortBy?: ContentReportSortField;
  direction?: SortDirection;
}

export type ContentReportsResult = PaginatedResult<ContentReportSummary>;

/** Open content per tab of the administrator's queue; `all` is every type. */
export type ContentReportCounts = Record<ReportableContentType | 'all', number>;

/** Removing always carries the reason the author is told. */
export type ResolveContentReportInput =
  | { decision: 'keep' }
  | { decision: 'remove'; reason: string };
