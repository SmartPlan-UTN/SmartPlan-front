const SCRIPT_ID = "smartplan-google-maps-script";
const LOAD_TIMEOUT_MS = 10000;

let loadPromise: Promise<void> | null = null;

/**
 * Loads the Google Maps JavaScript API once, however many components ask
 * for it. Requires `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (CU16); without a real
 * key from a project with the Maps JavaScript API enabled, the script loads
 * but the map renders a "for development purposes only" watermark, and an
 * invalid/missing key rejects this promise so the caller can show a clear
 * error instead of a blank map.
 *
 * A rejection clears the cached promise instead of pinning the failure
 * forever, so a later call (a fresh key, the network recovering) gets a
 * real retry instead of replaying the same rejection for the rest of the
 * page's life. A timeout guards the same thing from the other direction —
 * a script that never fires `load` or `error` would otherwise hang every
 * caller (like `LocationPreview`'s spinner) indefinitely.
 */
export function loadGoogleMaps(): Promise<void> {
  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Google Maps solo puede cargarse en el navegador."));
      return;
    }

    if (typeof google !== "undefined" && google.maps) {
      resolve();
      return;
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      reject(
        new Error(
          "Falta configurar NEXT_PUBLIC_GOOGLE_MAPS_API_KEY para mostrar el mapa.",
        ),
      );
      return;
    }

    const timeoutId = setTimeout(() => {
      reject(new Error("Google Maps tardó demasiado en cargar."));
    }, LOAD_TIMEOUT_MS);

    const settle = (action: () => void) => {
      clearTimeout(timeoutId);
      action();
    };

    const existingScript = document.getElementById(
      SCRIPT_ID,
    ) as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener("load", () => settle(resolve));
      existingScript.addEventListener("error", () =>
        settle(() => {
          // A script tag only fires `load`/`error` once. If it already
          // failed before this call attached its listeners, they'd never
          // fire and every retry would hang for the full timeout instead of
          // actually reloading — removing it lets the next call create a
          // fresh `<script>` that can genuinely retry.
          existingScript.remove();
          reject(new Error("No pudimos cargar Google Maps."));
        }),
      );
      return;
    }

    // Google recommends `loading=async` plus `google.maps.importLibrary`
    // for the classes it hands back — this codebase uses the classic
    // `google.maps.Map`/`Marker` globals instead, which `loading=async`
    // doesn't populate synchronously on script load. Without it, the only
    // cost is a "suboptimal performance" console notice from Google.
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    // `libraries=places` pulls in `AutocompleteService`/`PlacesService`
    // (CU8's location search) alongside the `Map`/`Marker` globals CU16
    // already relies on — one script tag, so there's still only ever one
    // `<script>` to await/cache above, whichever caller asks first.
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.onload = () => settle(resolve);
    script.onerror = () =>
      settle(() => {
        script.remove();
        reject(new Error("No pudimos cargar Google Maps."));
      });
    document.head.appendChild(script);
  });

  loadPromise.catch(() => {
    loadPromise = null;
  });

  return loadPromise;
}
