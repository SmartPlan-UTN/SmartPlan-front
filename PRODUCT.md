# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Personas de Mendoza que tienen una intención de salida o experiencia, pero no quieren investigar y ordenar por su cuenta lugares, tiempos y costos. Entran con una idea expresada en lenguaje natural y esperan poder actuar en segundos.

## Product Purpose

smartplan transforma una intención escrita en lenguaje natural en alternativas concretas de planes recreativos. El producto combina esa intención con contexto opcional, preferencias y actividades disponibles para proponer recorridos coherentes. El éxito del Home consiste en que una persona entienda esa promesa rápidamente y quiera empezar escribiendo.

## Positioning

smartplan no entrega una lista de lugares ni obliga a configurar filtros antes de empezar: entiende una intención cotidiana y la convierte en un recorrido ordenado con actividades compatibles, tiempos y costos.

## Operating Context

El flujo principal comienza en el Home: la persona describe qué quiere hacer, puede sumar contexto opcional y solicita un plan. La generación requiere una sesión autenticada, se procesa de manera asíncrona y devuelve alternativas. El contexto cultural y geográfico del producto es Mendoza, Argentina.

## Capabilities and Constraints

- El contrato de generación automática acepta una consulta de texto y un contexto completamente opcional con presupuesto, cantidad de personas, momento del día y duración disponible.
- Ningún campo de contexto lleva un valor por defecto. Solo se envían los campos que la persona eligió explícitamente.
- La generación reporta estados reales `pending`, `processing`, `generated` y `failed`; el frontend también puede mostrar una espera extendida sin afirmar que el backend falló.
- La generación sorpresa acepta coordenadas cuando la persona autoriza geolocalización.
- No se deben presentar campos, catálogos, testimonios, métricas ni capacidades que el contrato y el repositorio no respalden.
- La experiencia debe ser rápida, responsive, accesible y respetar `prefers-reduced-motion`.

## Brand Commitments

- La marca se escribe `smartplan`, en una palabra y en minúsculas dentro de la interfaz.
- Voz joven, natural, cálida y concreta, con voseo argentino.
- Mantener el ADN existente: base crema cálida, naranja como acento, espresso para contraste, tipografía editorial, formas orgánicas y una sensibilidad humana vinculada con Mendoza.
- Elevar la identidad actual sin convertirla en un template SaaS, una interfaz corporativa ni un espectáculo visual que compita con el uso del producto.
- El composer es la expresión central de smartplan y debe dominar el Home.

## Evidence on Hand

- Contrato frontend: `src/types/recommendation.ts`, `src/lib/api/plan-requests.ts` y `src/hooks/usePlanRequestPolling.ts`.
- Contrato backend: DTOs y controladores del módulo `recommendation` en el repositorio hermano `SmartPlan-back`.
- Tokens, tipografía y primitivas de marca: `src/styles/tokens.css`, `src/app/fonts/`, `src/components/ui/` y `public/brand/`.
- Referencia de composición existente: `screenshots/home-landing-design-target.png`.
- Las imágenes de `public/mock/` son material de prototipo y no constituyen contenido real de catálogo.
- No hay testimonios, métricas comerciales ni prueba social verificable disponible; no deben fabricarse.

## Product Principles

1. La intención primero: empezar escribiendo debe ser más fácil que configurar.
2. Claridad antes que impacto: la expresión visual debe reforzar el uso central.
3. Contexto honesto: toda ayuda opcional corresponde a capacidades reales.
4. Un recorrido, no una lista: la experiencia debe hacer visible cómo smartplan conecta decisiones.
5. Mendoza con criterio: lo local aparece de manera concreta, cálida y contemporánea, sin clichés.

## Accessibility & Inclusion

La interacción principal debe funcionar por teclado, mostrar foco visible, comunicar estados y errores de forma semántica, mantener contraste suficiente, evitar overflow en mobile y reducir o eliminar motion cuando el sistema lo solicite.
