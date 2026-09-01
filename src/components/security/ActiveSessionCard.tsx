"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button, Icon } from "@/components/ui";
import { getCurrentSession, type CurrentSession } from "@/lib/auth/api";
import { useSession } from "@/lib/auth";
import { ROUTES } from "@/lib/routes";
import { formatRelativeTime } from "@/lib/utils";

import styles from "./security.module.css";

type LoadStatus = "loading" | "loaded" | "error";

/**
 * "Sesiones activas" footer card, per the v2 system design's `Security.jsx`
 * — scoped to what `SmartPlan-back` actually knows. The prototype shows a
 * fake multi-device list ("iPhone 16 Pro · Buenos Aires · Ahora") with a
 * "Cerrar todas" action; there is no endpoint to list other sessions or
 * devices for the account, and `user_session` tracks no user-agent at all,
 * only `ip`/`startedAt` (`GET /sessions/me`). So this reports the one
 * session it can — the one making the request — as "Sesión actual", and
 * "Cerrar sesión" is the real CU4 `DELETE /sessions` (`useSession().
 * logout()`, same as the navbar's), singular because there's only ever one
 * session to close here.
 *
 * Renders nothing while loading or on a load failure: this card is a
 * secondary "by the way" panel below the actual password form, not worth
 * its own loading skeleton or error banner.
 */
export function ActiveSessionCard() {
  const { logout } = useSession();
  const router = useRouter();
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [session, setSession] = useState<CurrentSession | null>(null);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const current = await getCurrentSession();
        if (!ignore) {
          setSession(current);
          setStatus("loaded");
        }
      } catch {
        if (!ignore) {
          setStatus("error");
        }
      }
    }

    void load();
    return () => {
      ignore = true;
    };
  }, []);

  async function handleClose() {
    setClosing(true);
    try {
      await logout();
      router.replace(ROUTES.login);
    } catch {
      // Best-effort, same as the navbar's confirm logout: whatever failed
      // (network, an already-gone session), re-enable the button instead
      // of leaving it stuck on "Cerrando…".
      setClosing(false);
    }
  }

  if (status !== "loaded" || !session) {
    return null;
  }

  return (
    <div className={styles.sessionCard}>
      <div className={styles.sessionInfo}>
        <span className={styles.sessionIcon} aria-hidden="true">
          <Icon name="smartphone" size={18} />
        </span>
        <div>
          <p className={`sp-small ${styles.sessionTitle}`}>Sesión actual</p>
          <p className={`sp-small ${styles.sessionSubtitle}`}>
            {session.ip ?? "IP desconocida"} · {formatRelativeTime(session.startedAt)}
          </p>
        </div>
      </div>
      <Button
        type="button"
        variant="ghostLight"
        size="sm"
        className={styles.closeSessionButton}
        onClick={() => {
          void handleClose();
        }}
        disabled={closing}
      >
        {closing ? "Cerrando…" : "Cerrar sesión"}
      </Button>
    </div>
  );
}
