import axios from 'axios';

/**
 * Categorías posibles para la clasificación de errores HTTP y de red.
 */
export type TipoErrorApi = 'HTTP' | 'RED' | 'TIMEOUT' | 'CONFIGURACION' | 'DESCONOCIDO';

/**
 * Estructura de respuesta de error devuelta por la API de SmartPlan / NestJS.
 */
export interface ErrorResponseData {
  mensaje?: string;
  message?: string | string[];
  statusCode?: number;
  error?: string;
  [key: string]: unknown;
}

export interface OpcionesApiError {
  mensaje: string;
  tipo: TipoErrorApi;
  status?: number | null;
  codigo?: string | null;
  datos?: ErrorResponseData | null;
  causa?: unknown;
}

/**
 * Error estandarizado para la capa de API de SmartPlan.
 * Encapsula la información del error sin exponer detalles internos de Axios hacia los componentes.
 */
export class ApiError extends Error {
  public readonly tipo: TipoErrorApi;
  public readonly status: number | null;
  public readonly codigo: string | null;
  public readonly datos: ErrorResponseData | null;

  constructor(opciones: OpcionesApiError) {
    super(opciones.mensaje);
    this.name = 'ApiError';
    this.tipo = opciones.tipo;
    this.status = opciones.status ?? null;
    this.codigo = opciones.codigo ?? null;
    this.datos = opciones.datos ?? null;

    if (opciones.causa) {
      this.cause = opciones.causa;
    }
  }

  /**
   * Indica si el error se debe a una sesión no autenticada o token inválido (401 Unauthorized).
   */
  get es401(): boolean {
    return this.status === 401;
  }

  /**
   * Indica si el error se debe a falta de permisos suficientes (403 Forbidden).
   */
  get es403(): boolean {
    return this.status === 403;
  }

  /**
   * Indica si el error fue provocado por problemas de conectividad o tiempo de espera agotado.
   */
  get esRed(): boolean {
    return this.tipo === 'RED' || this.tipo === 'TIMEOUT';
  }
}

/**
 * Extrae y formatea un mensaje legible desde el payload de error entregado por el backend.
 */
function extraerMensajeServidor(datos: ErrorResponseData | undefined, fallback: string): string {
  if (!datos) {
    return fallback;
  }

  if (typeof datos.mensaje === 'string' && datos.mensaje.trim() !== '') {
    return datos.mensaje;
  }

  if (typeof datos.message === 'string' && datos.message.trim() !== '') {
    return datos.message;
  }

  if (Array.isArray(datos.message) && datos.message.length > 0) {
    return datos.message.map((msg) => String(msg)).join(', ');
  }

  return fallback;
}

/**
 * Normaliza cualquier excepción (AxiosError, Error genérico, nulo, etc.) en una instancia de `ApiError`.
 *
 * @param error Error original capturado.
 * @returns Instancia tipada de `ApiError`.
 */
export function normalizarError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const respuesta = error.response;

    if (respuesta) {
      const status = respuesta.status;
      const datos = respuesta.data as ErrorResponseData | undefined;
      const mensaje = extraerMensajeServidor(datos, `Error HTTP ${status}`);
      const codigo = typeof datos?.error === 'string' ? datos.error : error.code ?? null;

      return new ApiError({
        mensaje,
        tipo: 'HTTP',
        status,
        codigo,
        datos: datos ?? null,
        causa: error,
      });
    }

    if (error.code === 'ECONNABORTED' || error.message.toLowerCase().includes('timeout')) {
      return new ApiError({
        mensaje: 'La petición superó el tiempo límite de espera. Por favor, reintentá.',
        tipo: 'TIMEOUT',
        codigo: error.code ?? 'TIMEOUT',
        causa: error,
      });
    }

    if (error.request) {
      return new ApiError({
        mensaje: 'No se pudo conectar con el servidor. Verificá tu conexión a internet.',
        tipo: 'RED',
        codigo: error.code ?? 'ERR_NETWORK',
        causa: error,
      });
    }

    return new ApiError({
      mensaje: error.message || 'Error al configurar la petición HTTP.',
      tipo: 'CONFIGURACION',
      codigo: error.code ?? 'ERR_CONFIG',
      causa: error,
    });
  }

  if (error instanceof Error) {
    return new ApiError({
      mensaje: error.message,
      tipo: 'DESCONOCIDO',
      causa: error,
    });
  }

  return new ApiError({
    mensaje: 'Ocurrió un error inesperado al procesar la solicitud.',
    tipo: 'DESCONOCIDO',
    causa: error,
  });
}
