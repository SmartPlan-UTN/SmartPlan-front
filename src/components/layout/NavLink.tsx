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
  /** `navbar` para la navegación horizontal, `option` para los desplegables. */
  variante?: LinkVariant;
  /** Se ejecuta al navegar; sirve para cerrar el menú que contiene al link. */
  onNavegar?: () => void;
}

const CLASE_BASE: Record<LinkVariant, string> = {
  navbar: styles.link,
  option: styles.option,
};

const CLASE_ACTIVA: Record<LinkVariant, string> = {
  navbar: styles.linkActivo,
  option: styles.opcionActiva,
};

/**
 * Link de navegación que se marca solo cuando la route actual cae dentro de su
 * destination. El status active se comunica con `aria-current="page"`, no solo con
 * color: quien navega con lector de pantalla también necesita saber dónde está.
 */
export function NavLink({
  href,
  label,
  icon,
  variante = "navbar",
  onNavegar,
}: NavLinkProps) {
  const currentRoute = usePathname();
  const active = isActiveRoute(currentRoute, href);

  return (
    <Link
      href={href}
      className={cn(CLASE_BASE[variante], active && CLASE_ACTIVA[variante])}
      aria-current={active ? "page" : undefined}
      onClick={onNavegar}
    >
      {icon ? <Icon name={icon} size={16} /> : null}
      {label}
    </Link>
  );
}
