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
| **Fase** | Scaffold — sin lógica de negocio implementada |
| **Rama base** | `develop` |
| **Última actualización** | 2026-08-17 |
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
| [F16] Portar los 7 primitivos a React + TS | `En revisión` | `SMART-f16-primitivos-design-system` | #76 | Icon, Button, Chip, Badge, Stars, Logo y Divider tipados, basados en EMBER v2 |
| Cliente axios centralizado (`src/lib/api/`) | `No iniciado` | — | — | Con interceptor para el JWT |
| Variables de entorno (`NEXT_PUBLIC_API_URL`) | `No iniciado` | — | — | |
| Estructura de carpetas definitiva | `No iniciado` | — | — | Propuesta en `skills/03-frontend/` |

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
| 2026-08-17 | F16: los siete primitivos de EMBER v2 se portaron a componentes React con contratos TypeScript, accesibilidad básica y un barrel público en `@/components/ui`. Revisión del PR: `Icon` pasó de `lucide-react/dynamic` a un registro estático (`iconRegistry.ts`) —los iconos ahora salen en el HTML del servidor y el JS inicial baja de 874 KB a 646 KB—, y el foco de `Button`/`Chip` recuperó un `outline` visible: `--focus-ember` solo da 1.2:1 de contraste. |
