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
| [`skills/02-git-flow/SKILL.md`](skills/02-git-flow/SKILL.md) | Antes de cualquier operación de git y antes de abrir un issue o un PR |
| [`skills/02-git-flow/DEFINITION-OF-DONE.md`](skills/02-git-flow/DEFINITION-OF-DONE.md) | Antes de dar una tarea por terminada |
| [`skills/03-frontend/SKILL.md`](skills/03-frontend/SKILL.md) | Antes de escribir un componente o una página |
| [`skills/04-calidad/SKILL.md`](skills/04-calidad/SKILL.md) | Antes de desactivar una regla de lint o silenciar un warning |
| [`skills/05-arquitectura/SKILL.md`](skills/05-arquitectura/SKILL.md) | Antes de agregar un servicio, una integración externa o un proceso en segundo plano |
| [`skills/06-design-system/SKILL.md`](skills/06-design-system/SKILL.md) | Antes de escribir un estilo, elegir un color o maquetar un componente |
| [`skills/07-testing/SKILL.md`](skills/07-testing/SKILL.md) | Antes de agregar o modificar tests de componentes y hooks |
| [`SEGUIMIENTO.md`](SEGUIMIENTO.md) | Para saber en qué estado está cada funcionalidad |

## Reglas que no se negocian

1. **Nunca commitees en `main` ni en `develop`.** Están protegidas y requieren PR
   con 2 aprobaciones. Trabajá siempre en una rama que salga de `develop`.
2. **Los nombres del dominio van en español.** Un `plan` es `plan`, no
   `Itinerary`. Ver `skills/01-dominio/`.
3. **Usá pnpm**, no npm ni yarn, y **Node 24** (`.nvmrc`). Abajo de Node 22.13
   pnpm ni siquiera arranca.
4. **Corré `pnpm lint`, `pnpm test` y `pnpm build` antes de dar por terminado un cambio.**
5. **Toda promesa se maneja.** ESLint tiene `no-floating-promises` en error.
6. **Nada de credenciales, tokens ni URLs hardcodeadas.** Variables de entorno.
7. **Referenciá el caso de uso (CU) en commits y PRs** cuando la tarea tenga uno.

## Estado del repositorio

Están las **fundaciones**: tokens y primitivos del design system, tipos del
dominio, cliente HTTP con JWT, testing y —desde F19— la estructura de carpetas,
el layout con la navbar y las rutas protegidas.

**Ningún caso de uso está implementado todavía**: las pantallas existen como
marcadores (`PantallaPendiente`) para que la navegación se pueda recorrer. Antes
de asumir que algo existe, buscalo en el código y mirá [`SEGUIMIENTO.md`](SEGUIMIENTO.md).

## Comandos

```bash
pnpm install      # instalar dependencias
pnpm dev          # servidor de desarrollo
pnpm build        # build de producción
pnpm lint         # análisis estático
pnpm lint:fix     # corregir lo autocorregible
pnpm test         # tests unitarios, una sola corrida
pnpm test:watch   # tests unitarios en modo watch
```

## Cuando termines una tarea

Verificá la [Definition of Done](skills/02-git-flow/DEFINITION-OF-DONE.md) antes
de decir que está lista. La checklist corta viene cargada en el PR.

Actualizá la fila correspondiente en [`SEGUIMIENTO.md`](SEGUIMIENTO.md): estado,
fecha, rama y PR. Es lo que permite que el siguiente agente (o la siguiente
persona) retome sin releer todo el historial.
