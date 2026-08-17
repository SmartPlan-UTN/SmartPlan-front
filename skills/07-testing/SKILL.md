---
name: smartplan-testing-frontend
description: Cómo escribir y ejecutar tests de componentes y hooks con Vitest y React Testing Library. Leer antes de agregar o modificar tests del frontend.
---

# SmartPlan Front — Testing

## Stack

Los tests unitarios usan **Vitest**, **React Testing Library** y **jsdom**. Esta
combinación permite probar el comportamiento observable de componentes y hooks
sin levantar el servidor de Next.js.

Vitest no soporta Server Components asíncronos. Esos flujos se prueban con tests
end-to-end cuando el proyecto incorpore esa infraestructura; los componentes de
cliente y los Server Components sincrónicos sí pueden cubrirse con unitarios.

## Comandos

```bash
pnpm test          # una corrida completa; es el comando usado por CI
pnpm test:watch    # vuelve a ejecutar los tests afectados mientras trabajás
```

Antes de abrir un PR deben pasar `pnpm lint`, `pnpm test` y `pnpm build`.

## Ubicación y nombres

Los tests se colocan junto al código que cubren:

```text
src/components/ui/Button.tsx
src/components/ui/Button.test.tsx
src/hooks/useToggle.ts
src/hooks/useToggle.test.ts
```

Usá `.test.tsx` cuando el archivo renderiza JSX y `.test.ts` para hooks o lógica
sin JSX. El setup común vive en `src/test/setup.ts`; no repitas `cleanup` ni la
configuración de `jest-dom` en cada suite.

## Componentes

- Consultá por rol, nombre accesible, label o texto visible. Evitá `data-testid`
  salvo que no exista una alternativa semántica.
- Interactuá mediante `userEvent`, porque reproduce mejor la secuencia real de
  eventos que invocar handlers directamente.
- Verificá resultados visibles y callbacks públicos, no clases internas ni
  detalles de implementación.
- Para operaciones asíncronas, esperá la interacción y usá `findBy*` o
  `waitFor` cuando corresponda. Toda promesa debe quedar manejada.

`Button.test.tsx` es el molde de referencia para render, consultas accesibles y
una interacción de usuario.

## Hooks

Usá `renderHook` para ejecutar el hook y `act` para cualquier operación que
actualice su estado:

```ts
const { result } = renderHook(() => useToggle());

act(() => {
  result.current[1]();
});
```

Probá el valor inicial, las transiciones relevantes y cualquier opción pública.
`useToggle.test.ts` es el molde de referencia.

## Alcance actual

F20 instala tests unitarios y ejemplos, pero no define un umbral global de
cobertura, snapshots ni infraestructura end-to-end. Agregar esas políticas
requiere una decisión separada del equipo.
