"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { onUnauthorized, setTokenGetter } from "@/lib/api";

import { borrarToken, guardarToken, leerToken, suscribirSesion } from "./sesion";

/**
 * Estado de la sesión.
 *
 * `cargando` es el estado real del primer render: el token vive en el
 * navegador, así que el servidor no puede saber si hay sesión. Sin este estado
 * intermedio el guardián expulsaría a todo el mundo al login por un instante.
 */
export type EstadoSesion = "cargando" | "autenticado" | "anonimo";

export interface Sesion {
  estado: EstadoSesion;
  token: string | null;
  /** Atajo de lectura: `estado === "autenticado"`. */
  autenticado: boolean;
  /** Guarda el token emitido por el back y deja la sesión abierta (CU1). */
  iniciarSesion: (token: string) => void;
  /** Borra el token local. La invalidación en el back es parte de CU4. */
  cerrarSesion: () => void;
}

const SesionContext = createContext<Sesion | null>(null);

export interface SesionProviderProps {
  children: ReactNode;
}

/**
 * Provee el estado de sesión a toda la aplicación y mantiene sincronizado el
 * cliente HTTP.
 *
 * Hace tres cosas:
 *
 * 1. Lee el token al montar y escucha los cambios (esta pestaña y las demás).
 * 2. Le enseña al cliente de `@/lib/api` de dónde sacar el token, con
 *    `setTokenGetter`, para que el interceptor de JWT no dependa de una clave
 *    de `localStorage` escrita a mano.
 * 3. Cierra la sesión cuando la API responde 401, usando el bus de eventos que
 *    expone `onUnauthorized`.
 */
export function SesionProvider({ children }: SesionProviderProps) {
  const [estado, setEstado] = useState<EstadoSesion>("cargando");
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const sincronizar = () => {
      const tokenActual = leerToken();
      setToken(tokenActual);
      setEstado(tokenActual ? "autenticado" : "anonimo");
    };

    sincronizar();

    setTokenGetter(leerToken);

    const desuscribirSesion = suscribirSesion(sincronizar);
    const desuscribir401 = onUnauthorized(() => {
      borrarToken();
    });

    return () => {
      desuscribirSesion();
      desuscribir401();
      setTokenGetter(null);
    };
  }, []);

  const iniciarSesion = useCallback((nuevoToken: string) => {
    guardarToken(nuevoToken);
  }, []);

  const cerrarSesion = useCallback(() => {
    borrarToken();
  }, []);

  const valor = useMemo<Sesion>(
    () => ({
      estado,
      token,
      autenticado: estado === "autenticado",
      iniciarSesion,
      cerrarSesion,
    }),
    [estado, token, iniciarSesion, cerrarSesion],
  );

  return <SesionContext value={valor}>{children}</SesionContext>;
}

/**
 * Devuelve la sesión activa.
 *
 * @throws Si se usa fuera de `SesionProvider`. Es a propósito: un componente
 * que cree tener sesión y no la tenga falla de forma silenciosa y difícil de
 * rastrear.
 */
export function useSesion(): Sesion {
  const sesion = useContext(SesionContext);

  if (!sesion) {
    throw new Error(
      "useSesion() se usó fuera de <SesionProvider>. El provider se monta en src/app/layout.tsx.",
    );
  }

  return sesion;
}
