import type {
  ContentReportCounts,
  ContentReportDetail,
  ContentReportsQuery,
  ContentReportsResult,
  CreateContentReportInput,
  ReportableContentType,
  ResolveContentReportInput,
} from '@/types';
import { apiClient } from './client';

/**
 * Reports a rating, or an experience comment or photo (#156). Answers
 * `409 CONTENT_REPORT_DUPLICATE` when the user already reported it and
 * `403 CONTENT_REPORT_OWN_CONTENT` for their own content.
 */
export async function reportContent(input: CreateContentReportInput): Promise<void> {
  await apiClient.post('/content-reports', input);
}

/** The administrator's queue: content with open reports, grouped. */
export async function listContentReports(
  params: ContentReportsQuery = {},
): Promise<ContentReportsResult> {
  return apiClient.get<ContentReportsResult>('/admin/content-reports', { params });
}

/** One reported content with every open report about it. */
export async function getContentReport(
  type: ReportableContentType,
  contentId: number,
): Promise<ContentReportDetail> {
  return apiClient.get<ContentReportDetail>(`/admin/content-reports/${type}/${contentId}`);
}

/** Keeps or removes the content, closing every open report about it. */
export async function resolveContentReport(
  type: ReportableContentType,
  contentId: number,
  input: ResolveContentReportInput,
): Promise<void> {
  await apiClient.patch(`/admin/content-reports/${type}/${contentId}`, input);
}

/**
 * How much content waits in each tab of the queue. There's no counters
 * endpoint, so this reads `pagination.total` from one-row listings, the
 * same way the other administration screens build their badges.
 */
export async function getContentReportCounts(): Promise<ContentReportCounts> {
  const [all, rating, comment, photo] = await Promise.all(
    [undefined, 'rating', 'experience_comment', 'experience_photo'].map((type) =>
      listContentReports({
        ...(type ? { type: type as ReportableContentType } : {}),
        page: 1,
        limit: 1,
      }),
    ),
  );
  return {
    all: all.pagination.total,
    rating: rating.pagination.total,
    experience_comment: comment.pagination.total,
    experience_photo: photo.pagination.total,
  };
}
