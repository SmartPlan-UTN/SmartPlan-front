/**
 * Reemplazo de `next/font/local` para los tests.
 *
 * `next/font` no es un módulo normal: lo resuelve el compilador de Next durante
 * el build. Fuera de ese pipeline la llamada falla con `TypeError: default is
 * not a function`, un error que no dice nada y que aparece en cualquier test que
 * importe —aunque sea de forma indirecta— un archivo que declare una dataSource.
 *
 * `vitest.config.mts` apunta el import a este archivo. Si en algún momento se
 * usa `next/font/google`, necesita su propio mock: ahí las fuentes son exports
 * con name y no alcanza con un default.
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
    // Se devuelve el name de la variable CSS pedida —y no una clase generated—
    // para que el HTML del test se pueda leer y para distinguir dos fuentes.
    variable: options.variable ?? "mock-font-variable",
    style: { fontFamily: "mock-font" },
  };
}
