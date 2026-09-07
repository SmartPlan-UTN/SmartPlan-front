/**
 * Replacement for `next/font/local` in tests.
 *
 * `next/font` is not a regular module: it's resolved by the Next compiler
 * during the build. Outside that pipeline the call fails with
 * `TypeError: default is not a function`, an error that says nothing useful
 * and shows up in any test that imports —even indirectly— a file that
 * declares a font.
 *
 * `vitest.config.mts` points the import to this file. If `next/font/google`
 * is ever used, it will need its own mock: there, fonts are named exports
 * and a default export isn't enough.
 */

interface LocalFontOptions {
  variable?: string;
}

interface LocalFont {
  className: string;
  variable: string;
  style: { fontFamily: string };
}

export default function localFont(options: LocalFontOptions = {}): LocalFont {
  return {
    className: "mock-font",
    // Return the requested CSS variable name —not a generated class— so the
    // test's HTML stays readable and two fonts can be told apart.
    variable: options.variable ?? "mock-font-variable",
    style: { fontFamily: "mock-font" },
  };
}
