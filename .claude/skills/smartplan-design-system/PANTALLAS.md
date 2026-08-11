# SmartPlan — Pantallas diseñadas (referencia)

Catálogo de las pantallas del prototipo de alta fidelidad (fuera del repo, ver
`SKILL.md`). Es el único registro versionado de ese diseño: si cambia una
pantalla en el prototipo, actualizá acá también.

## Contenido

- Públicas y de sesión: Login
- Aplicación: Landing/Home, PlanGenerator, Results, PlanDetail, ActivityDetail, Favorites, History, Profile, Preferences, Security
- Panel de administración: AdminHome, AdminUsers, AdminActivities, AdminPlanes, AdminReviews
- Transversales: Navbar, Carousel, MoodBackground
- Lo que falta diseñar

## Públicas y de sesión

**Login** — CU1, CU2, CU3 · PAN 04
Alterna entre iniciar sesión y registro. Medidor de fortaleza de contraseña
(Débil / Media / Fuerte), mostrar-ocultar con icono `eye-off`, validación inline
("Este campo es requerido", "Las contraseñas no coinciden", "Ingresá un email
válido"). Superficie oscura con `blur(8px)`. Deriva a `admin-inicio` si el rol es
administrador.

## Aplicación

**Landing / Home** — CU17, CU20 · PAN 07
Hero sobre fondo oscuro con `MoodBackground` animado detrás. Campo central de
lenguaje natural: *"Contale qué querés"*, se envía con Enter. Debajo, chips de
sugerencias (*"Algo romántico y sorpresa para hoy"*, *"Aventura serrana familiar"*,
*"Algo que no se me ocurriría nunca"*). Más abajo, carrusel de categorías y planes
destacados con su secuencia resumida (*"Café → Paseo → Cena"*), distancia
(*"A 2.5 km"*) y momento (*"Esta tarde"*). Ubicación por defecto: Mendoza.

**PlanGenerator** — CU17, CU19, CU31 · PAN 07 / PAN 09
Formulario de parámetros: presupuesto, zona (barrios), momento, tipo de salida
(Con amigos / En pareja / Familiar), características (Aire libre, Accesible,
Con estacionamiento). Pantalla de espera con pasos progresivos —"Analizando tus
preferencias", "Buscando actividades compatibles", "Armando combinaciones
perfectas"— en `--electric`, que es la única animación viva permitida.

**Results** — CU9–CU12 · PAN 11
Grilla de tarjetas de plan y actividad. Cada tarjeta lleva título, secuencia
(*"Bodega → Almuerzo → Degustación"*), `Badge` de categoría (Cultural,
Gastronómico, Romántico, Activo, Al aire libre), `Stars` con la valoración y
distancia. Fila superior de chips de filtro con scroll horizontal sin barra.
Estado de carga: *"Buscando lo mejor cerca tuyo..."*.

**PlanDetail** — CU13, CU25–CU30, CU43 · PAN 17
Cabecera con nombre del plan y recorrido (*"Valle de Uco → Luján de Cuyo"*).
Lista ordenada de actividades, cada una con horario, nombre del lugar, tipo
(*"Bodega · Degustación"*), dirección y costo. `Divider` entre items. Costo total
al pie y botón **Guardar plan**.

**ActivityDetail** — CU14, CU15, CU35, CU44, CU45 · PAN 18
Detalle con foto, descripción, horarios (*"Lun–Dom: 12:00–16:00"*), enlace a
Google Maps y listado de valoraciones con autor y `Stars`. Botón de guardar con
dos estados: **Guardar** / **Guardada**. Pestaña de Información.

**Favorites** — CU39–CU43 · PAN 12
Tres solapas: Actividades, Planes y Colecciones. Cada una con su estado vacío
propio: *"Aún no guardaste ninguna actividad"*, *"Aún no guardaste ningún plan"*,
*"Aún no creaste ninguna colección"*. Las colecciones tienen nombre libre
(*"Bodegas para visitar"*).

**History** — CU23 · PAN 13
Listado de planes por estado, con badge `DRAFT` para los borradores y estados
`generating` para los que están procesándose. Estado vacío: *"Tus planes guardados
aparecerán acá"*.

**Profile** — CU5, CU7 · PAN 14
Datos personales con validación inline. Incluye la sección de contraseña con las
mismas reglas que Security.

**Preferences** — CU8, CU18 · PAN 15
Categorías de interés como chips seleccionables (cultura, compras, gastronomía…),
presupuesto habitual con validación (*"Ingresá un presupuesto válido mayor a $0"*)
y zona de preferencia.

**Security** — CU6
Cambio de contraseña con medidor de fortaleza y checklist de requisitos:
*"Mínimo 8 caracteres"*, *"Al menos una mayúscula"*, *"Incluir números y símbolos"*.

## Panel de administración

**AdminHome** — CU58 · REP-01
Tarjetas de KPI: Total de Usuarios, Planes Activos, Actividades en Catálogo,
Valoraciones Pendientes. Debajo, tasa de aceptación, valoración promedio y
retención. Distribución por estado de ánimo (Relax, Festiva, Romántica, Aventura,
Cultural) y por tamaño de grupo (En pareja, Grupo chico, Grupo grande) con barras
de porcentaje. Ranking de actividades más populares y feed de actividad reciente.
Selector de rango: Hoy / 7 días / 30 días / Este mes.

**AdminUsers** — CU57 · PAN 19 / REP-02
Métricas de encabezado (total, activos hoy, nuevos registros de la semana) y tabla
de usuarios con nombre, email, fecha de alta y estado: Activo, Suspendido, Baneado.
Acciones por fila, entre ellas **Reactivar cuenta**. Filtro por estado.

**AdminActivities** — CU53 · PAN 21
Tabla del catálogo con filtros por categoría (Aventura, Cultura & Arte, Bienestar,
Entretenimiento, Gastronomía) y por tipo de salida. Alta, edición y baja.

**AdminPlanes** — CU60 · PAN 22
Tabla de planes con estado y filtros. Edición y baja desde administración.

**AdminReviews** — CU55 · PAN 20
Bandeja de moderación con solapas Pendientes / Aprobadas. Cada fila con autor,
plan valorado y antigüedad relativa (*"Hace 2 horas"*, *"Hace 3 días"*).

## Transversales

**Navbar** — barra de 60px con `backdrop-filter: blur(18px)` sobre el hero.
Navegación: Inicio, Explorar, Favoritos, Historial, y menú de usuario con Mi Perfil
y Preferencias.

**Carousel** — carrusel infinito de categorías: Gastronomía, Vinos & Bodegas,
Cultura & Arte, Vida nocturna, Cócteles, Café & Brunch, y de momentos: Con amigos,
Noche especial, Tarde de semana, Fin de semana. El keyframe `sp-carousel` de
`tokens.css` desplaza exactamente un set de 5 items.

**MoodBackground** — fondo animado del hero. Manchas de color muy tenues (opacidad
5–10%) que transicionan en 1.4s según el estado de ánimo seleccionado. Es
decorativo; no debe competir con el contenido.

## Lo que falta diseñar

No hay pantalla en el kit para:

- **PAN 05** — Recuperar contraseña (CU3 tiene el formulario en Login, pero no el
  flujo de token)
- **PAN 08** — Búsqueda por mapa (CU16)
- **PAN 10** — Planes recomendados (CU20 aparece embebido en el Home, sin pantalla propia)
- **Módulo de colección completo** — CU32 a CU38. En Favorites hay una solapa de
  colecciones, pero no están el detalle ni el alta.

Son 7 casos de uso sin diseño. Hay que resolverlos al maquetar o pedirle las
pantallas al diseñador.

## Contenido de referencia

El prototipo usa datos de Mendoza y Buenos Aires: Ruta del vino en Luján de Cuyo,
Bodega Zuccardi Valle de Uco, Termas de Cacheuta, Potrerillos, Chacras de Coria,
Uspallata, San Telmo, Palermo. Los precios van en **pesos argentinos**.

Sirve como referencia de tono y de volumen de texto al maquetar. **No es contenido
real**: son datos de ejemplo.
