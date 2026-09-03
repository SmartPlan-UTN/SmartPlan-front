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
  selectPlan,
  deselectPlan,
  updateOwnPlan,
  cancelOwnPlan,
  removePlanActivity,
  generateSuggestedPlan,
} from './plans';
export { listCategories } from './categories';
export { listCities, listDepartments, listPlaces, searchPlace } from './places';
export { getProfile, updateProfile, changePassword, deleteAccount } from './users';
export type { UpdateProfileData, ChangePasswordData, DeleteAccountData } from './users';
export {
  changeAdminUserStatus,
  deleteAdminUser,
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
  getAdminRatingCounts,
  listAdminRatings,
  moderateAdminRating,
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
export {
  submitFeedback,
} from './feedback';
export { getPreferences, updatePreferences } from './users';
export { createPlanRequest, createSurprisePlanRequest, getPlanRequestStatus } from './plan-requests';
export { getRecommendations, dismissRecommendation, undoDismissRecommendation } from './plan-recommendations';
export {
  listFavoriteActivities,
  removeFavoriteActivity,
  saveFavoriteActivity,
  listFavoritePlans,
  removeFavoritePlan,
  saveFavoritePlan,
} from './favorites';
export {
  createRating,
  deleteRating,
  getOwnRating,
  listRatings,
  updateRating,
} from './ratings';
