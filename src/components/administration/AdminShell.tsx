"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { Icon, Logo, type IconName } from "@/components/ui";
import { useSession } from "@/lib/auth";
import { ROUTES, isActiveRoute, type Route } from "@/lib/routes";

import styles from "./AdminShell.module.css";

const ADMIN_LINKS: Array<{ href: Route; label: string; icon: IconName }> = [
  { href: ROUTES.admin, label: "Inicio", icon: "layout-dashboard" },
  { href: ROUTES.adminActivities, label: "Actividades", icon: "sparkles" },
  { href: ROUTES.adminPlans, label: "Planes", icon: "map" },
  { href: ROUTES.adminUsers, label: "Usuarios", icon: "users" },
  { href: ROUTES.adminRatings, label: "Valoraciones", icon: "star" },
];

export interface AdminShellProps {
  children: ReactNode;
}

function AdminIdentity() {
  const { user } = useSession();
  const initials = user
    ? `${user.name.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
    : "AD";

  return (
    <div className={styles.identity}>
      <span className={styles.identityAvatar} aria-hidden="true">{initials}</span>
      <span className={styles.identityCopy}>
        <strong>{user ? `${user.name} ${user.lastName}` : "Administrador"}</strong>
        <span>Administrador</span>
      </span>
    </div>
  );
}

function AdminNavigation({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className={styles.nav} aria-label="Administración">
      {ADMIN_LINKS.map((item) => {
        const active = isActiveRoute(pathname, item.href) &&
          (item.href !== ROUTES.admin || pathname === ROUTES.admin);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
            aria-current={active ? "page" : undefined}
            onClick={onNavigate}
          >
            <Icon name={item.icon} size={18} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#main-content">Saltar al contenido</a>

      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <Logo variant="ink" kind="full" height={24} priority />
          <span>Admin</span>
        </div>
        <p className={styles.navLabel}>Gestión</p>
        <AdminNavigation pathname={pathname} />
        <div className={styles.sidebarFooter}>
          <AdminIdentity />
          <Link className={styles.exitLink} href={ROUTES.home}>
            <Icon name="log-out" size={17} />
            Salir del panel
          </Link>
        </div>
      </aside>

      <header className={styles.mobileHeader}>
        <div className={styles.brand}>
          <Logo variant="ink" kind="full" height={22} priority />
          <span>Admin</span>
        </div>
        <button
          type="button"
          className={styles.mobileTrigger}
          aria-label={mobileOpen ? "Cerrar menú administrativo" : "Abrir menú administrativo"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((current) => !current)}
        >
          <Icon name={mobileOpen ? "x" : "menu"} size={20} />
        </button>
        {mobileOpen ? (
          <div className={styles.mobilePanel}>
            <AdminNavigation pathname={pathname} onNavigate={() => setMobileOpen(false)} />
            <Link className={styles.exitLink} href={ROUTES.home}>
              <Icon name="log-out" size={17} />
              Salir del panel
            </Link>
          </div>
        ) : null}
      </header>

      <main id="main-content" className={styles.main}>
        {children}
      </main>
    </div>
  );
}
