import { useCallback, useState } from "react";

/**
 * Boolean state with a function that flips it. Meant for things that open
 * and close: a modal, a menu, an accordion.
 *
 * It's also the reference template for testing hooks; `useToggle.test.ts`
 * shows how to test the initial value and the transitions.
 */
export function useToggle(initialValue = false) {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => {
    setValue((currentValue) => !currentValue);
  }, []);

  return [value, toggle] as const;
}
