/**
 * Sistema de eventos pub/sub para notificar estados de autenticación no autorizada (401 Unauthorized).
 * Permite a la capa de UI o al futuro AuthProvider reaccionar (ej. redireccionar a login o limpiar sesión)
 * sin acoplar la infraestructura HTTP a pantallas específicas.
 */

export type ListenerNoAutorizado = () => void;

const listeners: Set<ListenerNoAutorizado> = new Set();
let notificacionEnProgreso = false;
let timerNotificacion: ReturnType<typeof setTimeout> | null = null;

/** Ventana de deduplicación en milisegundos para peticiones concurrentes que retornen 401 */
const VENTANA_DEDUPLICACION_MS = 1000;

/**
 * Suscribe un callback que será ejecutado cuando se detecte un error 401 Unauthorized.
 *
 * @param listener Función a ejecutar cuando la sesión no sea válida.
 * @returns Función de desuscripción para remover el listener.
 */
export function onUnauthorized(listener: ListenerNoAutorizado): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

/**
 * Notifica a todos los suscriptores que se recibió una respuesta 401.
 * Aplica deduplicación para peticiones múltiples en paralelo dentro de un breve intervalo.
 */
export function notifyUnauthorized(): void {
  if (notificacionEnProgreso) {
    return;
  }

  notificacionEnProgreso = true;

  listeners.forEach((listener) => {
    try {
      listener();
    } catch (_err) {
      // Ignora errores generados dentro de los listeners de UI para no romper la cadena de peticiones
    }
  });

  if (timerNotificacion) {
    clearTimeout(timerNotificacion);
  }

  timerNotificacion = setTimeout(() => {
    notificacionEnProgreso = false;
    timerNotificacion = null;
  }, VENTANA_DEDUPLICACION_MS);
}
