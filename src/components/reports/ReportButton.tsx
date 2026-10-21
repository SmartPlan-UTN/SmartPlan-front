"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icon } from "@/components/ui";
import { useSession } from "@/lib/auth";
import { loginRoute } from "@/lib/routes";

import styles from "./reports.module.css";

export interface ReportButtonProps {
  /** The viewer's own content cannot be reported, so there is no button. */
  isOwn: boolean;
  /** Accessible name, e.g. "Denunciar valoración de Ana P.". */
  label: string;
  /** Opens the report dialog of the surrounding `useContentReporter`. */
  onRequest: () => void;
  /** `overlay` sits on top of a photo. */
  tone?: "plain" | "overlay";
}

/**
 * The flag that starts a report (#156). Without a session it leads to the
 * login and back here, instead of opening a dialog that would fail.
 */
export function ReportButton({ isOwn, label, onRequest, tone = "plain" }: ReportButtonProps) {
  const { status } = useSession();
  const pathname = usePathname();
  const className = tone === "overlay" ? `${styles.trigger} ${styles.overlay}` : styles.trigger;

  if (isOwn || status === "loading") return null;

  if (status === "anonymous") {
    return (
      <Link
        href={loginRoute(pathname)}
        className={className}
        aria-label={`${label}: iniciá sesión`}
        title="Iniciá sesión para denunciar"
      >
        <Icon name="flag" size={15} aria-hidden="true" />
      </Link>
    );
  }

  return (
    <button type="button" className={className} aria-label={label} title="Denunciar" onClick={onRequest}>
      <Icon name="flag" size={15} aria-hidden="true" />
    </button>
  );
}
