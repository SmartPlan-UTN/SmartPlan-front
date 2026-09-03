// ============================================================================
//  SmartPlan - Frontend | Configuración del analizador estático (ESLint 9)
// ============================================================================
//  Formato: "flat config" (eslint.config.mjs). Es el formato oficial desde
//  ESLint 9 y el único soportado por Next.js 16, donde `next lint` fue
//  eliminado y el análisis se ejecuta directamente con la CLI de ESLint.
//
//  Ejecución:  pnpm lint          -> reporta errors y advertencias
//              pnpm lint:fix      -> corrige automáticamente lo autocorregible
// ============================================================================

import { defineConfig, globalIgnores } from "eslint/config";
// Reglas base de Next.js + React + React Hooks. La variante "core-web-vitals"
// eleva a ERROR las reglas que impactan en las métricas de Core Web Vitals
// (LCP, CLS, INP), por eso se usa esta y no la config base.
import nextVitals from "eslint-config-next/core-web-vitals";
// Reglas específicas de TypeScript (typescript-eslint). Detecta tipados
// inseguros, variables sin usar, promesas mal manejadas, etc.
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  // --------------------------------------------------------------------
  // 1. PRESETS HEREDADOS
  // --------------------------------------------------------------------
  ...nextVitals,
  ...nextTs,

  // --------------------------------------------------------------------
  // 2. ANÁLISIS CON INFORMACIÓN DE TIPOS
  //    Habilita el "type-aware linting": ESLint query el compilador de
  //    TypeScript para detectar errors que el análisis sintáctico solo no
  //    puede ver (ej.: un `await` faltante sobre una promesa).
  //    Se limita a los archivos .ts/.tsx incluidos en tsconfig.json.
  // --------------------------------------------------------------------
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // --------------------------------------------------------------------
  // 3. REGLAS DEL PROYECTO SmartPlan
  //    Se aplican sobre el código propio (src/). Cada bloque documenta
  //    qué problema previene.
  // --------------------------------------------------------------------
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      // ---- Seguridad de types ------------------------------------------
      // Prohíbe `any`: anula las garantías de TypeScript y esconde bugs.
      "@typescript-eslint/no-explicit-any": "error",
      // Prohíbe la aserción no-nula `!`, que puede provocar errors en runtime.
      "@typescript-eslint/no-non-null-assertion": "warn",

      // ---- Manejo de promesas (crítico: el front consume la API con axios)
      // Promesa sin await/catch: el error se pierde y la UI queda inconsistente.
      "@typescript-eslint/no-floating-promises": "error",
      // `await` sobre un valor que no es promesa: suele indicar un await mal puesto.
      "@typescript-eslint/await-thenable": "error",
      // Pasar una función async donde se espera una sincrónica (ej.: onClick).
      "@typescript-eslint/no-misused-promises": "error",

      // ---- Código muerto / descuidos ------------------------------------
      // Variables, imports y parámetros sin usar. Se permite el prefijo "_"
      // para descartes intencionales (ej.: `catch (_err)`).
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // `debugger` nunca debe llegar a un commit.
      "no-debugger": "error",
      // `console.log` de depuración fuera; se permiten warn/error para logs reales.
      "no-console": ["warn", { allow: ["warn", "error"] }],
      // `alert`/`confirm`/`prompt` bloquean el hilo y rompen la UX.
      "no-alert": "error",

      // ---- Buenas prácticas de JavaScript -------------------------------
      // Obliga `===` / `!==` y evita las coerciones implícitas de `==`.
      // Se exceptúa `== null` porque es el modismo aceptado para null|undefined.
      eqeqeq: ["error", "always", { null: "ignore" }],
      // Nada de `var`: usar let/const por el scope de bloque.
      "no-var": "error",
      // Si una variable no se reasigna, debe ser const.
      "prefer-const": "error",
      // Bloques `case` sin llaves pueden filtrar declaraciones al siguiente case.
      "no-case-declarations": "error",

      // ---- React / Next.js ----------------------------------------------
      // Dependencias incompletas en useEffect/useMemo/useCallback: causa
      // stale closures y renders desincronizados. Por defecto es warning,
      // acá se eleva a error por ser fuente frecuente de bugs.
      "react-hooks/exhaustive-deps": "error",
      // Obliga <Image> de next/image en place de <img> (optimización de LCP).
      "@next/next/no-img-element": "error",
      // Obliga <Link> de next/link para rutas internas (evita full reload).
      "@next/next/no-html-link-for-pages": "error",
    },
  },

  // --------------------------------------------------------------------
  // 4. EXCEPCIÓN PARA ARCHIVOS DE CONFIGURACIÓN
  //    Los .mjs de la raíz (este mismo archivo, postcss.config.mjs) no están
  //    dentro del proyecto de TypeScript, por lo que se los excluye del
  //    análisis con types para que el parser no falle.
  // --------------------------------------------------------------------
  {
    files: ["*.mjs", "*.js"],
    languageOptions: {
      parserOptions: {
        projectService: false,
      },
    },
  },

  // --------------------------------------------------------------------
  // 5. ARCHIVOS Y CARPETAS IGNORADOS
  //    Código generado o de terceros: no se analiza.
  // --------------------------------------------------------------------
  globalIgnores([
    ".next/**", // build de desarrolelo/producción de Next.js
    "out/**", // export estático
    "build/**", // artefactos de compilación
    "node_modules/**", // dependencias de terceros
    "next-env.d.ts", // types autogenerados por Next.js
    // Volcados de prototipo / referencia de diseño en la raíz del repo
    // (HTML y JSX sueltos, sin transpilar, fuera de `src/`). No son código
    // de la app y no deben romper `pnpm lint`.
    "v2/**",
    "standalone/**",
    "assets/**",
    "uploads/**",
    "fonts/**",
    "screenshots/**",
    "*.html",
  ]),
]);

export default eslintConfig;
