import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
    alias: {
      // `next/font` solo existe dentro del compilador de Next. Sin este alias,
      // cualquier test que alcance un archivo con una fuente declarada muere
      // con "default is not a function". Ver src/test/mocks/next-font.ts.
      "next/font/local": fileURLToPath(
        new URL("./src/test/mocks/next-font.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    // Devuelve los espías a su implementación original después de cada test.
    // Sin esto, un vi.spyOn() sin restaurar se filtra a las suites siguientes.
    restoreMocks: true,
    // Los formularios de plan esperan un debounce real de 400ms. Con los 5s
    // por defecto, un `findBy` que espera ese debounce se queda sin margen
    // en una máquina cargada y la suite falla de forma intermitente.
    testTimeout: 15000,
  },
});
