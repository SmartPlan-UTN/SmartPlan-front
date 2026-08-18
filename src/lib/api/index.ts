/**
 * Barrel export público para la infraestructura HTTP centralizada de SmartPlan.
 *
 * Importar únicamente desde `@/lib/api`.
 */

export { apiClient } from './client';
export type { RequestConfig } from './client';

export { ApiError, normalizarError } from './errors';
export type {
  TipoErrorApi,
  ErrorResponseData,
  OpcionesApiError,
} from './errors';

export {
  getToken,
  setTokenGetter,
  DEFAULT_TOKEN_STORAGE_KEY,
} from './token-provider';
export type { TokenGetter } from './token-provider';

export { onUnauthorized, notifyUnauthorized } from './auth-events';
export type { ListenerNoAutorizado } from './auth-events';

export { getApiBaseUrl } from './config';
