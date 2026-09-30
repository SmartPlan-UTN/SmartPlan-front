import { describe, expect, it } from "vitest";

import {
  MAX_PASSWORD_LENGTH,
  newPasswordValidationMessage,
  passwordRequirements,
} from "./password-policy";

describe("new password policy", () => {
  it("accepts a password that satisfies every requirement", () => {
    expect(newPasswordValidationMessage("Abcdef1!")).toBeUndefined();
    expect(passwordRequirements("Abcdef1!").every(({ met }) => met)).toBe(true);
  });

  it.each([
    ["Ab1!", "La contraseña debe tener al menos 8 caracteres"],
    [
      `A1!${"a".repeat(MAX_PASSWORD_LENGTH - 2)}`,
      "La contraseña debe tener como máximo 128 caracteres",
    ],
    ["abcdef1!", "La contraseña debe incluir al menos una mayúscula"],
    ["Abcdefgh!", "La contraseña debe incluir al menos un número"],
    ["Abcdefg1", "La contraseña debe incluir al menos un símbolo (!@#$%^&*)"],
  ])("rejects an unmet requirement for %s", (password, message) => {
    expect(newPasswordValidationMessage(password)).toBe(message);
  });

  it("only accepts the explicitly allowed symbols", () => {
    expect(newPasswordValidationMessage("Abcdef1?")).toBe(
      "La contraseña debe incluir al menos un símbolo (!@#$%^&*)",
    );
  });
});
