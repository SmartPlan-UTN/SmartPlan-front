# SEGUIMIENTO — SmartPlan Front

Estado de avance del repositorio. Es la memoria del proyecto entre sesiones: quien
llegue acá (persona o agente de IA) debería poder retomar sin releer todo el
historial de git.

---

## Cómo actualizar este archivo

**Actualizalo cuando termines una tarea, no cuando la empezás.**

1. Buscá la fila del CU o de la tarea en la que trabajaste.
2. Cambiá el **Estado** según la tabla de abajo.
3. Completá **Rama** y **PR**.
4. Si tomaste una decisión técnica que no es obvia leyendo el código, agregala en
   [Decisiones](#decisiones).
5. Agregá una línea en la [Bitácora](#bitácora) con la fecha.

### Estados

| Estado | Significa |
|---|---|
| `No iniciado` | Nadie lo tomó todavía |
| `En progreso` | Hay una rama abierta con trabajo real |
| `En revisión` | PR abierto, esperando las 2 aprobaciones |
| `Finalizado` | Mergeado a `develop` |
| `Bloqueado` | No se puede avanzar; el motivo va en Notas |

### Reglas

- Un CU solo pasa a `Finalizado` cuando el PR está **mergeado**, no cuando está abierto.
- Si un CU necesita backend, la fila del front no se marca `Finalizado` hasta que
  el endpoint exista y esté integrado.
- No borres filas. Si algo se descarta, marcalo `Bloqueado` y explicá por qué.
- Las fechas en formato `AAAA-MM-DD`.

---

## Estado global

| | |
|---|---|
| **Fase** | Fundaciones — layout y navegación listos, sin casos de uso implementados |
| **Rama base** | `develop` |
| **Última actualización** | 2026-08-19 |
| **Casos de uso finalizados** | 0 / 62 |

---

## Infraestructura y configuración

| Tarea | Estado | Rama | PR | Notas |
|---|---|---|---|---|
| Repositorio inicial (create-next-app) | `Finalizado` | — | — | Next.js 16.2.3, React 19, Tailwind 4 |
| Protección de ramas `main` y `develop` | `Finalizado` | — | — | PR obligatorio + 2 aprobaciones |
| Análisis estático con ESLint | `En revisión` | `feature/eslint-analisis-estatico` | — | Config comentada + scripts `lint` / `lint:fix` |
| Skills y convenciones para agentes de IA | `En progreso` | `docs/skills-agentes-ia` | — | Este archivo y la carpeta `skills/` |
| [F21] Definition of Done y plantillas de issue y PR | `En revisión` | `SMART-f21-definition-of-done-y-plantillas-de-issue-y-pr` | #73 | DoD en `skills/02-git-flow/`, plantillas en `.github/`. Falta replicar el núcleo compartido en `SmartPlan-back` |
| Assets del design system en el repo | `En progreso` | `docs/skills-agentes-ia` | — | Logos, fuente, `tokens.css` e imágenes de ejemplo |
| [F14] Cablear Bricolage Grotesque | `Finalizado` | `SmartPlan_AlvaroAriza_FrontEnd` | #74 | Cargada con `next/font/local` en `layout.tsx` y mapeada a `--font-sans` en `globals.css`. Geist y Geist Mono afuera |
| [F15] Importar `tokens.css` en `globals.css` | `En progreso` | `SmartPlan_AlvaroAriza_dv` | — | Expuesto a Tailwind 4 con `@theme inline` (colores y radios). Se sacó el `@font-face` propio de `tokens.css` y `--font` ahora usa `var(--font-bricolage-grotesque)`. `page.tsx` (único componente existente) se migró a las utilidades nuevas, sin hex ni colores por defecto de Tailwind |
| [F20] Testing del frontend: configuración y ejemplos | `En revisión` | `SMART-f20-testing-del-frontend-configuracion-y-ejemplos` | #77 | Vitest + React Testing Library; moldes para Button y useToggle; CI con lint, test y build. Sube el piso de Node a 24 |
| [F18] Tipos del dominio en TypeScript | `En revisión` | `feature/f18-tipos-dominio` | #68 | Fundación de los 37 tipos del dominio en `src/types/` alineados con backend TypeORM |
| Portar los primitivos a React + TS | `No iniciado` | — | — | Button, Chip, Badge y Card desde `Primitives.jsx` |
| [F16] Portar los 7 primitivos a React + TS | `En revisión` | `SMART-f16-primitivos-design-system` | #76 | Icon, Button, Chip, Badge, Stars, Logo y Divider tipados, basados en EMBER v2 |
| [F17] Cliente axios centralizado (`src/lib/api/`) | `Finalizado` | `Smart-f17-cliente-axios-centralizado-con-interceptor-de-jwt` | — | Con interceptor para JWT, abstracción TokenGetter, normalización ApiError y manejo pub/sub de 401 |
| [F17] Variables de entorno (`NEXT_PUBLIC_API_URL`) | `Finalizado` | `Smart-f17-cliente-axios-centralizado-con-interceptor-de-jwt` | — | Plantilla `.env.example` agregada e integración dinámica en `config.ts` |
| [F19] Estructura de carpetas, layout base y navbar | `En progreso` | `SMART-f19-estructura-de-carpetas-layout-base-y-navbar` | — | Grupos `(auth)`, `(main)` y `(privado)` en `src/app/`, navbar de 60px con `backdrop-filter`, menú de usuario, mapa de rutas en `src/lib/rutas.ts`, sesión en `src/lib/auth/` y guardián `RutaProtegida`. Las pantallas son marcadores hasta que se implemente cada CU |
| [F06] Integración continua: lint y tests en cada PR | `En revisión` | `SMART-f06-integracion-continua-lint-y-tests-en-prs` | Ref [`SmartPlan-back#28`](https://github.com/SmartPlan-UTN/SmartPlan-back/issues/28) | El `ci.yml` de F20 ya cubría lint/test/build en push+PR contra develop/main; este ticket alinea el job id a `ci` (antes `quality`) y el setup a `pnpm/action-setup` + `actions/setup-node` con `node-version-file: '.nvmrc'` (antes `pnpm/setup` compuesto), mismo patrón que `SmartPlan-back`. La fila de "Protección de ramas" de arriba dice `Finalizado` pero no había evidencia de que el check estuviera marcado como status check obligatorio — F06 lo confirma/configura. Falta el paso manual en GitHub (nombre exacto del check tras la primera corrida) y abrir el PR |

---

## Casos de uso

Los 62 CU del sistema. La columna **Pantalla** viene de la matriz de trazabilidad
del documento (`skills/01-dominio/`).

### Autenticación y control de acceso

| CU | Funcionalidad | Pantalla | Estado | Rama | PR |
|---|---|---|---|---|---|
| CU1 | Iniciar sesión | — | `No iniciado` | | |
| CU2 | Registrar usuario | — | `No iniciado` | | |
| CU3 | Recuperar contraseña | — | `No iniciado` | | |
| CU4 | Cerrar sesión | — | `No iniciado` | | |

### Gestión de usuarios

| CU | Funcionalidad | Pantalla | Estado | Rama | PR |
|---|---|---|---|---|---|
| CU5 | Editar perfil | PAN 14 | `No iniciado` | | |
| CU6 | Cambiar contraseña | — | `No iniciado` | | |
| CU7 | Eliminar cuenta | PAN 14 | `No iniciado` | | |
| CU8 | Editar preferencias | PAN 15 | `No iniciado` | | |

### Búsqueda y exploración

| CU | Funcionalidad | Pantalla | Estado | Rama | PR |
|---|---|---|---|---|---|
| CU9 | Buscar actividades | PAN 11 | `No iniciado` | | |
| CU10 | Filtrar resultados | PAN 11 | `No iniciado` | | |
| CU11 | Ordenar resultados | PAN 11 | `No iniciado` | | |
| CU12 | Buscar planes | PAN 10, PAN 11 | `No iniciado` | | |
| CU13 | Consultar plan | PAN 17 | `No iniciado` | | |
| CU14 | Consultar actividad | PAN 18 | `No iniciado` | | |
| CU15 | Guardar actividad | PAN 18, PAN 12 | `No iniciado` | | |
| CU16 | Visualizar actividades en mapa | PAN 08 | `No iniciado` | | |

### Recomendación

| CU | Funcionalidad | Pantalla | Estado | Rama | PR |
|---|---|---|---|---|---|
| CU17 | Generar plan automático | PAN 07 | `No iniciado` | | |
| CU18 | Personalizar preferencias de usuario | PAN 15 | `No iniciado` | | |
| CU19 | Generar plan sorpresa | PAN 09 | `No iniciado` | | |
| CU20 | Mostrar recomendaciones | PAN 10 | `No iniciado` | | |
| CU21 | Ajustar recomendaciones según historial | — | `No iniciado` | | |
| CU22 | Seleccionar plan | PAN 11, PAN 17 | `No iniciado` | | |
| CU23 | Registrar retroalimentación del plan | PAN 13, PAN 17 | `No iniciado` | | |

### Planificación

| CU | Funcionalidad | Pantalla | Estado | Rama | PR |
|---|---|---|---|---|---|
| CU24 | Crear plan | — | `No iniciado` | | |
| CU25 | Editar plan | PAN 17 | `No iniciado` | | |
| CU26 | Eliminar plan | PAN 17 | `No iniciado` | | |
| CU27 | Agregar actividad al plan | PAN 17, PAN 18 | `No iniciado` | | |
| CU28 | Quitar actividad de plan | PAN 17 | `No iniciado` | | |
| CU29 | Visualizar plan | PAN 17 | `No iniciado` | | |
| CU30 | Calcular costo del plan | PAN 17 | `No iniciado` | | |
| CU31 | Generar plan sugerido | — | `No iniciado` | | |

### Colección

| CU | Funcionalidad | Pantalla | Estado | Rama | PR |
|---|---|---|---|---|---|
| CU32 | Crear colección | — | `No iniciado` | | |
| CU33 | Editar colección | — | `No iniciado` | | |
| CU34 | Eliminar colección | — | `No iniciado` | | |
| CU35 | Agregar actividad a colección | PAN 18 | `No iniciado` | | |
| CU36 | Quitar actividad de colección | — | `No iniciado` | | |
| CU37 | Ver detalle de colección | — | `No iniciado` | | |
| CU38 | Ver colección | — | `No iniciado` | | |

### Favoritos

| CU | Funcionalidad | Pantalla | Estado | Rama | PR |
|---|---|---|---|---|---|
| CU39 | Ver actividades guardadas | PAN 12 | `No iniciado` | | |
| CU40 | Ver planes guardados | PAN 12 | `No iniciado` | | |
| CU41 | Quitar actividad guardada | PAN 12 | `No iniciado` | | |
| CU42 | Quitar plan guardado | PAN 12 | `No iniciado` | | |
| CU43 | Guardar plan favorito | PAN 11, PAN 12, PAN 17 | `No iniciado` | | |

### Valoraciones

| CU | Funcionalidad | Pantalla | Estado | Rama | PR |
|---|---|---|---|---|---|
| CU44 | Valorar actividad | PAN 18 | `No iniciado` | | |
| CU45 | Ver valoraciones | PAN 18 | `No iniciado` | | |
| CU46 | Editar valoración | — | `No iniciado` | | |
| CU47 | Eliminar valoración | — | `No iniciado` | | |

### Integración externa

> Estos CU son responsabilidad principal del backend. Acá se registran solo si el
> front necesita algo de ellos.

| CU | Funcionalidad | Estado | Rama | PR |
|---|---|---|---|---|
| CU48 | Obtener datos de lugares | `No iniciado` | | |
| CU49 | Sincronizar información externa | `No iniciado` | | |
| CU50 | Actualizar datos de actividades | `No iniciado` | | |
| CU51 | Registrar datos externos utilizados | `No iniciado` | | |
| CU52 | Obtener valoraciones externas | `No iniciado` | | |

### Administración

| CU | Funcionalidad | Pantalla | Estado | Rama | PR |
|---|---|---|---|---|---|
| CU53 | Gestionar actividades | PAN 21 | `No iniciado` | | |
| CU54 | Gestionar categorías | — | `No iniciado` | | |
| CU55 | Moderar valoraciones | PAN 20 | `No iniciado` | | |
| CU56 | Eliminar contenido | — | `No iniciado` | | |
| CU57 | Administrar usuarios | PAN 19 | `No iniciado` | | |
| CU58 | Visualizar métricas del sistema | REP-01 | `No iniciado` | | |
| CU59 | Revisar sugerencia de usuario | — | `No iniciado` | | |
| CU60 | Gestionar planes | PAN 22 | `No iniciado` | | |
| CU61 | Gestionar permisos | — | `No iniciado` | | |
| CU62 | Gestionar roles | — | `No iniciado` | | |

---

## Decisiones

Decisiones técnicas tomadas y su motivo. Sirve para no rediscutir lo mismo dos veces.

| Fecha | Decisión | Motivo |
|---|---|---|
| 2026-08-06 | ESLint como analizador estático | Estándar del ecosistema TS/JS, integración oficial con Next.js, análisis con tipos, sin infraestructura adicional (a diferencia de SonarQube) |
| 2026-08-06 | Análisis de ESLint con información de tipos (`projectService`) | Permite detectar promesas sin manejar, que es el error más probable al consumir la API con axios |
| 2026-08-06 | Nombres del dominio en español | Coinciden con la matriz de trazabilidad del documento entregable; traducirlos rompería la trazabilidad CU → código |
| 2026-08-11 | Plantillas de issue en formato *issue forms* (`.yml`) y no en Markdown | Los campos se pueden marcar obligatorios, así que un issue no se abre sin criterios de aceptación ni sin pasos para reproducir. Con Markdown el formulario se borra y nadie se entera |
| 2026-08-11 | Los issues en blanco quedan habilitados | El trabajo de fundaciones no sale de la matriz de trazabilidad y no entra en ninguna de las dos plantillas. Deshabilitarlos obligaría a forzar issues de fundaciones dentro de la plantilla de caso de uso |
| 2026-08-11 | La Definition of Done vive en `skills/02-git-flow/DEFINITION-OF-DONE.md` y no en el wiki | El wiki no se versiona con el código ni se revisa por PR. Acá cambia con las mismas 2 aprobaciones que cualquier otro cambio |
| 2026-08-11 | La DoD incluye los criterios del back aunque este sea el repo del front | Es un acuerdo del equipo, no del repositorio, y el archivo es núcleo compartido: se replica verbatim en `SmartPlan-back` |
| 2026-08-17 | Vitest + React Testing Library para tests unitarios del frontend | Es la integración documentada por Next.js, permite probar componentes y hooks con jsdom y mantiene una API rápida para desarrollo y CI |
| 2026-08-18 | El frontend exige Node 24 (`devEngines.runtime` en `package.json`, `.nvmrc`) | pnpm 11 —la versión fijada en `packageManager`— no arranca abajo de Node 22.13: tira `ERR_UNKNOWN_BUILTIN_MODULE: node:sqlite` antes de poder validar nada. Se fija 24 y no el piso 22.13 para que las máquinas corran exactamente la misma versión que CI, que toma el dato del mismo campo |
| 2026-08-18 | Las rutas privadas se protegen en el cliente, no en `proxy.ts` | El JWT vive en `localStorage`, que el servidor no ve: ningún Server Component ni `proxy.ts` puede saber si hay sesión. `RutaProtegida` es una barrera de navegación; quien autoriza de verdad es el back en cada request. Si CU1 mueve el token a una cookie `httpOnly`, la comprobación se puede pasar al servidor sin tocar las pantallas |
| 2026-08-18 | Una pantalla se protege por dónde vive: el grupo `(privado)` | El layout del grupo envuelve todo lo que cuelga de él en `RutaProtegida`. Envolver pantalla por pantalla depende de que nadie se olvide, y olvidarse deja una pantalla privada abierta sin que nada falle |
| 2026-08-18 | El ancho máximo del contenido lo pone la pantalla (`Contenedor`), no el layout | El hero del inicio y la espera de generación de plan van a fondo completo. Con el contenedor en el layout, esas pantallas tendrían que pelearse con él o forzar un cambio que toca a todas. El grupo `(privado)` y `admin/` sí lo ponen en su layout porque ninguna de sus pantallas es a fondo completo |
| 2026-08-18 | Las URLs se centralizan en `src/lib/rutas.ts` | Un string de ruta escrito a mano en un `<Link>` sobrevive al renombre de la carpeta y falla recién en runtime; la constante rompe la compilación |
| 2026-08-18 | Favoritos e Historial se muestran en la navbar también sin sesión | Esconder los enlaces deja la aplicación sin pistas de qué hay detrás de la cuenta. Quien entre sin sesión llega a la ruta y el guardián lo manda al login conservando el destino en `?redirect=` |
| 2026-08-18 | Claves de catálogos mediante uniones literales | Evita incompatibilidad estructural entre catálogos (`EstadoUsuario`, `Rol`, etc.) y previene claves inválidas en TypeScript. Verificado contra `SmartPlan-back` commit `8ec4d07a34d2058f2147220e69d494e4da183811` y `openai` corregido a `gemini`. |

---

## Pendientes conocidos

Cosas detectadas que todavía no tienen dueño:

- **Dos design systems conviven** en la carpeta `SmartPlanSystemDesign`: la v1
  (Ink / Lime / Violet) quedó obsoleta y la v2 "EMBER" es la vigente. Conviene
  borrar la v1 para que nadie la tome por error.
- **La escala tipográfica del documento no coincide con el design system**: la
  Etapa 5 dice H1 42px / H2 32px / H3 24px, y la v2 usa 50 / 36 / 26. Actualizar
  el documento.
- **El brief de marca está escrito para España**: trata de "tú" y usa euros. El
  proyecto es de Mendoza y los criterios de aceptación del documento usan voseo y
  pesos. Definir la variante con el equipo y corregir el brief.
- El motor de base de datos concreto no está definido en la documentación, que
  solo dice "base de datos relacional".
- El núcleo de `skills/` (`00-proyecto`, `01-dominio`, `02-git-flow`) está
  duplicado en `SmartPlan-back`. Al modificarlo, replicar en el otro repositorio.
- **Pendiente de replicar en `SmartPlan-back`** (F21): `DEFINITION-OF-DONE.md`,
  las secciones nuevas de `02-git-flow/SKILL.md` y las plantillas de
  `.github/` adaptadas al back (`pnpm test`, DTOs, migraciones). Va en un PR
  aparte, en el otro repositorio.
- Las plantillas de issue solo aplican labels que ya existen (`frontend`, `bug`):
  GitHub ignora en silencio las que no existen. Si el equipo quiere un label
  `caso de uso`, hay que crearlo en Settings → Labels **antes** de agregarlo a
  la plantilla.

---

## Bitácora

| Fecha | Qué pasó |
|---|---|
| 2026-08-06 | Configuración de ESLint 9 con reglas propias del proyecto. Primera corrida: 0 errores, 0 advertencias (scaffold sin código propio). |
| 2026-08-06 | Creación de `skills/` y de este archivo de seguimiento. |
| 2026-08-11 | F21: Definition of Done acordada, plantillas de issue (caso de uso y bug) y de PR en `.github/`. El núcleo de `02-git-flow` quedó sincronizado con el del back, que estaba más nuevo. |
| 2026-08-16 | F15: `tokens.css` importado en `globals.css` y expuesto a Tailwind 4 vía `@theme inline` (colores y radios). Se eliminó el `@font-face` duplicado de `tokens.css` y `page.tsx` se migró a las utilidades nuevas, sin colores hardcodeados. `pnpm lint` y `next build` verdes. |
| 2026-08-17 | F18: Implementación de los 37 tipos del dominio TypeScript en `src/types/` coordinados con el backend TypeORM. `pnpm lint`, `pnpm build` y `tsc` ejecutados limpiamente. |
| 2026-08-17 | F16: los siete primitivos de EMBER v2 se portaron a componentes React con contratos TypeScript, accesibilidad básica y un barrel público en `@/components/ui`. Revisión del PR: `Icon` pasó de `lucide-react/dynamic` a un registro estático (`iconRegistry.ts`) —los iconos ahora salen en el HTML del servidor y el JS inicial baja de 874 KB a 646 KB—, y el foco de `Button`/`Chip` recuperó un `outline` visible: `--focus-ember` solo da 1.2:1 de contraste. |
| 2026-08-17 | F20: se configuraron Vitest, React Testing Library y jsdom, se agregaron moldes para un componente y un hook, y el workflow de CI pasó a validar lint, tests y build. |
| 2026-08-18 | F20 (Review): se documentó y fijó el piso de Node 24 que arrastraba pnpm 11 (`devEngines`, `.nvmrc`, README y AGENTS), se mockeó `next/font/local` para que testear una página no muera con "default is not a function", se le puso `timeout-minutes` al job de CI, se sacó la fila duplicada de F16 y `catalogos-test.ts` pasó a `catalogos.type-check.ts` para no confundirse con una suite de Vitest. |
| 2026-08-18 | F18 (Review): Corrección de catálogos restringiendo `key` con tipos literales, reemplazo de `openai` por `gemini` en `ProveedorExterno`, inclusión de test de tipos (`catalogos-test.ts`) y documentación de la referencia de `SmartPlan-back` commit `8ec4d07`. |
| 2026-08-18 | F17: Cliente Axios centralizado en `src/lib/api/` con interceptor JWT, abstracción de token decoupled (`setTokenGetter`), normalización de respuestas/red en `ApiError`, pub/sub con debouncing para 401 (`onUnauthorized`), plantilla `.env.example` y actualización de documentación en `skills/03-frontend/SKILL.md`. `npx eslint .`, `npx tsc --noEmit` y `npx next build` 100% limpios. |
| 2026-08-18 | F19: estructura de `src/app` con los grupos `(auth)`, `(main)` y `(privado)`, layout con la navbar de 60px y `backdrop-filter`, navegación de Inicio, Explorar, Favoritos e Historial, menú de usuario y rutas protegidas que mandan al login con el destino en `?redirect=`. Se sacó la página del template de `create-next-app` y las pantallas quedaron como marcadores con su CU. `pnpm lint`, `pnpm test` (26) y `pnpm build` verdes. |
| 2026-08-19 | F06 (ref back#28): el `ci.yml` de F20 ya cumplía casi todo el ticket (lint+test+build en push/PR contra develop/main); se alineó el job id a `ci` (antes `quality`) y el setup a `pnpm/action-setup@v6` + `actions/setup-node@v7` con `node-version-file: '.nvmrc'`, separando explícitamente de dónde sale Node (antes delegado entero a la composite action `pnpm/setup@v2`) — mismo patrón que se implementó en `SmartPlan-back`. Sin cambios de trigger ni de los tres checks reales. `pnpm lint`, `pnpm test` (26) y `pnpm build` verdes con el workflow nuevo. Falta configurar el status check `CI` como obligatorio en la protección de `develop` y `main` (con el nombre exacto que muestre GitHub tras la primera corrida, quitando el check viejo `Quality` si estaba configurado) y abrir el PR. |
