/** Shared client-side validation for the CU1/CU2/CU5/CU6 forms. The backend
 * remains the source of truth: these only give faster, friendlier feedback
 * before a request is even sent. */

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Matches `SmartPlan-back`'s password length rule (`login`, `register-user`,
 * and `change-password` DTOs): 8-128 characters. */
export const MIN_PASSWORD_LENGTH = 8;

export const REQUIRED_MESSAGE = "Este campo es requerido";
