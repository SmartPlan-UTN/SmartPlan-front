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

export { setSessionRefresher, refreshSessionOnce } from "./session-refresher";
export type { SessionRefresher } from "./session-refresher";

export { getApiBaseUrl } from "./config";
export {
  mediaRequestPath,
  listMedia,
  uploadMedia,
  updateMedia,
  deleteMedia,
  uploadAvatar,
  deleteAvatar,
  downloadMedia,
  readImageAttribution,
} from "./media";

export {
  searchActivities,
  getActivity,
  getActivityMapMarkers,
} from "./activities";
export {
  searchExplore,
  getExploreMapMarkers,
  getPlaceDetail,
  ensurePlaceVisit,
  claimUiKitElements,
  getPlacePhotoMedia,
} from "./explore";
export {
  searchPlans,
  getPlan,
  listOwnPlans,
  listGeneratedPlans,
  copyGeneratedPlan,
  createPlan,
  createPlanFromComposer,
  checkPlanComposer,
  addPlanActivity,
  getOwnPlan,
  updateOwnPlan,
  updatePlanFromComposer,
  cancelOwnPlan,
  setOwnPlanVisibility,
  suggestActivities,
  assistantSearch,
  assistantSuggest,
  assistantImprove,
  removePlanActivity,
} from "./plans";
export {
  cancelOuting,
  completeOuting,
  createOuting,
  getOuting,
  listOutings,
  repeatOuting,
  setOutingPreparation,
} from "./outings";
export { listNotifications, markNotificationAsRead } from "./notifications";
export { listCategories } from "./categories";
export {
  listAdminPlaces,
  listCities,
  listDepartments,
  listPlaces,
  searchPlace,
} from "./places";
export {
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
export {
  changeAdminUserStatus,
  createAdminUser,
  deleteAdminUser,
  downloadAdminUsersReport,
  getAdminUserMetrics,
  getDashboardMetrics,
  downloadDashboardMetrics,
  listAdminUsers,
  updateAdminUser,
  createAdminActivity,
  deleteAdminActivity,
  deleteAdminPlan,
  listAdminActivities,
  listAdminPlans,
  updateAdminActivity,
  updateAdminPlan,
} from "./administration";
export {
  getContentReport,
  getContentReportCounts,
  listContentReports,
  reportContent,
  resolveContentReport,
} from "./contentReports";
export {
  addActivityToCollection,
  createCollection,
  deleteCollection,
  getCollection,
  listCollections,
  removeActivityFromCollection,
  updateCollection,
} from "./collections";
export { setFeedbackSharing, updateFeedback, submitFeedback } from "./feedback";
export {
  getCommunityFeed,
  getPlanExperiences,
  getCommunityExperiences,
  getCommunityExperience,
  getCommunityCreator,
  getCreatorExperiences,
  getCommunityPlans,
  getCreatorPlans,
  getCommunityCreators,
  getPlanAdaptations,
  getCreatorInspired,
  likeCommunityExperience,
  unlikeCommunityExperience,
  addCommunityExperienceVisit,
} from "./experiences";
export { getPreferences, updatePreferences } from "./users";
export {
  createPlanRequest,
  createSurprisePlanRequest,
  getPlanRequestStatus,
  refinePlanRequest,
  listPlanRequests,
} from "./plan-requests";
export {
  getRecommendations,
  dismissRecommendation,
  undoDismissRecommendation,
} from "./plan-recommendations";
export {
  listFavoriteActivities,
  removeFavoriteActivity,
  saveFavoriteActivity,
  listFavoritePlans,
  removeFavoritePlan,
  saveFavoritePlan,
} from "./favorites";
export {
  createRating,
  deleteRating,
  getOwnRating,
  listRatings,
  updateRating,
} from "./ratings";
export { createMcpKey, listMcpKeys, listMcpTools, revokeMcpKey } from "./mcp";
export {
  approveCatalogCandidate,
  bulkApproveCatalogCandidates,
  discardCatalogCandidate,
  getCatalogCandidate,
  getCatalogCandidateCounts,
  listCatalogCandidates,
  updateCatalogCandidate,
} from "./catalogCandidates";
