<!--
Base del PR: develop. Nunca main.
Título: el mismo del issue, con el id entre corchetes. Ej: [CU17] Generar plan automatico
-->

Closes #

## Qué hace

<!-- Qué cambia desde el punto de vista de quien usa la aplicación, y qué CU / tarea cubre.
     Si no hay CU asociado (tooling, configuración, documentación), decilo. -->

## Cómo probarlo

<!-- Comandos concretos y qué mirar. Quien revisa tiene que poder seguir esto sin preguntarte nada.
     Si hace falta el backend corriendo o alguna variable de entorno, decilo acá. -->

```bash
git switch <rama>
pnpm install
pnpm dev
```

1.
2.

## Qué queda afuera

<!-- Lo del alcance que no entró, y por qué. Si entró todo, poné "Nada".
     Si dejaste deuda técnica, dejá también el issue que la sigue. -->

---

## Definition of Done

Criterios completos en [`skills/02-git-flow/DEFINITION-OF-DONE.md`](https://github.com/SmartPlan-UTN/SmartPlan-front/blob/develop/skills/02-git-flow/DEFINITION-OF-DONE.md).

- [ ] La rama sale de `develop` y el PR va contra `develop`
- [ ] `pnpm lint` sin errores
- [ ] `pnpm build` pasa
- [ ] Se cumplen los criterios de aceptación del issue
- [ ] Sin credenciales, tokens ni URLs hardcodeadas
- [ ] Estilos con tokens del design system, sin hex escritos a mano
- [ ] Estados de carga, error y vacío contemplados (si la pantalla consume la API)
- [ ] [`SEGUIMIENTO.md`](https://github.com/SmartPlan-UTN/SmartPlan-front/blob/develop/SEGUIMIENTO.md) actualizado: estado, rama y PR
- [ ] Documentado donde corresponda (`README.md` o `skills/`)
