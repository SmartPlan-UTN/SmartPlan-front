"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { Icon } from "@/components/ui";
import { useSesion } from "@/lib/auth";
import { RUTAS } from "@/lib/rutas";

import { EnlaceNav } from "./EnlaceNav";
import { ENLACES_USUARIO } from "./enlaces";
import styles from "./layout.module.css";

/**
 * Menú de usuario de la navbar.
 *
 * Tres estados, uno por cada estado de la sesión:
 *
 * - `cargando`: un hueco del mismo tamaño, para que la barra no salte cuando se
 *   resuelve el token.
 * - `anonimo`: enlace a iniciar sesión.
 * - `autenticado`: desplegable con Mi perfil, Preferencias y Cerrar sesión.
 *
 * Es un patrón *disclosure*, no un `menu` de ARIA: el desplegable son enlaces
 * comunes que se recorren con Tab. Se cierra con Escape —devolviendo el foco al
 * disparador—, al hacer click afuera y al navegar.
 */
export function MenuUsuario() {
  const { estado, cerrarSesion } = useSesion();
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const disparadorRef = useRef<HTMLButtonElement>(null);
  const idPanel = useId();

  const cerrar = useCallback(() => {
    setAbierto(false);
  }, []);

  useEffect(() => {
    if (!abierto) {
      return;
    }

    const alApuntarAfuera = (evento: MouseEvent) => {
      const contenedor = contenedorRef.current;

      if (contenedor && !contenedor.contains(evento.target as Node)) {
        cerrar();
      }
    };

    const alTeclear = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
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

  if (estado === "cargando") {
    return <span className={styles.marcadorSesion} aria-hidden="true" />;
  }

  if (estado === "anonimo") {
    return (
      <Link href={RUTAS.login} className={styles.enlaceLogin}>
        <Icon name="log-in" size={16} />
        Iniciar sesión
      </Link>
    );
  }

  return (
    <div className={styles.menuUsuario} ref={contenedorRef}>
      <button
        ref={disparadorRef}
        type="button"
        className={styles.disparador}
        aria-expanded={abierto}
        aria-controls={idPanel}
        onClick={() => {
          setAbierto((estaAbierto) => !estaAbierto);
        }}
      >
        <Icon name="user" size={16} />
        <span className={styles.etiquetaDisparador}>Mi cuenta</span>
        <Icon name="chevron-down" size={14} />
      </button>

      {abierto ? (
        <div className={styles.panel} id={idPanel}>
          {ENLACES_USUARIO.map((enlace) => (
            <EnlaceNav
              key={enlace.href}
              href={enlace.href}
              etiqueta={enlace.etiqueta}
              icono={enlace.icono}
              variante="opcion"
              onNavegar={cerrar}
            />
          ))}

          <hr className={styles.separador} />

          <button
            type="button"
            className={styles.opcion}
            onClick={() => {
              cerrar();
              cerrarSesion();
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
