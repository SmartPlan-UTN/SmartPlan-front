import type { DashboardMetrics, DashboardRange } from '@/types';
import { apiClient } from './client';

/** Loads the REP-01 dashboard metrics for the selected range (CU58). */
export async function getDashboardMetrics(
  range: DashboardRange
): Promise<DashboardMetrics> {
  return apiClient.get<DashboardMetrics>('/admin/metrics', {
    params: { range },
  });
}
