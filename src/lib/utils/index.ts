/**
 * Domain-agnostic technical helpers. Import from `@/lib/utils`.
 */

export { cn } from "./cn";
export { formatAbsoluteDateTime } from "./absolute-date-time";
export { formatArs } from "./currency";
export { formatDuration } from "./duration";
export { googleMapsUrl } from "./googleMaps";
export { gradientFor } from "./gradient";
export { getPlanZone } from "./planZone";
export { parsePositiveIntId } from "./routeParams";
export {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  newPasswordValidationMessage,
  passwordRequirements,
  PASSWORD_DIGIT_PATTERN,
  PASSWORD_SYMBOL_PATTERN,
  PASSWORD_UPPERCASE_PATTERN,
  type PasswordRequirement,
} from "./password-policy";
export { EMAIL_PATTERN, REQUIRED_MESSAGE } from "./validation";
export { formatRelativeTime } from "./relative-time";
