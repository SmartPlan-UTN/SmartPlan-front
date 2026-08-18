# SmartPlan Front

Frontend de SmartPlan — Proyecto Final 2026, UTN Facultad Regional Mendoza. El
backend vive en [`SmartPlan-back`](https://github.com/SmartPlan-UTN/SmartPlan-back).

## Requisitos

- **Node 24.** La versión está en [`.nvmrc`](.nvmrc) y en `devEngines` de
  `package.json`. Con nvm en macOS o Linux alcanza `nvm use`; nvm-windows no lee
  `.nvmrc`, así que ahí hay que instalar y activar la 24 a mano. No es un
  capricho: pnpm 11 no arranca abajo de Node 22.13 y el error que tira no lo
  explica (`ERR_UNKNOWN_BUILTIN_MODULE: node:sqlite`).
- **pnpm** no hace falta instalarlo a mano: la versión sale de `packageManager`
  en `package.json` y pnpm se cambia solo a ella.

## Cómo trabajar en este repositorio

| | Dónde |
|---|---|
| Convenciones del proyecto | [`skills/`](skills/) — empezá por [`00-proyecto`](skills/00-proyecto/SKILL.md) |
| Ramas, commits y PRs | [`skills/02-git-flow/SKILL.md`](skills/02-git-flow/SKILL.md) |
| **Qué significa "terminado"** | [`skills/02-git-flow/DEFINITION-OF-DONE.md`](skills/02-git-flow/DEFINITION-OF-DONE.md) |
| Estado de cada funcionalidad | [`SEGUIMIENTO.md`](SEGUIMIENTO.md) |

En corto:

1. Abrí el issue con la plantilla que corresponda: **caso de uso** para lo que
   sale de la matriz de trazabilidad, **bug** para algo que ya existe y falla.
   Las fundaciones (tooling, configuración, documentación) van en un issue en
   blanco, con el id entre corchetes.
2. Sacá la rama de `develop`: `SMART-<id>-<descripcion-en-kebab-case>`.
   **Nunca commitees parado en `main` ni en `develop`**: están protegidas.
3. Antes de abrir el PR, `pnpm lint`, `pnpm test` y `pnpm build` en verde.
4. Abrí el PR **con base `develop`**. La plantilla ya trae las tres secciones —
   qué hace, cómo probarlo, qué queda afuera —, el `Closes #NN` y la checklist de
   la Definition of Done. Necesita **2 aprobaciones**.
5. Actualizá tu fila en `SEGUIMIENTO.md`.

```bash
pnpm install      # instalar dependencias
pnpm dev          # servidor de desarrollo
pnpm build        # build de producción
pnpm lint         # análisis estático
pnpm lint:fix     # corregir lo autocorregible
pnpm test         # tests unitarios, una sola corrida
pnpm test:watch   # tests unitarios en modo watch
```

## Testing

Los tests unitarios usan Vitest, React Testing Library y jsdom. Se colocan junto
al código con el sufijo `.test.ts` o `.test.tsx`; `Button.test.tsx` y
`useToggle.test.ts` son los moldes iniciales para componentes y hooks.

Las convenciones completas están en
[`skills/07-testing/SKILL.md`](skills/07-testing/SKILL.md). Por ahora no hay un
umbral global de cobertura ni infraestructura end-to-end para el frontend.

## Tipografía

La fuente del proyecto es **Bricolage Grotesque**, self-hosted con
[`next/font/local`](https://nextjs.org/docs/app/api-reference/components/font).
La escala tipográfica está en
[`skills/06-design-system/SKILL.md`](skills/06-design-system/SKILL.md).

- El archivo variable vive en
  [`src/app/fonts/BricolageGrotesque-VariableFont_opsz_wdth_wght.ttf`](src/app/fonts/BricolageGrotesque-VariableFont_opsz_wdth_wght.ttf),
  bajado de [Google Fonts](https://fonts.google.com/specimen/Bricolage+Grotesque)
  bajo la [SIL Open Font License](https://openfontlicense.org/).
- Se carga una sola vez en [`src/app/layout.tsx`](src/app/layout.tsx) con
  `weight: "200 800"`: al ser una fuente variable, eso habilita todos los pesos
  del rango en lugar de un set fijo.
- El loader expone la familia como la variable CSS
  `--font-bricolage-grotesque`, mapeada a `--font-sans` de Tailwind en
  [`src/app/globals.css`](src/app/globals.css). Se usa con la utilidad
  `font-sans` y cualquier peso entre `font-extralight` (200) y `font-extrabold`
  (800).
- Geist y Geist Mono, que venían del template de `create-next-app`, se sacaron.

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
