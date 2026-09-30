export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;

export const PASSWORD_UPPERCASE_PATTERN = /[A-Z]/;
export const PASSWORD_DIGIT_PATTERN = /[0-9]/;
export const PASSWORD_SYMBOL_PATTERN = /[!@#$%^&*]/;

export interface PasswordRequirement {
  label: string;
  met: boolean;
}

/**
 * Returns the first unmet rule for a newly-created password. Empty values are
 * handled by each form's required-field validation.
 */
export function newPasswordValidationMessage(password: string): string | undefined {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`;
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
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
  return [
    {
      label: `Entre ${MIN_PASSWORD_LENGTH} y ${MAX_PASSWORD_LENGTH} caracteres`,
      met:
        password.length >= MIN_PASSWORD_LENGTH &&
        password.length <= MAX_PASSWORD_LENGTH,
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
