import type { AppNotification, NotificationList } from '@/types';
import { apiClient } from './client';

/**
 * The caller's in-app notifications, newest first, plus `unreadCount`.
 * Backend contract: `GET /users/me/notifications`.
 */
export async function listNotifications(
  params: { unread?: boolean; page?: number; limit?: number } = {}
): Promise<NotificationList> {
  return apiClient.get<NotificationList>('/users/me/notifications', {
    params,
  });
}

/** Idempotent. Backend contract: `PATCH /users/me/notifications/:id/read`. */
export async function markNotificationAsRead(
  id: number
): Promise<AppNotification> {
  return apiClient.patch<AppNotification>(`/users/me/notifications/${id}/read`);
}
