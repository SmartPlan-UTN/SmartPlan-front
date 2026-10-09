"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { listNotifications, markNotificationAsRead } from "@/lib/api";
import type { AppNotification } from "@/types";

/** The reminder is a day-scale event: a minute of delay is invisible. */
export const NOTIFICATIONS_POLL_MS = 60_000;

const RECENT_LIMIT = 10;

export interface UseNotificationsResult {
  notifications: AppNotification[];
  unreadCount: number;
  /** Marks one as read and updates the badge without waiting for a poll. */
  markAsRead: (id: number) => Promise<void>;
  refresh: () => void;
}

/**
 * The signed-in user's in-app notifications (#130), such as the 24 h
 * feedback reminder of an outing (CU23). Polls while `enabled` and whenever
 * the tab regains focus; a failed poll keeps the last known list — a missing
 * badge for a minute is better than an error in the navbar.
 */
export function useNotifications(enabled: boolean): UseNotificationsResult {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const requestId = useRef(0);

  const load = useCallback(() => {
    const id = ++requestId.current;
    listNotifications({ limit: RECENT_LIMIT })
      .then((result) => {
        if (id !== requestId.current) return;
        setNotifications(result.data);
        setUnreadCount(result.unreadCount);
      })
      .catch(() => {
        // Keep the last known state; the next poll retries.
      });
  }, []);

  useEffect(() => {
    if (!enabled) return;

    load();
    const timer = window.setInterval(load, NOTIFICATIONS_POLL_MS);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      // A response still in flight belongs to the previous session.
      requestId.current += 1;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [enabled, load]);

  const markAsRead = useCallback(
    async (id: number) => {
      const target = notifications.find(
        (notification) => notification.id === id,
      );
      if (target && target.readAt === null) {
        const readAt = new Date().toISOString();
        setNotifications((current) =>
          current.map((notification) =>
            notification.id === id ? { ...notification, readAt } : notification,
          ),
        );
        setUnreadCount((count) => Math.max(0, count - 1));
      }
      try {
        await markNotificationAsRead(id);
      } catch {
        // The next poll brings the server's truth back.
      }
    },
    [notifications],
  );

  // Signed out: whatever was loaded belonged to the previous session.
  return enabled
    ? { notifications, unreadCount, markAsRead, refresh: load }
    : { notifications: [], unreadCount: 0, markAsRead, refresh: load };
}
