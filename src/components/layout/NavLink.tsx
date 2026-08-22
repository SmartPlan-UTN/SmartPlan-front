"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icon, type IconName } from "@/components/ui";
import { isActiveRoute } from "@/lib/routes";
import { cn } from "@/lib/utils";

import styles from "./layout.module.css";

export type LinkVariant = "navbar" | "option";

export interface NavLinkProps {
  href: string;
  label: string;
  icon?: IconName;
  /** `navbar` for horizontal navigation, `option` for dropdowns. */
  variant?: LinkVariant;
  /** Runs on navigate; used to close the menu that contains the link. */
  onNavigate?: () => void;
}

const BASE_CLASS: Record<LinkVariant, string> = {
  navbar: styles.link,
  option: styles.option,
};

const ACTIVE_CLASS: Record<LinkVariant, string> = {
  navbar: styles.activeLink,
  option: styles.activeOption,
};

/**
 * Navigation link that marks itself only when the current route falls
 * within its destination. The active state is communicated with
 * `aria-current="page"`, not just color: screen reader users also need to
 * know where they are.
 */
export function NavLink({
  href,
  label,
  icon,
  variant = "navbar",
  onNavigate,
}: NavLinkProps) {
  const currentRoute = usePathname();
  const active = isActiveRoute(currentRoute, href);

  return (
    <Link
      href={href}
      className={cn(BASE_CLASS[variant], active && ACTIVE_CLASS[variant])}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
    >
      {icon ? <Icon name={icon} size={16} /> : null}
      {label}
    </Link>
  );
}
