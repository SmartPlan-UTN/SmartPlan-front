import { DEFAULT_TOKEN_STORAGE_KEY } from "@/lib/api";

/**
 * Lectura y escritura del JWT en el navegador.
 *
 * El almacenamiento concreto vive solo acá: el resto de la aplicación consume
 * la sesión a través de `SesionProvider` / `useSesion`. Si mañana el token pasa
 * a una cookie `httpOnly` —lo que habilitaría proteger las rutas en el
 * servidor—, se cambia este archivo y nada más.
 *
 * Todas las funciones son seguras de invocar durante el render del servidor:
 * si no hay `window`, devuelven `null` o no hacen nada.
 */

/** Evento propio: avisa un cambio de sesión dentro de la misma pestaña. */
const EVENTO_SESION = "smartplan:sesion";

const hayNavegador = () => typeof window !== "undefined";

/**
 * Devuelve el JWT guardado, o `null` si no hay sesión.
 *
 * `localStorage` puede lanzar en modo privado estricto o con las cookies de
 * terceros bloqueadas, así que el acceso va protegido.
 */
export function leerToken(): string | null {
  if (!hayNavegador()) {
    return null;
  }

  try {
    return localStorage.getItem(DEFAULT_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Guarda el JWT y avisa a los suscriptores de la pestaña actual. */
export function guardarToken(token: string): void {
  if (!hayNavegador()) {
    return;
  }

  try {
    localStorage.setItem(DEFAULT_TOKEN_STORAGE_KEY, token);
  } catch {
    // Si el navegador bloquea el almacenamiento, la sesión no se puede
    // sostener: el estado se relee de `localStorage` y el guardián va a mandar
    // al login. Se avisa igual para que la UI no quede a medio camino.
  }

  window.dispatchEvent(new Event(EVENTO_SESION));
}

/** Borra el JWT y avisa a los suscriptores de la pestaña actual. */
export function borrarToken(): void {
  if (!hayNavegador()) {
    return;
  }

  try {
    localStorage.removeItem(DEFAULT_TOKEN_STORAGE_KEY);
  } catch {
    // Ídem: si no se puede escribir, igual hay que notificar el cambio.
  }

  window.dispatchEvent(new Event(EVENTO_SESION));
}

/**
 * Suscribe un callback a los cambios de sesión.
 *
 * Cubre los dos orígenes posibles: el evento propio para lo que pasa en esta
 * pestaña y `storage` para lo que pasa en otra (cerrar sesión en una pestaña
 * tiene que cerrarla en todas).
 *
 * @returns Función para desuscribirse.
 */
export function suscribirSesion(alCambiar: () => void): () => void {
  if (!hayNavegador()) {
    return () => undefined;
  }

  const alCambiarAlmacenamiento = (evento: StorageEvent) => {
    if (evento.key === null || evento.key === DEFAULT_TOKEN_STORAGE_KEY) {
      alCambiar();
    }
  };

  window.addEventListener(EVENTO_SESION, alCambiar);
  window.addEventListener("storage", alCambiarAlmacenamiento);

  return () => {
    window.removeEventListener(EVENTO_SESION, alCambiar);
    window.removeEventListener("storage", alCambiarAlmacenamiento);
  };
}
