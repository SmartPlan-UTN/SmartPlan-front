import axios from 'axios';

/**
 * Possible categories for classifying HTTP and network errors.
 */
export type ApiErrorType = 'HTTP' | 'NETWORK' | 'TIMEOUT' | 'CONFIGURATION' | 'UNKNOWN';

/**
 * Error response shape returned by the SmartPlan / NestJS API.
 * Matches `ErrorResponse` in SmartPlan-back
 * (`src/common/errors/error-response.ts`): `code` and `message` are the
 * fields the backend actually sends.
 */
export interface ErrorResponseData {
  message?: string | string[];
  code?: string;
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
 * Standardized error for SmartPlan's API layer.
 * Wraps error information without leaking Axios internals to components.
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
   * Whether the error is due to an unauthenticated session or an invalid token (401 Unauthorized).
   */
  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  /**
   * Whether the error is due to insufficient permissions (403 Forbidden).
   */
  get isForbidden(): boolean {
    return this.status === 403;
  }

  /**
   * Whether the error was caused by connectivity issues or a timeout.
   */
  get isNetworkError(): boolean {
    return this.type === 'NETWORK' || this.type === 'TIMEOUT';
  }
}

/**
 * Extracts and formats a readable message from the error payload sent by the backend.
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
 * Normalizes any exception (AxiosError, generic Error, null, etc.) into an `ApiError` instance.
 *
 * @param error Original captured error.
 * @returns Typed `ApiError` instance.
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
      const code = typeof data?.code === 'string' ? data.code : error.code ?? null;

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
    message: 'Ocurrió un error inesperado al procesar la solicitud.',
    type: 'UNKNOWN',
    cause: error,
  });
}
