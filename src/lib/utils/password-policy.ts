export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;

export const PASSWORD_UPPERCASE_PATTERN = /[A-Z]/;
export const PASSWORD_DIGIT_PATTERN = /[0-9]/;
export const PASSWORD_SYMBOL_PATTERN = /[!@#$%^&*]/;

const PRESENTATION_SEQUENCE_PATTERN = /[^\uFE0F\uFE0E][\uFE0F\uFE0E]/g;
const SURROGATE_PAIR_PATTERN = /[\uD800-\uDBFF][\uDC00-\uDFFF]/g;

export interface PasswordRequirement {
  label: string;
  met: boolean;
}

/** Mirrors the Unicode-aware length used by class-validator on the backend. */
function passwordLength(password: string): number {
  const presentationSequences =
    password.match(PRESENTATION_SEQUENCE_PATTERN)?.length ?? 0;
  const surrogatePairs = password.match(SURROGATE_PAIR_PATTERN)?.length ?? 0;

  return password.length - presentationSequences - surrogatePairs;
}

/**
 * Returns the first unmet rule for a newly-created password. Empty values are
 * handled by each form's required-field validation.
 */
export function newPasswordValidationMessage(password: string): string | undefined {
  const length = passwordLength(password);

  if (length < MIN_PASSWORD_LENGTH) {
    return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`;
  }
  if (length > MAX_PASSWORD_LENGTH) {
    return `La contraseña debe tener como máximo ${MAX_PASSWORD_LENGTH} caracteres`;
  }
  if (!PASSWORD_UPPERCASE_PATTERN.test(password)) {
    return "La contraseña debe incluir al menos una mayúscula";
  }
  if (!PASSWORD_DIGIT_PATTERN.test(password)) {
    return "La contraseña debe incluir al menos un número";
  }
  if (!PASSWORD_SYMBOL_PATTERN.test(password)) {
    return "La contraseña debe incluir al menos un símbolo (!@#$%^&*)";
  }

  return undefined;
}

/** The mandatory rules shown next to every field that creates a password. */
export function passwordRequirements(password: string): PasswordRequirement[] {
  const length = passwordLength(password);

  return [
    {
      label: `Entre ${MIN_PASSWORD_LENGTH} y ${MAX_PASSWORD_LENGTH} caracteres`,
      met: length >= MIN_PASSWORD_LENGTH && length <= MAX_PASSWORD_LENGTH,
    },
    {
      label: "Al menos una mayúscula",
      met: PASSWORD_UPPERCASE_PATTERN.test(password),
    },
    {
      label: "Al menos un número",
      met: PASSWORD_DIGIT_PATTERN.test(password),
    },
    {
      label: "Al menos un símbolo (!@#$%^&*)",
      met: PASSWORD_SYMBOL_PATTERN.test(password),
    },
  ];
}
