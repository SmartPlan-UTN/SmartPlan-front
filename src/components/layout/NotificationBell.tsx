"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { Icon } from "@/components/ui";
import { useNotifications } from "@/hooks";
import { useSession } from "@/lib/auth";
import { outingDetailRoute } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { AppNotification } from "@/types";

import styles from "./notifications.module.css";

const timeFormatter = new Intl.RelativeTimeFormat("es-AR", {
  numeric: "auto",
});

function relativeTime(iso: string): string {
  const minutes = Math.round((new Date(iso).getTime() - Date.now()) / 60_000);
  if (Math.abs(minutes) < 60) return timeFormatter.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return timeFormatter.format(hours, "hour");
  return timeFormatter.format(Math.round(hours / 24), "day");
}

/** Where a notification leads; `null` when it points nowhere we render. */
function destination(notification: AppNotification): string | null {
  if (notification.resourceType === "outing" && notification.resourceId) {
    return outingDetailRoute(notification.resourceId);
  }
  return null;
}

/**
 * In-app notifications (#130). Today the only one is the 24 h feedback
 * reminder of an outing marked as done (CU23): opening it marks it read and
 * goes straight to that outing, where the feedback is still open — the
 * reminder never closes it.
 *
 * Same disclosure pattern as `UserMenu`: a button and a panel of plain
 * buttons, closed with Escape (focus returns to the trigger) or an outside
 * click. Rendered only with a session.
 */
export function NotificationBell() {
  const { authenticated } = useSession();
  const router = useRouter();
  const { notifications, unreadCount, markAsRead } =
    useNotifications(authenticated);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;

    const onClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  if (!authenticated) return null;

  async function openNotification(notification: AppNotification) {
    close();
    await markAsRead(notification.id);
    const target = destination(notification);
    if (target) router.push(target);
  }

  const label =
    unreadCount > 0
      ? `Notificaciones, ${unreadCount} sin leer`
      : "Notificaciones";

  return (
    <div className={styles.bell} ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-label={label}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((isOpen) => !isOpen)}
      >
        <Icon name="bell" size={19} aria-hidden="true" />
        {unreadCount > 0 ? (
          <span className={styles.badge} aria-hidden="true">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className={styles.panel} id={panelId}>
          <p className={styles.panelTitle}>Notificaciones</p>
          {notifications.length === 0 ? (
            <p className={styles.empty}>No tenés notificaciones por ahora.</p>
          ) : (
            <ul className={styles.list}>
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <button
                    type="button"
                    className={cn(
                      styles.item,
                      notification.readAt === null && styles.itemUnread,
                    )}
                    onClick={() => void openNotification(notification)}
                  >
                    <span className={styles.itemTitle}>
                      {notification.title}
                    </span>
                    <span className={styles.itemMessage}>
                      {notification.message}
                    </span>
                    <time
                      className={styles.itemTime}
                      dateTime={notification.createdAt}
                    >
                      {relativeTime(notification.createdAt)}
                    </time>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
