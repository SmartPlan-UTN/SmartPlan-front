"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Icon, Logo } from "@/components/ui";
import { RUTAS } from "@/lib/rutas";

import { EnlaceNav } from "./EnlaceNav";
import { ENLACES_PRINCIPALES } from "./enlaces";
import { MenuUsuario } from "./MenuUsuario";
import styles from "./layout.module.css";

/**
 * Barra de navegación de 60px (`--navbar-h`), fija arriba y con
 * `backdrop-filter` sobre el contenido, como pide el design system EMBER.
 *
 * Debajo de 900px los enlaces se pliegan en un panel desplegable; el menú de
 * usuario se mantiene visible en todos los tamaños.
 */
export function Navbar() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const rutaActual = usePathname();
  const [rutaDelMenu, setRutaDelMenu] = useState(rutaActual);

  // Navegar tiene que cerrar el panel: si no, la pantalla nueva aparece tapada.
  // Se ajusta durante el render en vez de con un efecto, que dispararía un
  // segundo render con el panel todavía abierto:
  // https://react.dev/learn/you-might-not-need-an-effect
  if (rutaActual !== rutaDelMenu) {
    setRutaDelMenu(rutaActual);
    setMenuAbierto(false);
  }

  return (
    <header className={styles.navbar}>
      <div className={styles.barra}>
        <Link href={RUTAS.inicio} className={styles.marca}>
          <Logo variant="white" kind="full" height={22} priority />
        </Link>

        <nav className={styles.navegacion} aria-label="Navegación principal">
          {ENLACES_PRINCIPALES.map((enlace) => (
            <EnlaceNav
              key={enlace.href}
              href={enlace.href}
              etiqueta={enlace.etiqueta}
              icono={enlace.icono}
            />
          ))}
        </nav>

        <div className={styles.espaciador} />

        <MenuUsuario />

        <button
          type="button"
          className={styles.botonMenu}
          aria-expanded={menuAbierto}
          aria-controls="navegacion-plegable"
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
          id="navegacion-plegable"
          className={styles.panelMovil}
          aria-label="Navegación principal plegable"
        >
          {ENLACES_PRINCIPALES.map((enlace) => (
            <EnlaceNav
              key={enlace.href}
              href={enlace.href}
              etiqueta={enlace.etiqueta}
              icono={enlace.icono}
              variante="opcion"
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
