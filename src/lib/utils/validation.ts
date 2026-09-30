/** Shared client-side validation for the CU1/CU2/CU5/CU6 forms. The backend
 * remains the source of truth: these only give faster, friendlier feedback
 * before a request is even sent. */

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const REQUIRED_MESSAGE = "Este campo es requerido";
