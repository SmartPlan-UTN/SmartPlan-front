import { useCallback, useState } from "react";

/**
 * Estado booleano con una función que lo invierte. Pensado para lo que se abre
 * y se cierra: un modal, un menú, un acordeón.
 *
 * Es además el molde de referencia para testear hooks; `useToggle.test.ts`
 * muestra cómo se prueban el valor inicial y las transiciones.
 */
export function useToggle(initialValue = false) {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => {
    setValue((currentValue) => !currentValue);
  }, []);

  return [value, toggle] as const;
}
