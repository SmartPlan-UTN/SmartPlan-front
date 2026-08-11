---
name: smartplan-calidad
description: Análisis estático con ESLint — reglas activas, cómo correrlo y qué hacer ante un error. Consultar antes de desactivar una regla o silenciar un warning.
---

# SmartPlan — Calidad y análisis estático

## Herramienta

**ESLint 9** en formato *flat config* (`eslint.config.mjs`), el único formato
soportado por Next.js 16. Integración oficial vía `eslint-config-next`, con
análisis basado en tipos a través de `typescript-eslint`.

## Comandos

```bash
pnpm lint         # reporta errores y advertencias
pnpm lint:fix     # corrige lo autocorregible
```

**Corré `pnpm lint` antes de abrir un PR.** Un PR con errores de lint no debería
mergearse.

## Qué hay configurado

Sobre los presets `eslint-config-next/core-web-vitals` y
`eslint-config-next/typescript` se agregan reglas propias agrupadas por categoría:

| Categoría | Reglas | Por qué |
|---|---|---|
| Manejo de promesas | `no-floating-promises`, `await-thenable`, `no-misused-promises` | El front consume la API con axios; una promesa sin manejar pierde el error en silencio |
| Seguridad de tipos | `no-explicit-any` (error), `no-non-null-assertion` (warn) | `any` anula las garantías de TypeScript |
| Código muerto | `no-unused-vars`, `no-debugger`, `no-console`, `no-alert` | Descuidos que no deberían llegar a un commit |
| Buenas prácticas | `eqeqeq`, `no-var`, `prefer-const`, `no-case-declarations` | Evitan coerciones implícitas y scope accidental |
| React / Next.js | `exhaustive-deps` (elevada a error), `no-img-element`, `no-html-link-for-pages` | Stale closures y métricas de Core Web Vitals |

El archivo `eslint.config.mjs` tiene cada regla comentada con el problema que
previene. **Leelo antes de tocarlo.**

## Análisis con información de tipos

La configuración habilita `projectService`, lo que hace que ESLint consulte al
compilador de TypeScript. Eso permite detectar errores que el análisis sintáctico
solo no ve — el caso típico es una promesa sin `await`.

Consecuencia práctica: los archivos `.mjs` de la raíz están excluidos del análisis
con tipos porque no pertenecen al proyecto de TypeScript. Si agregás un archivo de
configuración nuevo en la raíz y el parser falla, es por esto.

## Qué hacer ante un error de lint

En orden de preferencia:

1. **Arreglar el código.** Es lo correcto en la enorme mayoría de los casos.
2. Si la variable no se usa a propósito, prefijala con `_`:
   ```ts
   } catch (_error) {
   ```
3. Si de verdad hay que ignorar una línea, usá un disable **con motivo escrito**:
   ```ts
   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- la librería X no exporta el tipo
   ```

**No desactives una regla en `eslint.config.mjs` para que deje de molestar.** Si
una regla genera ruido sistemático, discutilo en el PR y documentá el motivo del
cambio.

## Convenciones que ESLint no chequea

- Nombres del dominio en español (ver `skills/01-dominio/`).
- Sin credenciales ni URLs hardcodeadas: todo por variables de entorno.
- Sin `console.log` de depuración (ESLint avisa, pero solo como warning).
- Componentes chicos y con una responsabilidad clara.
