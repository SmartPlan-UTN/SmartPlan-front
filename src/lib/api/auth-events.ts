/**
 * Sistema de eventos pub/sub para notificar statuses de autenticación no autorizada (401 Unauthorized).
 * Permite a la capa de UI o al futuro AuthProvider reaccionar (ej. readdressar a login o limpiar sesión)
 * sin acoplar la infraestructura HTTP a pantallas específicas.
 */

export type UnauthorizedListener = () => void;

const listeners: Set<UnauthorizedListener> = new Set();
let notificationEnProgreso = false;
let timerNotification: ReturnType<typeof setTimeout> | null = null;

/** Ventana de deduplicación en milisegundos para peticiones concurrentes que retornen 401 */
const VENTANA_DEDUPLICACION_MS = 1000;

/**
 * Suscribe un callback que será ejecutado cuando se detecte un error 401 Unauthorized.
 *
 * @param listener Función a execute cuando la sesión no sea válida.
 * @returns Función de desuscripción para remover el listener.
 */
export function onUnauthorized(listener: UnauthorizedListener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

/**
 * Notifica a todos los suscriptores que se recibió una response 401.
 * Aplica deduplicación para peticiones múltiples en paralelo dentro de un breve intervalo.
 */
export function notifyUnauthorized(): void {
  if (notificationEnProgreso) {
    return;
  }

  notificationEnProgreso = true;

  listeners.forEach((listener) => {
    try {
      listener();
    } catch (_err) {
      // Ignora errors generados dentro de los listeners de UI para no romper la cadena de peticiones
    }
  });

  if (timerNotification) {
    clearTimeout(timerNotification);
  }

  timerNotification = setTimeout(() => {
    notificationEnProgreso = false;
    timerNotification = null;
  }, VENTANA_DEDUPLICACION_MS);
}
