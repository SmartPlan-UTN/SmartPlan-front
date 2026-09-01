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
export {
  searchPlans,
  getPlan,
  listOwnPlans,
  createPlan,
  addPlanActivity,
  getOwnPlan,
  updateOwnPlan,
  cancelOwnPlan,
  removePlanActivity,
  generateSuggestedPlan,
} from './plans';
export { listCategories } from './categories';
export { listPlaces } from './places';
export { getProfile, updateProfile, changePassword, deleteAccount } from './users';
export type { UpdateProfileData, ChangePasswordData } from './users';
export {
  changeAdminUserStatus,
  getAdminUserMetrics,
  getDashboardMetrics,
  listAdminUsers,
  updateAdminUser,
  createAdminActivity,
  deleteAdminActivity,
  deleteAdminPlan,
  listAdminActivities,
  listAdminPlans,
  updateAdminActivity,
  updateAdminPlan,
} from './administration';
export {
  addActivityToCollection,
  createCollection,
  deleteCollection,
  getCollection,
  listCollections,
  removeActivityFromCollection,
  updateCollection,
} from './collections';
