import type {
  AdminUser,
  AdminUserMetrics,
  AdminUsersReportQuery,
  CreateAdminUserInput,
  AdminUsersQuery,
  AdminUsersResult,
  DashboardMetrics,
  DashboardRange,
  UserStatusKey,
  UpdateAdminUserInput,
  AdminActivitiesQuery,
  AdminActivitiesResult,
  AdminActivity,
  AdminActivityInput,
  UpdateAdminActivityInput,
  AdminPlansQuery,
  AdminPlansResult,
  AdminPlan,
  UpdateAdminPlanInput,
} from '@/types';
import { apiClient } from './client';

/** Loads the REP-01 dashboard metrics for the selected range (CU58). */
export async function getDashboardMetrics(
  range: DashboardRange,
): Promise<DashboardMetrics> {
  return apiClient.get<DashboardMetrics>("/admin/metrics", {
    params: { range },
  });
}

function reportFilename(disposition: unknown, fallback: string): string {
  if (typeof disposition !== "string") return fallback;
  const extended =
    /(?:^|;)\s*filename\*\s*=\s*(?:"([^"\r\n]*)"|([^;\r\n]*))/i.exec(
      disposition,
    );
  const regular =
    /(?:^|;)\s*filename\s*=\s*(?:"([^"\r\n]*)"|([^;\r\n]*))/i.exec(disposition);
  let filename: string | undefined;
  if (extended) {
    const encoded = /^UTF-8'[^']*'(.*)$/i.exec(
      (extended[1] ?? extended[2]).trim(),
    );
    if (encoded) {
      try {
        filename = decodeURIComponent(encoded[1]);
      } catch {
        /* Fall back to the regular filename. */
      }
    }
  }
  filename ||= regular ? (regular[1] ?? regular[2]).trim() : undefined;
  if (!filename) return fallback;
  const basename = filename.replaceAll("\\", "/").split("/").at(-1) ?? "";
  const safe = Array.from(basename)
    .filter(
      (character) =>
        character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127,
    )
    .join("")
    .replace(/[<>:"|?*]/g, "")
    .replace(/[. ]+$/g, "")
    .trim();
  return safe && safe !== "." && safe !== ".." ? safe : fallback;
}

/** Requests a session-authenticated CSV report, preserving its server filename (CU58). */
export async function downloadDashboardMetrics(
  range: DashboardRange,
): Promise<{ blob: Blob; filename: string }> {
  const response = await apiClient.request<Blob>({
    method: "GET",
    url: "/admin/metrics/export",
    params: { range, format: "csv" },
    responseType: "blob",
  });
  const fallback = `smartplan-metricas-${range}-${new Date().toISOString().slice(0, 10)}.csv`;
  return {
    blob: response.data,
    filename: reportFilename(response.headers["content-disposition"], fallback),
  };
}

/** Lists users for PAN 19, including search, status filtering, and pagination. */
export async function listAdminUsers(
  params: AdminUsersQuery = {},
): Promise<AdminUsersResult> {
  return apiClient.get<AdminUsersResult>("/admin/users", { params });
}

/** Suspends, bans, or reactivates one user account (CU57). */
export async function changeAdminUserStatus(
  id: number,
  status: UserStatusKey,
): Promise<AdminUser> {
  return apiClient.patch<AdminUser>(`/admin/users/${id}/status`, { status });
}

/** Updates the editable profile, role, and status fields of an administered user. */
/** Creates an account from the panel (CU57); requires `user.create`. */
export async function createAdminUser(
  input: CreateAdminUserInput,
): Promise<AdminUser> {
  return apiClient.post<AdminUser>("/admin/users", input);
}

export async function updateAdminUser(
  id: number,
  input: UpdateAdminUserInput,
): Promise<AdminUser> {
  return apiClient.patch<AdminUser>(`/admin/users/${id}`, input);
}

/** Deletes (soft) a user account and revokes its active sessions (CU57). */
export async function deleteAdminUser(id: number): Promise<void> {
  await apiClient.delete<void>(`/admin/users/${id}`);
}
/** Lists the activity catalog for PAN 21 (CU53). */
export async function listAdminActivities(
  params: AdminActivitiesQuery = {},
): Promise<AdminActivitiesResult> {
  return apiClient.get<AdminActivitiesResult>("/admin/activities", { params });
}

export async function createAdminActivity(
  input: AdminActivityInput,
): Promise<AdminActivity> {
  return apiClient.post<AdminActivity>("/admin/activities", input);
}

export async function updateAdminActivity(
  id: number,
  input: UpdateAdminActivityInput,
): Promise<AdminActivity> {
  return apiClient.patch<AdminActivity>(`/admin/activities/${id}`, input);
}

export async function deleteAdminActivity(id: number): Promise<void> {
  return apiClient.delete<void>(`/admin/activities/${id}`);
}

/** Lists every user's plans for PAN 22 (CU60). */
export async function listAdminPlans(
  params: AdminPlansQuery = {},
): Promise<AdminPlansResult> {
  return apiClient.get<AdminPlansResult>("/admin/plans", { params });
}

export async function updateAdminPlan(
  id: number,
  input: UpdateAdminPlanInput,
): Promise<AdminPlan> {
  return apiClient.patch<AdminPlan>(`/admin/plans/${id}`, input);
}

export async function deleteAdminPlan(id: number): Promise<void> {
  return apiClient.delete<void>(`/admin/plans/${id}`);
}

/** REP-02 header metrics for a range, computed by the backend. */
export async function getAdminUserMetrics(
  range: DashboardRange,
): Promise<AdminUserMetrics> {
  return apiClient.get<AdminUserMetrics>("/admin/users/metrics", {
    params: { range },
  });
}

/**
 * Downloads the REP-02 users report (PDF or CSV) with the table's current
 * search and status filter, preserving the server filename.
 */
export async function downloadAdminUsersReport(
  query: AdminUsersReportQuery,
): Promise<{ blob: Blob; filename: string }> {
  const response = await apiClient.request<Blob>({
    method: "GET",
    url: "/admin/users/export",
    params: query,
    responseType: "blob",
  });
  const fallback = `smartplan-usuarios-${query.range}-${new Date().toISOString().slice(0, 10)}.${query.format}`;
  return {
    blob: response.data,
    filename: reportFilename(response.headers["content-disposition"], fallback),
  };
}
