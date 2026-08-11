<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

> El bloque de arriba lo mantiene el tooling de Next.js. No lo edites a mano ni le
> saques los marcadores.

# SmartPlan Front — Instrucciones para agentes de IA

Este archivo es el punto de entrada. Lo leen Claude Code (vía `CLAUDE.md`),
Codex (`AGENTS.md`) y GitHub Copilot (vía `.github/copilot-instructions.md`).

## Qué es SmartPlan

Aplicación web que genera automáticamente planes recreativos personalizados según
presupuesto, ubicación, tiempo disponible, tipo de salida y preferencias del
usuario. Proyecto Final 2026 — UTN Facultad Regional Mendoza.

Este repositorio es el **frontend**. El backend vive en `SmartPlan-back`
(NestJS + API REST + JWT).

## Antes de escribir código, leé esto

| Archivo | Cuándo consultarlo |
|---|---|
| [`skills/00-proyecto/SKILL.md`](skills/00-proyecto/SKILL.md) | Siempre primero: qué es el sistema, alcance, módulos, equipo, stack |
| [`skills/01-dominio/SKILL.md`](skills/01-dominio/SKILL.md) | Antes de nombrar tablas, endpoints, rutas, tipos o componentes |
| [`skills/02-git-flow/SKILL.md`](skills/02-git-flow/SKILL.md) | Antes de cualquier operación de git |
| [`skills/03-frontend/SKILL.md`](skills/03-frontend/SKILL.md) | Antes de escribir un componente o una página |
| [`skills/04-calidad/SKILL.md`](skills/04-calidad/SKILL.md) | Antes de desactivar una regla de lint o silenciar un warning |
| [`skills/05-arquitectura/SKILL.md`](skills/05-arquitectura/SKILL.md) | Antes de agregar un servicio, una integración externa o un proceso en segundo plano |
| [`skills/06-design-system/SKILL.md`](skills/06-design-system/SKILL.md) | Antes de escribir un estilo, elegir un color o maquetar un componente |
| [`SEGUIMIENTO.md`](SEGUIMIENTO.md) | Para saber en qué estado está cada funcionalidad |

> **Si estás corriendo como Claude Code:** estos mismos archivos también están
> publicados como skills nativas autodescubribles en `.claude/skills/`, y se
> cargan solos según lo que estés haciendo — no hace falta que sigas los links
> de la tabla a mano. `skills/` sigue siendo la fuente real; `.claude/skills/`
> es una copia sincronizada por un hook de pre-commit. Ver
> [`skills/README.md`](skills/README.md) si vas a editar contenido.

## Dos tipos de skill: negocio y habilidad técnica

Hay dos categorías distintas bajo `.claude/skills/`, y no se mezclan:

| Categoría | Prefijo / origen | Qué define |
|---|---|---|
| **Reglas del proyecto** | `smartplan-*`, fuente en `skills/` de este repo | Cómo es SmartPlan: dominio, nombres, git flow, arquitectura, convenciones propias |
| **Habilidades técnicas** | Sin prefijo, instaladas de paquetes externos vía `npx skills add`, fuente en `.agents/skills/` | Cómo ejecutar bien una tarea genérica (armar UI, animar, revisar React) — no son específicas de SmartPlan |

Las de negocio dicen **qué construir y cómo se llama**. Las técnicas dicen
**cómo construirlo bien**. Si hay conflicto entre ambas (p. ej. una skill
técnica sugiere inglés y `smartplan-dominio` pide español), **gana la regla del
proyecto**.

### Habilidades técnicas instaladas

| Skill | De dónde | Cuándo se activa |
|---|---|---|
| `shadcn` | [shadcn-ui/ui](https://github.com/shadcn-ui/ui) | Agregar, buscar o componer componentes de UI |
| `emil-design-eng` | [emilkowalski/skills](https://github.com/emilkowalski/skills) | Pulido de interfaz: animaciones, sombras, micro-interacciones, sensación general |
| `improve-react` | [millionco/react-doctor](https://github.com/millionco/react-doctor) | Auditoría de calidad de código React a nivel de codebase completo |
| `better-ui` | [jakubkrehel/skills](https://github.com/jakubkrehel/skills) | Revisión de interfaz: layout, tipografía, accesibilidad, color |
| `frontend-design` | [anthropics/skills](https://github.com/anthropics/skills) | Dirección estética al construir o rediseñar UI, para que no se vea "genérica" |

Se instalan y actualizan con `npx skills add <repo> --skill <nombre>` /
`npx skills update`. Fuente real en `.agents/skills/` (universal, la lee
cualquier agente); `.claude/skills/` es un symlink que gestiona esa misma CLI,
no lo edites a mano.

## Reglas que no se negocian

1. **Nunca commitees en `main` ni en `develop`.** Están protegidas y requieren PR
   con 2 aprobaciones. Trabajá siempre en una rama que salga de `develop`.
2. **Los nombres del dominio van en español.** Un `plan` es `plan`, no
   `Itinerary`. Ver `skills/01-dominio/`.
3. **Usá pnpm**, no npm ni yarn.
4. **Corré `pnpm lint` antes de dar por terminado un cambio.**
5. **Toda promesa se maneja.** ESLint tiene `no-floating-promises` en error.
6. **Nada de credenciales, tokens ni URLs hardcodeadas.** Variables de entorno.
7. **Referenciá el caso de uso (CU) en commits y PRs** cuando la tarea tenga uno.

## Estado del repositorio

Está en **scaffold**: solo el template de `create-next-app`. No hay lógica de
negocio implementada. Antes de asumir que algo existe, buscalo en el código.

## Comandos

```bash
pnpm install      # instalar dependencias
pnpm dev          # servidor de desarrollo
pnpm build        # build de producción
pnpm lint         # análisis estático
pnpm lint:fix     # corregir lo autocorregible
```

## Cuando termines una tarea

Actualizá la fila correspondiente en [`SEGUIMIENTO.md`](SEGUIMIENTO.md): estado,
fecha, rama y PR. Es lo que permite que el siguiente agente (o la siguiente
persona) retome sin releer todo el historial.
