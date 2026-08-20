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
 * Barra de navegación de 60px (`--navbar-h`), fija arriba y con
 * `backdrop-filter` envelope el contenido, como pide el design system EMBER.
 *
 * Debajo de 900px los links se pliegan en un panel desplegable; el menú de
 * user se mantiene visible en todos los tamaños.
 */
export function Navbar() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const currentRoute = usePathname();
  const [menuRoute, setMenuRoute] = useState(currentRoute);

  // Navegar tiene que cerrar el panel: si no, la pantalla nueva aparece tapada.
  // Se ajusta durante el render en vez de con un efecto, que dispararía un
  // segundo render con el panel todavía abierto:
  // https://react.dev/learn/you-might-not-need-an-effect
  if (currentRoute !== menuRoute) {
    setMenuRoute(currentRoute);
    setMenuAbierto(false);
  }

  return (
    <header className={styles.navbar}>
      <div className={styles.navbar}>
        <Link href={ROUTES.home} className={styles.marca}>
          <Logo variant="white" kind="full" height={22} priority />
        </Link>

        <nav className={styles.navegacion} aria-label="Navegación principal">
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
          className={styles.botonMenu}
          aria-expanded={menuAbierto}
          aria-controls="collapsible-navigation"
          aria-label={menuAbierto ? "Cerrar la navegación" : "Abrir la navegación"}
          onClick={() => {
            setMenuAbierto((estaAbierto) => !estaAbierto);
          }}
        >
          <Icon name={menuAbierto ? "x" : "menu"} size={20} />
        </button>
      </div>

      {menuAbierto ? (
        <nav
          id="collapsible-navigation"
          className={styles.panelMovil}
          aria-label="Navegación principal plegable"
        >
          {MAIN_LINKS.map((link) => (
            <NavLink
              key={link.href}
              href={link.href}
              label={link.label}
              icon={link.icon}
              variante="option"
              onNavegar={() => {
                setMenuAbierto(false);
              }}
            />
          ))}
        </nav>
      ) : null}
    </header>
  );
}
