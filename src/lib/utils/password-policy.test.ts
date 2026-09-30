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

  it("counts Unicode surrogate pairs as one character, matching the backend", () => {
    const sevenCharacterPassword = "A1!😀😀😀😀";
    const eightCharacterPassword = "A1!a😀😀😀😀";

    expect(newPasswordValidationMessage(sevenCharacterPassword)).toBe(
      "La contraseña debe tener al menos 8 caracteres",
    );
    expect(passwordRequirements(sevenCharacterPassword)[0]?.met).toBe(false);
    expect(newPasswordValidationMessage(eightCharacterPassword)).toBeUndefined();
    expect(passwordRequirements(eightCharacterPassword)[0]?.met).toBe(true);
  });

  it("uses the backend's Unicode character count at the maximum length", () => {
    const maximumLengthPassword = `A1!${"a".repeat(MAX_PASSWORD_LENGTH - 4)}😀`;
    const overMaximumPassword = `A1!${"a".repeat(MAX_PASSWORD_LENGTH - 3)}😀`;

    expect(newPasswordValidationMessage(maximumLengthPassword)).toBeUndefined();
    expect(passwordRequirements(maximumLengthPassword)[0]?.met).toBe(true);
    expect(newPasswordValidationMessage(overMaximumPassword)).toBe(
      "La contraseña debe tener como máximo 128 caracteres",
    );
    expect(passwordRequirements(overMaximumPassword)[0]?.met).toBe(false);
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
