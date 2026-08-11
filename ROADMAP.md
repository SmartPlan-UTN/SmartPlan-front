# ROADMAP — SmartPlan

Plan de ejecución de la Etapa 6. Cubre los **71 issues ejecutables** repartidos
entre `SmartPlan-front` y `SmartPlan-back`, más el trabajo transversal que no
tiene issue propio.

> Las épicas no se listan acá: son contenedores de seguimiento, no trabajo.
> El estado de cada issue vive en el tablero, no en este archivo.

---

## Resumen

| Persona | Rol | Issues | Puntos |
|---|---|---:|---:|
| **Álvaro Ariza** | Front-End · UX/UI | 15 | 58 |
| **Luciano Marquesini** | Front-End | 19 | 53 |
| **Ramiro Martínez** | Full Stack · DBA | 9 | 54 |
| **Bautista Alós** | Full Stack · IA | 11 | 57 |
| **Matías Zarandón** | Full Stack · QA · Líder | 7 | 52 |
| **Valentín Mathey** | Back-End · DevOps · Scrum Master | 10 | 55 |
| | | **71** | **329** |

Los puntos son Fibonacci y están cargados como label en cada issue (`pts: 3`,
`pts: 8`…). Se ven en la tarjeta del tablero y se filtran con `label:"pts: 8"`.

El reparto va de 52 a 58 puntos por persona. Quienes tienen menos issues
—Ramiro y Valentín— cargan el modelo de datos y la infraestructura, que en
cantidad es poco y en trabajo es de lo más pesado.

### Asignación en GitHub

| Persona | Usuario | Issues asignados |
|---|---|---|
| Ramiro Martínez | `Rami195` | 9 ✓ |
| Bautista Alós | `BautistaAlosMartorell` | 11 ✓ |
| Matías Zarandón | `TuteSeta` | 7 ✓ |
| Valentín Mathey | `valentinmathey` | 10 ✓ |
| Álvaro Ariza | — | 15 **pendientes** |
| Luciano Marquesini | — | 19 **pendientes** |

**Faltan 34 issues por asignar.** Álvaro y Luciano todavía no son miembros de la
organización, y GitHub solo permite asignar a quien tenga acceso al repositorio.
Invitalos en `github.com/orgs/SmartPlan-UTN/people` y después asignales los issues
que figuran en sus secciones de abajo.

---

## Asignación por persona

### Álvaro Ariza
*Front-End · UX/UI* — 15 issues, 58 puntos

| Issue | Título | Repo | Pts |
|---|---|---|---:|
| [#13](https://github.com/SmartPlan-UTN/SmartPlan-front/issues/13) | Iniciar sesion | front | 5 |
| [#14](https://github.com/SmartPlan-UTN/SmartPlan-front/issues/14) | Registrar usuario | front | 5 |
| [#15](https://github.com/SmartPlan-UTN/SmartPlan-front/issues/15) | Recuperar contrasena | front | 3 |
| [#16](https://github.com/SmartPlan-UTN/SmartPlan-front/issues/16) | Cerrar sesion | front | 1 |
| [#17](https://github.com/SmartPlan-UTN/SmartPlan-front/issues/17) | Editar perfil | front | 3 |
| [#18](https://github.com/SmartPlan-UTN/SmartPlan-front/issues/18) | Cambiar contrasena | front | 3 |
| [#19](https://github.com/SmartPlan-UTN/SmartPlan-front/issues/19) | Eliminar cuenta | front | 2 |
| [#20](https://github.com/SmartPlan-UTN/SmartPlan-front/issues/20) | Editar preferencias | front | 5 |
| [#49](https://github.com/SmartPlan-UTN/SmartPlan-front/issues/49) | Ver detalle de coleccion | front | 3 |
| [#50](https://github.com/SmartPlan-UTN/SmartPlan-front/issues/50) | Ver colecciones | front | 3 |
| [#55](https://github.com/SmartPlan-UTN/SmartPlan-front/issues/55) | Valorar actividad | front | 5 |
| [#56](https://github.com/SmartPlan-UTN/SmartPlan-front/issues/56) | Ver valoraciones | front | 3 |
| [#57](https://github.com/SmartPlan-UTN/SmartPlan-front/issues/57) | Editar valoracion | front | 2 |
| [#58](https://github.com/SmartPlan-UTN/SmartPlan-front/issues/58) | Eliminar valoracion | front | 2 |
| [#62](https://github.com/SmartPlan-UTN/SmartPlan-front/issues/62) | Visualizar metricas del sistema | front | 13 |

**Además:** Design system: cablear fuente y tokens, portar los 7 primitivos. Diseñar las 7 pantallas que faltan.

### Luciano Marquesini
*Front-End* — 19 issues, 53 puntos

| Issue | Título | Repo | Pts |
|---|---|---|---:|
| [#27](https://github.com/SmartPlan-UTN/SmartPlan-front/issues/27) | Guardar actividad | front | 3 |
| [#36](https://github.com/SmartPlan-UTN/SmartPlan-front/issues/36) | Crear plan | front | 5 |
| [#37](https://github.com/SmartPlan-UTN/SmartPlan-front/issues/37) | Editar plan | front | 5 |
| [#38](https://github.com/SmartPlan-UTN/SmartPlan-front/issues/38) | Eliminar plan | front | 2 |
| [#39](https://github.com/SmartPlan-UTN/SmartPlan-front/issues/39) | Agregar actividad al plan | front | 3 |
| [#40](https://github.com/SmartPlan-UTN/SmartPlan-front/issues/40) | Quitar actividad de plan | front | 2 |
| [#41](https://github.com/SmartPlan-UTN/SmartPlan-front/issues/41) | Visualizar plan | front | 3 |
| [#42](https://github.com/SmartPlan-UTN/SmartPlan-front/issues/42) | Calcular costo del plan | front | 3 |
| [#43](https://github.com/SmartPlan-UTN/SmartPlan-front/issues/43) | Generar plan sugerido | front | 3 |
| [#44](https://github.com/SmartPlan-UTN/SmartPlan-front/issues/44) | Crear coleccion | front | 2 |
| [#45](https://github.com/SmartPlan-UTN/SmartPlan-front/issues/45) | Editar coleccion | front | 2 |
| [#46](https://github.com/SmartPlan-UTN/SmartPlan-front/issues/46) | Eliminar coleccion | front | 2 |
| [#47](https://github.com/SmartPlan-UTN/SmartPlan-front/issues/47) | Agregar actividad a coleccion | front | 3 |
| [#48](https://github.com/SmartPlan-UTN/SmartPlan-front/issues/48) | Quitar actividad de coleccion | front | 2 |
| [#51](https://github.com/SmartPlan-UTN/SmartPlan-front/issues/51) | Ver actividades guardadas | front | 3 |
| [#3](https://github.com/SmartPlan-UTN/SmartPlan-front/issues/3) | Ver planes guardados | front | 3 |
| [#52](https://github.com/SmartPlan-UTN/SmartPlan-front/issues/52) | Quitar actividad guardada | front | 2 |
| [#53](https://github.com/SmartPlan-UTN/SmartPlan-front/issues/53) | Quitar plan guardado | front | 2 |
| [#54](https://github.com/SmartPlan-UTN/SmartPlan-front/issues/54) | Guardar plan favorito | front | 3 |

**Además:** Cliente axios centralizado, tipos del dominio y layout base.

### Ramiro Martínez
*Full Stack · DBA* — 9 issues, 54 puntos

| Issue | Título | Repo | Pts |
|---|---|---|---:|
| [#21](https://github.com/SmartPlan-UTN/SmartPlan-front/issues/21) | Buscar actividades | front | 5 |
| [#22](https://github.com/SmartPlan-UTN/SmartPlan-front/issues/22) | Filtrar resultados | front | 5 |
| [#23](https://github.com/SmartPlan-UTN/SmartPlan-front/issues/23) | Ordenar resultados | front | 2 |
| [#24](https://github.com/SmartPlan-UTN/SmartPlan-front/issues/24) | Buscar planes | front | 3 |
| [#25](https://github.com/SmartPlan-UTN/SmartPlan-front/issues/25) | Consultar plan | front | 5 |
| [#26](https://github.com/SmartPlan-UTN/SmartPlan-front/issues/26) | Consultar actividad | front | 5 |
| [#28](https://github.com/SmartPlan-UTN/SmartPlan-front/issues/28) | Visualizar actividades en mapa | front | 8 |
| [#16](https://github.com/SmartPlan-UTN/SmartPlan-back/issues/16) | Busqueda y exploracion (CU9-CU16) | back | 13 |
| [#20](https://github.com/SmartPlan-UTN/SmartPlan-back/issues/20) | Favoritos (CU15, CU39-CU43) | back | 8 |

**Además:** Modelo de datos completo: ~30 entidades en TypeORM y migraciones iniciales.

### Bautista Alós
*Full Stack · IA* — 11 issues, 57 puntos

| Issue | Título | Repo | Pts |
|---|---|---|---:|
| [#29](https://github.com/SmartPlan-UTN/SmartPlan-front/issues/29) | Generar plan automatico | front | 8 |
| [#30](https://github.com/SmartPlan-UTN/SmartPlan-front/issues/30) | Personalizar preferencias de usuario | front | 2 |
| [#31](https://github.com/SmartPlan-UTN/SmartPlan-front/issues/31) | Generar plan sorpresa | front | 3 |
| [#32](https://github.com/SmartPlan-UTN/SmartPlan-front/issues/32) | Mostrar recomendaciones | front | 3 |
| [#33](https://github.com/SmartPlan-UTN/SmartPlan-front/issues/33) | Ajustar recomendaciones segun historial | front | 3 |
| [#34](https://github.com/SmartPlan-UTN/SmartPlan-front/issues/34) | Seleccionar plan | front | 2 |
| [#35](https://github.com/SmartPlan-UTN/SmartPlan-front/issues/35) | Registrar retroalimentacion del plan | front | 5 |
| [#4](https://github.com/SmartPlan-UTN/SmartPlan-back/issues/4) | Obtener datos de lugares | back | 8 |
| [#5](https://github.com/SmartPlan-UTN/SmartPlan-back/issues/5) | Sincronizar informacion externa | back | 5 |
| [#6](https://github.com/SmartPlan-UTN/SmartPlan-back/issues/6) | Actualizar datos de actividades | back | 5 |
| [#17](https://github.com/SmartPlan-UTN/SmartPlan-back/issues/17) | Recomendacion (CU17-CU23) | back | 13 |

**Además:** Spikes de OpenAI y Google Maps. Cola RabbitMQ y worker base.

### Matías Zarandón
*Full Stack · QA · Líder* — 7 issues, 52 puntos

| Issue | Título | Repo | Pts |
|---|---|---|---:|
| [#59](https://github.com/SmartPlan-UTN/SmartPlan-front/issues/59) | Gestionar actividades | front | 8 |
| [#60](https://github.com/SmartPlan-UTN/SmartPlan-front/issues/60) | Moderar valoraciones | front | 5 |
| [#61](https://github.com/SmartPlan-UTN/SmartPlan-front/issues/61) | Administrar usuarios | front | 8 |
| [#63](https://github.com/SmartPlan-UTN/SmartPlan-front/issues/63) | Gestionar planes | front | 5 |
| [#19](https://github.com/SmartPlan-UTN/SmartPlan-back/issues/19) | Coleccion (CU32-CU38) | back | 8 |
| [#22](https://github.com/SmartPlan-UTN/SmartPlan-back/issues/22) | Administracion (CU53, CU55, CU57, CU58, CU60) | back | 13 |
| [#21](https://github.com/SmartPlan-UTN/SmartPlan-back/issues/21) | Valoraciones (CU44-CU47) | back | 5 |

**Además:** QA transversal: setup de Jest, tests e2e y Definition of Done.

### Valentín Mathey
*Back-End · DevOps · Scrum Master* — 10 issues, 55 puntos

| Issue | Título | Repo | Pts |
|---|---|---|---:|
| [#7](https://github.com/SmartPlan-UTN/SmartPlan-back/issues/7) | Registrar datos externos utilizados | back | 3 |
| [#8](https://github.com/SmartPlan-UTN/SmartPlan-back/issues/8) | Obtener valoraciones externas | back | 3 |
| [#9](https://github.com/SmartPlan-UTN/SmartPlan-back/issues/9) | Gestionar categorias | back | 3 |
| [#10](https://github.com/SmartPlan-UTN/SmartPlan-back/issues/10) | Eliminar contenido | back | 2 |
| [#11](https://github.com/SmartPlan-UTN/SmartPlan-back/issues/11) | Revisar sugerencia de usuario | back | 2 |
| [#12](https://github.com/SmartPlan-UTN/SmartPlan-back/issues/12) | Gestionar permisos | back | 5 |
| [#13](https://github.com/SmartPlan-UTN/SmartPlan-back/issues/13) | Gestionar roles | back | 3 |
| [#14](https://github.com/SmartPlan-UTN/SmartPlan-back/issues/14) | Autenticacion y control de acceso (CU1-CU4) | back | 13 |
| [#15](https://github.com/SmartPlan-UTN/SmartPlan-back/issues/15) | Gestion de usuarios (CU5-CU8) | back | 8 |
| [#18](https://github.com/SmartPlan-UTN/SmartPlan-back/issues/18) | Planificacion (CU24-CU31) | back | 13 |

**Además:** Infraestructura: PostgreSQL, ValidationPipe, variables de entorno, CI y despliegue.

---

## Sprints

Sprints de dos semanas. Sin fechas: mapealos contra el Gantt del Anexo N°1.

### Sprint 0 — Fundaciones

Nada de esto son issues del tablero: es la base que desbloquea todo lo demás.

| Persona | Trabajo |
|---|---|
| Álvaro | Cablear Bricolage Grotesque y `tokens.css`, portar los 7 primitivos |
| Luciano | Cliente axios, tipos del dominio, layout y rutas base |
| Ramiro | Modelo de datos: 30 entidades y migraciones |
| Bautista | Spikes de OpenAI y Google Maps |
| Matías | Setup de Jest y e2e, Definition of Done |
| Valentín | PostgreSQL, ValidationPipe, `.env.example`, CI |

### Sprint 1 — Autenticación

Primer módulo completo de punta a punta. Sirve de molde para los siguientes.

| Persona | Trabajo |
|---|---|
| Álvaro | CU1 a CU4 — login, registro, recuperación, logout |
| Valentín | API de autenticación — JWT, guards, hasheo |
| Luciano | Navbar, shell y rutas protegidas |
| Ramiro | Cierre de migraciones, arranca la API de búsqueda |
| Bautista | Cola y worker base |
| Matías | Tests de autenticación · CU54 categorías |

### Sprint 2 — Usuarios y catálogo

| Persona | Trabajo |
|---|---|
| Álvaro | CU5 a CU8 — perfil, contraseña, baja, preferencias |
| Valentín | API de usuarios |
| Ramiro | API de búsqueda + CU9 a CU12 |
| Luciano | Apoyo en resultados y filtros |
| Bautista | CU48 — cliente de Google Maps |
| Matías | CU53 — gestión de actividades |

### Sprint 3 — Planificación

| Persona | Trabajo |
|---|---|
| Luciano | CU24 a CU31 — el módulo de planes completo |
| Valentín | API de planificación |
| Ramiro | CU13, CU14, CU16 — consultar plan, actividad y mapa |
| Álvaro | Diseño de las 7 pantallas faltantes |
| Bautista | CU49, CU50 — sincronización externa |
| Matías | CU55, CU57 — moderación y usuarios |

### Sprint 4 — Recomendación e IA

El corazón del producto. Depende de que la cola y los clientes externos estén andando.

| Persona | Trabajo |
|---|---|
| Bautista | CU17 a CU23 + API de recomendación |
| Valentín | CU51, CU52 — registro de datos externos |
| Luciano | CU15, CU39 a CU43 — favoritos |
| Ramiro | API de favoritos |
| Álvaro | CU44 a CU47 — valoraciones |
| Matías | API de valoraciones |

### Sprint 5 — Colección y administración

| Persona | Trabajo |
|---|---|
| Luciano | CU32 a CU36 — colecciones |
| Álvaro | CU37, CU38 — detalle y listado de colecciones |
| Matías | API de colección · API de administración · CU60 |
| Valentín | CU56, CU59, CU61, CU62 — permisos, roles, auditoría |
| Ramiro | Consultas agregadas para métricas |
| Bautista | Ajuste del motor según historial |

### Sprint 6 — Reportes e integración

| Persona | Trabajo |
|---|---|
| Álvaro | CU58 — panel de control REP-01 |
| Matías | Tests e2e de los flujos principales |
| Valentín | Despliegue en Railway y Vercel |
| Ramiro | Optimización de consultas |
| Bautista | Afinado del motor de recomendación |
| Luciano | Estados vacíos, de error y pulido |

### Sprint 7 — Cierre

Todo el equipo.

| Persona | Trabajo |
|---|---|
| Todos | QA cruzado, corrección de defectos, manual de usuario, capturas y documentación final |

---

## Reglas de ejecución

**El sprint 0 bloquea todo.** Hoy no hay entidades, ni conexión a base de datos,
ni tokens cableados, ni cliente HTTP. Arrancar por funcionalidades sin esa base
hace que los tres primeros sprints tropiecen con lo mismo.

**El front de un módulo no arranca antes que su API.** Cuando van en el mismo
sprint, la pareja front/back acuerda el contrato el primer día. Está anotado en
cada épica.

**Dos aprobaciones por PR.** `main` y `develop` están protegidas sin excepciones,
ni siquiera para administradores. Conviene fijar parejas de revisión por afinidad:
quien hace el front de un módulo revisa su API y al revés.

**Un CU no se cierra sin test del camino feliz** y sin `pnpm lint` limpio.

---

## Qué revisar antes de arrancar

- Las estimaciones son una primera pasada hecha desde la descripción de cada
  issue. **Revisalas en el refinamiento del sprint 0** y ajustá con el equipo.
- Faltan dos integrantes por sumar a la organización de GitHub.
- Hay **7 casos de uso sin diseño**: mapa (CU16), recuperación con token (CU3),
  planes recomendados (CU20) y el módulo de colección (CU32 a CU38).
  Están planificados para que Álvaro los resuelva en el sprint 3.
