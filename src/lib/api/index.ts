/**
 * Public barrel export for SmartPlan's centralized HTTP infrastructure.
 *
 * Import only from `@/lib/api`.
 */

export { apiClient } from './client';
export type { RequestConfig } from './client';

export { ApiError, normalizeError } from './errors';
export type {
  ApiErrorType,
  ErrorResponseData,
  ApiErrorOptions,
} from './errors';

export { getToken, setTokenGetter } from './token-provider';
export type { TokenGetter } from './token-provider';

export { onUnauthorized, notifyUnauthorized } from './auth-events';
export type { UnauthorizedListener } from './auth-events';

export { getApiBaseUrl } from './config';

export { searchActivities, getActivity, getActivityMapMarkers } from './activities';
export { searchPlans, getPlan } from './plans';
export { listCategories } from './categories';
export { getPreferences, updatePreferences } from './users';
