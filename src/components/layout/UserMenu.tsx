"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { Icon } from "@/components/ui";
import { useSession } from "@/lib/auth";
import { loginRoute } from "@/lib/routes";
import { cn } from "@/lib/utils";

import { NavLink } from "./NavLink";
import { USER_LINKS } from "./links";
import styles from "./layout.module.css";

/**
 * Menú de user de la navbar.
 *
 * Tres statuses, uno por cada status de la sesión:
 *
 * - `loading`: un hueco del mismo tamaño, para que la navbar no salte cuando se
 *   resuelve el token.
 * - `anonymous`: link a iniciar sesión.
 * - `authenticated`: desplegable con Mi profile, Preferences y Cerrar sesión.
 *
 * Es un patrón *disclosure*, no un `menu` de ARIA: el desplegable son links
 * comunes que se recorren con Tab. Se cierra con Escape —devolviendo el foco al
 * disparador—, al hacer click afuera y al navegar.
 */
export function UserMenu() {
  const { status, cerrarSession } = useSession();
  const currentRoute = usePathname();
  const [abierto, setAbierto] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const disparadorRef = useRef<HTMLButtonElement>(null);
  const idPanel = useId();

  const cerrar = useCallback(() => {
    setAbierto(false);
  }, []);

  useEffect(() => {
    if (!abierto) {
      return;
    }

    const alApuntarAfuera = (event: MouseEvent) => {
      const container = containerRef.current;

      if (container && !container.contains(event.target as Node)) {
        cerrar();
      }
    };

    const alTeclear = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        cerrar();
        disparadorRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", alApuntarAfuera);
    document.addEventListener("keydown", alTeclear);

    return () => {
      document.removeEventListener("mousedown", alApuntarAfuera);
      document.removeEventListener("keydown", alTeclear);
    };
  }, [abierto, cerrar]);

  if (status === "loading") {
    return (
      <span
        className={cn(styles.sessionPlaceholder, styles.sessionControl)}
        aria-hidden="true"
      />
    );
  }

  if (status === "anonymous") {
    // Se conserva la pantalla actual igual que hace el guardián: quien entra al
    // login desde Explorar espera volver a Explorar, no al home.
    return (
      <Link
        href={loginRoute(currentRoute)}
        className={cn(styles.buttonLink, styles.sessionControl)}
        // La label se esconde en viewport chico, igual que en el disparador.
        aria-label="Iniciar sesión"
      >
        <Icon name="log-in" size={16} />
        <span className={styles.labelSession} aria-hidden="true">
          Iniciar sesión
        </span>
      </Link>
    );
  }

  return (
    <div
      className={cn(styles.userMenu, styles.sessionControl)}
      ref={containerRef}
    >
      <button
        ref={disparadorRef}
        type="button"
        className={styles.disparador}
        // La label se esconde en viewport chico y los icons son
        // decorativos: sin este aria-label el botón se queda sin name.
        aria-label="Mi cuenta"
        aria-expanded={abierto}
        aria-controls={idPanel}
        onClick={() => {
          setAbierto((estaAbierto) => !estaAbierto);
        }}
      >
        <Icon name="user" size={16} />
        <span className={styles.labelSession} aria-hidden="true">
          Mi cuenta
        </span>
        <Icon name="chevron-down" size={14} />
      </button>

      {abierto ? (
        <div className={styles.panel} id={idPanel}>
          {USER_LINKS.map((link) => (
            <NavLink
              key={link.href}
              href={link.href}
              label={link.label}
              icon={link.icon}
              variante="option"
              onNavegar={cerrar}
            />
          ))}

          <hr className={styles.separador} />

          <button
            type="button"
            className={styles.option}
            onClick={() => {
              cerrar();
              cerrarSession();
            }}
          >
            <Icon name="log-out" size={16} />
            Cerrar sesión
          </button>
        </div>
      ) : null}
    </div>
  );
}
