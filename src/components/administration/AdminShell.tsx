"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";

import { LogoutConfirmModal } from "@/components/layout";
import { Icon, Logo, type IconName } from "@/components/ui";
import { useSession } from "@/lib/auth";
import { ROUTES, isActiveRoute, type Route } from "@/lib/routes";

import styles from "./AdminShell.module.css";

const ADMIN_LINKS: Array<{
  href: Route;
  label: string;
  icon: IconName;
  /** Shown only to whoever holds it; the backend enforces it as well. */
  permission?: string;
}> = [
  { href: ROUTES.admin, label: "Inicio", icon: "layout-dashboard" },
  { href: ROUTES.adminActivities, label: "Actividades", icon: "sparkles" },
  {
    href: ROUTES.adminCatalogCandidates,
    label: "Candidatos",
    icon: "list-checks",
    permission: "catalog.review",
  },
  { href: ROUTES.adminPlaces, label: "Lugares", icon: "map-pin" },
  { href: ROUTES.adminMenus, label: "Cartas", icon: "utensils" },
  { href: ROUTES.adminPlans, label: "Planes", icon: "map" },
  { href: ROUTES.adminUsers, label: "Usuarios", icon: "users" },
  { href: ROUTES.adminReports, label: "Denuncias", icon: "flag" },
  { href: ROUTES.adminMcp, label: "MCP", icon: "settings" },
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
  const { user } = useSession();
  const links = ADMIN_LINKS.filter(
    (item) => !item.permission || (user?.permissions.includes(item.permission) ?? false),
  );
  return (
    <nav className={styles.nav} aria-label="Administración">
      {links.map((item) => {
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

/**
 * "Salir del panel" goes back to the app with the session open; "Cerrar
 * sesión" closes it, behind the same confirmation as the navbar's user menu
 * (the panel has no navbar, so this is its only way out of the account).
 */
function AdminSessionActions({ onNavigate }: { onNavigate?: () => void }) {
  const { logout } = useSession();
  const router = useRouter();
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const logoutButtonRef = useRef<HTMLButtonElement>(null);

  async function confirmLogout() {
    setConfirmingLogout(false);
    await logout();
    // `replace`, as in `UserMenu`: "back" must not return to a screen that
    // required the session just closed.
    router.replace(ROUTES.login);
  }

  return (
    <div className={styles.sessionActions}>
      <Link className={styles.exitLink} href={ROUTES.home} onClick={onNavigate}>
        <Icon name="arrow-left" size={17} />
        Salir del panel
      </Link>
      <button
        ref={logoutButtonRef}
        type="button"
        className={`${styles.exitLink} ${styles.logoutButton}`}
        onClick={() => setConfirmingLogout(true)}
      >
        <Icon name="log-out" size={17} />
        Cerrar sesión
      </button>
      {confirmingLogout ? (
        <LogoutConfirmModal
          onCancel={() => {
            setConfirmingLogout(false);
            logoutButtonRef.current?.focus();
          }}
          onConfirm={() => {
            void confirmLogout();
          }}
        />
      ) : null}
    </div>
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
          <AdminSessionActions />
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
            <AdminSessionActions onNavigate={() => setMobileOpen(false)} />
          </div>
        ) : null}
      </header>

      <main id="main-content" className={styles.main}>
        {children}
      </main>
    </div>
  );
}
