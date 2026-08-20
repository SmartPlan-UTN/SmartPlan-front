---
name: smartplan-git-flow
description: Reglas de ramas, protección, pull requests, mensajes de commit, plantillas de issue y Definition of Done. Consultar antes de cualquier operación de git y antes de dar una tarea por terminada.
---

# SmartPlan — Flujo de trabajo con Git

> Núcleo compartido. Este archivo es idéntico en `SmartPlan-front` y `SmartPlan-back`.
> Si lo modificás, replicá el cambio en el otro repositorio.

## Regla número uno

**Nunca commitear parado en `main` ni en `develop`.** Ambas están protegidas en
GitHub y el push va a ser rechazado con `GH006: Protected branch update failed`.

Si ya commiteaste en la rama equivocada, no hace falta perder el trabajo:

```bash
git switch -c <nombre-de-rama>      # el commit se lleva a la rama nueva
git branch -f main origin/main      # main vuelve a donde está el remoto
```

## Estructura de ramas

```
main        producción. Protegida. Solo recibe merges desde develop.
develop     integración. Protegida. Base de todas las ramas de trabajo.
<rama>      trabajo del día a día. Sale de develop y vuelve a develop por PR.
```

## Protección de ramas (configurada en GitHub)

Aplica a `main` y a `develop`:

- Require a pull request before merging
- Require approvals — **2 aprobaciones**
- Dismiss stale pull request approvals when new commits are pushed
- Do not allow bypassing the above settings

O sea: no hay atajos, ni siquiera para los administradores. Todo entra por PR con
dos revisiones.

## Nombres de rama

```
SMART-<id-del-ticket>-<descripción-corta-en-kebab-case>
```

El `<id-del-ticket>` es el identificador del ticket en el sprint, el mismo que va
entre corchetes en el título del issue. El issue `[F02] Configuracion por
variables de entorno` da:

```
SMART-f02-configuracion-por-variables-de-entorno
```

Ejemplo de la etapa en que el id salía de Jira:
`SMART-5-mecanismo-de-seguimiento-indicadores-reuniones`. El prefijo `SMART-` se
mantiene; lo que cambió es de dónde sale el identificador.

> ⚠️ **El botón "Create a branch" del issue no da este formato.** GitHub arma el
> nombre con el número del issue y el título slugificado
> (`24-f02-configuracion-por-variables-de-entorno`). Si usás el botón, renombrá
> antes de empezar:
>
> ```bash
> git branch -m SMART-f02-configuracion-por-variables-de-entorno
> ```
>
> No perdés nada: el vínculo con el issue lo hace el `Closes #NN` del PR, no el
> nombre de la rama.

Si la tarea no tiene ticket, usá un prefijo descriptivo:

```
feature/<descripción>     funcionalidad nueva
fix/<descripción>         corrección de bug
docs/<descripción>        documentación
chore/<descripción>       configuración, dependencias, tooling
```

## Ciclo de trabajo

```bash
git switch develop
git pull
git switch -c SMART-fXX-descripcion

# ... trabajar, commitear ...

pnpm lint                 # el PR no debería llevar errores de lint
git push -u origin SMART-fXX-descripcion
```

Después abrir el PR **con base `develop`** (no `main`) desde GitHub, y cerrar el
issue desde el PR con `Closes #NN` en la descripción.

## Mensajes de commit

En español, en imperativo, y **referenciando el caso de uso cuando aplique**.
El número del issue va en el PR (`Closes #NN`), no hace falta repetirlo en cada
commit.
La trazabilidad CU → código es un requisito de la documentación del proyecto.

```
Implementar generación de plan automático (CU17)

Agrega el endpoint POST /api/planes/generar y el servicio que combina
actividades según presupuesto y tiempo disponible.
```

Para trabajo sin CU asociado (configuración, tooling, documentación), alcanza con
una línea descriptiva:

```
Configurar analizador de código estático con ESLint
```

## Descripción del PR

Un PR tiene que responder tres cosas:

1. **Qué hace** — y qué CU / US cubre.
2. **Cómo probarlo** — comandos concretos.
3. **Qué queda afuera** — si algo del alcance no entró, decirlo.

No hace falta escribirlas de memoria: al abrir el PR, GitHub carga
[`.github/pull_request_template.md`](../../.github/pull_request_template.md) con
esas tres secciones, el `Closes #` y la checklist de la Definition of Done.
**No borres las secciones que no usaste**: poné "Nada" y listo. Un PR con la
plantilla vaciada obliga a quien revisa a leer el diff para entender qué mira.

## Plantillas de issue

Están en [`.github/ISSUE_TEMPLATE/`](../../.github/ISSUE_TEMPLATE/):

| Plantilla | Para qué | Título que genera |
|---|---|---|
| `use-case.yml` | Funcionalidad que sale de la matriz de trazabilidad | `[CU00] ` |
| `bug.yml` | Algo ya implementado que falla en `develop` | `[BUG] ` |

El trabajo de fundaciones (tooling, configuración, documentación) **no entra en
ninguna de las dos**: no sale de la matriz de trazabilidad. Para eso están los
issues en blanco, que quedan habilitados a propósito
([`config.yml`](../../.github/ISSUE_TEMPLATE/config.yml)); el título va igual con
el id entre corchetes, `[F21]`.

El id entre corchetes no es decorativo: **de ahí sale el nombre de la rama**
(`SMART-f21-...`), y es lo que mantiene la cadena issue → rama → PR → commit.

Las plantillas ponen solo las labels del repositorio (`frontend`, y `bug` en el
caso de los bugs). El label de módulo (`auth`, `busqueda`, `coleccion`…) y el de
puntos (`pts: 3`) se asignan en el refinamiento, no los pone quien abre el issue.

> GitHub **ignora en silencio** las labels que una plantilla pide y no existen en
> el repositorio. Si agregás una a la plantilla, creala antes en
> Settings → Labels.

## Definition of Done

Qué significa "terminado" está en
[`DEFINITION-OF-DONE.md`](DEFINITION-OF-DONE.md), en esta misma carpeta.
Acordada en el refinamiento del Sprint 0 y vigente en los dos repositorios.

En corto: criterios de aceptación cumplidos, `pnpm lint` sin errores, build en
verde, sin secretos, `TRACKING.md` actualizado, PR con las tres secciones y
`Closes #NN`, y 2 aprobaciones. El detalle y el motivo de cada punto están en ese
archivo — **leelo entero una vez** y después alcanza con la checklist del PR.

## Qué no hacer

- No commitear en `main` ni en `develop`.
- No hacer `git push --force` sobre ramas compartidas.
- No mergear tu propio PR sin las 2 aprobaciones.
- No commitear `.env`, credenciales ni claves de API.
- No commitear `node_modules/` ni `.next/`.
- No cerrar un issue que no cumpla la Definition of Done.
- No vaciar la plantilla del PR ni la del issue para "ir más rápido".
