"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Icon, Logo } from "@/components/ui";
import { ROUTES } from "@/lib/routes";

import { NavLink } from "./NavLink";
import { MAIN_LINKS } from "./links";
import { UserMenu } from "./UserMenu";
import styles from "./layout.module.css";

/**
 * 60px navigation bar (`--navbar-h`), fixed at the top with a
 * `backdrop-filter` over the content, as required by the EMBER design system.
 *
 * Below 900px the links collapse into a dropdown panel; the user menu
 * stays visible at every size.
 */
export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const currentRoute = usePathname();
  const [menuRoute, setMenuRoute] = useState(currentRoute);

  // Navigating has to close the panel: otherwise the new screen appears
  // covered. This is adjusted during render instead of with an effect,
  // which would trigger a second render with the panel still open:
  // https://react.dev/learn/you-might-not-need-an-effect
  if (currentRoute !== menuRoute) {
    setMenuRoute(currentRoute);
    setMenuOpen(false);
  }

  return (
    <header className={styles.navbar}>
      <div className={styles.navbarInner}>
        <Link href={ROUTES.home} className={styles.brand}>
          <Logo variant="white" kind="full" height={22} priority />
        </Link>

        <nav className={styles.nav} aria-label="Navegación principal">
          {MAIN_LINKS.map((link) => (
            <NavLink
              key={link.href}
              href={link.href}
              label={link.label}
              icon={link.icon}
            />
          ))}
        </nav>

        <UserMenu />

        <button
          type="button"
          className={styles.menuButton}
          aria-expanded={menuOpen}
          aria-controls="collapsible-navigation"
          aria-label={menuOpen ? "Cerrar la navegación" : "Abrir la navegación"}
          onClick={() => {
            setMenuOpen((isOpen) => !isOpen);
          }}
        >
          <Icon name={menuOpen ? "x" : "menu"} size={20} />
        </button>
      </div>

      {menuOpen ? (
        <nav
          id="collapsible-navigation"
          className={styles.mobilePanel}
          aria-label="Navegación principal plegable"
        >
          {MAIN_LINKS.map((link) => (
            <NavLink
              key={link.href}
              href={link.href}
              label={link.label}
              icon={link.icon}
              variant="option"
              onNavigate={() => {
                setMenuOpen(false);
              }}
            />
          ))}
        </nav>
      ) : null}
    </header>
  );
}
