import axios from 'axios';

/**
 * Categorías posibles para la clasificación de errors HTTP y de red.
 */
export type ApiErrorType = 'HTTP' | 'NETWORK' | 'TIMEOUT' | 'CONFIGURATION' | 'UNKNOWN';

/**
 * Estructura de response de error devuelta por la API de SmartPlan / NestJS.
 */
export interface ErrorResponseData {
  message?: string | string[];
  statusCode?: number;
  error?: string;
  [key: string]: unknown;
}

export interface ApiErrorOptions {
  message: string;
  type: ApiErrorType;
  status?: number | null;
  code?: string | null;
  data?: ErrorResponseData | null;
  cause?: unknown;
}

/**
 * Error estandarizado para la capa de API de SmartPlan.
 * Encapsula la información del error sin exponer details internos de Axios hacia los componentes.
 */
export class ApiError extends Error {
  public readonly type: ApiErrorType;
  public readonly status: number | null;
  public readonly code: string | null;
  public readonly data: ErrorResponseData | null;

  constructor(options: ApiErrorOptions) {
    super(options.message);
    this.name = 'ApiError';
    this.type = options.type;
    this.status = options.status ?? null;
    this.code = options.code ?? null;
    this.data = options.data ?? null;

    if (options.cause) {
      this.cause = options.cause;
    }
  }

  /**
   * Indica si el error se debe a una sesión no autenticada o token inválido (401 Unauthorized).
   */
  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  /**
   * Indica si el error se debe a falta de permissions suficientes (403 Forbidden).
   */
  get isForbidden(): boolean {
    return this.status === 403;
  }

  /**
   * Indica si el error fue provocado por problemas de conectividad o tiempo de espera agotado.
   */
  get isNetworkError(): boolean {
    return this.type === 'NETWORK' || this.type === 'TIMEOUT';
  }
}

/**
 * Extrae y formatea un message legible desde el payload de error entregado por el backend.
 */
function extractServerMessage(data: ErrorResponseData | undefined, fallback: string): string {
  if (!data) {
    return fallback;
  }

  if (typeof data.message === 'string' && data.message.trim() !== '') {
    return data.message;
  }

  if (Array.isArray(data.message) && data.message.length > 0) {
    return data.message.map((msg) => String(msg)).join(', ');
  }

  return fallback;
}

/**
 * Normaliza cualquier excepción (AxiosError, Error genérico, nulo, etc.) en una instancia de `ApiError`.
 *
 * @param error Error original capturado.
 * @returns Instancia tipada de `ApiError`.
 */
export function normalizeError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const response = error.response;

    if (response) {
      const status = response.status;
      const data = response.data as ErrorResponseData | undefined;
      const message = extractServerMessage(data, `Error HTTP ${status}`);
      const code = typeof data?.error === 'string' ? data.error : error.code ?? null;

      return new ApiError({
        message,
        type: 'HTTP',
        status,
        code,
        data: data ?? null,
        cause: error,
      });
    }

    if (error.code === 'ECONNABORTED' || error.message.toLowerCase().includes('timeout')) {
      return new ApiError({
        message: 'La petición superó el tiempo límite de espera. Por favor, reintentá.',
        type: 'TIMEOUT',
        code: error.code ?? 'TIMEOUT',
        cause: error,
      });
    }

    if (error.request) {
      return new ApiError({
        message: 'No se pudo conectar con el servidor. Verificá tu conexión a internet.',
        type: 'NETWORK',
        code: error.code ?? 'ERR_NETWORK',
        cause: error,
      });
    }

    return new ApiError({
      message: error.message || 'Error al configurar la petición HTTP.',
      type: 'CONFIGURATION',
      code: error.code ?? 'ERR_CONFIG',
      cause: error,
    });
  }

  if (error instanceof Error) {
    return new ApiError({
      message: error.message,
      type: 'UNKNOWN',
      cause: error,
    });
  }

  return new ApiError({
    message: 'Ocurrió un error inesperado al process la request.',
    type: 'UNKNOWN',
    cause: error,
  });
}
