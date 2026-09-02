/**
 * Public barrel export for SmartPlan's centralized HTTP infrastructure.
 *
 * Import only from `@/lib/api`.
 */

export { apiClient } from "./client";
export type { RequestConfig } from "./client";

export { ApiError, normalizeError } from "./errors";
export type {
  ApiErrorType,
  ErrorResponseData,
  ApiErrorOptions,
} from "./errors";

export { getToken, setTokenGetter } from "./token-provider";
export type { TokenGetter } from "./token-provider";

export { onUnauthorized, notifyUnauthorized } from "./auth-events";
export type { UnauthorizedListener } from "./auth-events";

export { getApiBaseUrl } from "./config";

export {
  searchActivities,
  getActivity,
  getActivityMapMarkers,
} from "./activities";
export {
  searchPlans,
  createPlan,
  listOwnPlans,
  getOwnPlan,
  updateOwnPlan,
  cancelOwnPlan,
  addPlanActivity,
  removePlanActivity,
  generateSuggestedPlan,
  getPlan,
  selectPlan,
  deselectPlan,
} from "./plans";
export { submitFeedback } from "./feedback";
export { listCategories } from "./categories";
export {
  getPreferences,
  updatePreferences,
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount,
} from "./users";
export type {
  UpdateProfileData,
  ChangePasswordData,
  DeleteAccountData,
} from "./users";
export { searchPlace } from "./places";
export {
  changeAdminUserStatus,
  getAdminUserMetrics,
  getDashboardMetrics,
  listAdminUsers,
  updateAdminUser,
} from "./administration";
export {
  addActivityToCollection,
  createCollection,
  deleteCollection,
  getCollection,
  listCollections,
  removeActivityFromCollection,
  updateCollection,
} from "./collections";
export {
  createPlanRequest,
  createSurprisePlanRequest,
  getPlanRequestStatus,
} from "./plan-requests";
export {
  getRecommendations,
  dismissRecommendation,
  undoDismissRecommendation,
} from "./plan-recommendations";
