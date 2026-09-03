"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * What we can tell the user about sharing their device location right now.
 * `unsupported` — the browser has no Geolocation API at all.
 * `unknown` — supported, but we have not asked the Permissions API yet
 *   (or the browser does not expose it), so we cannot say more than "we'll
 *   ask when it's needed".
 */
export type GeolocationPermission =
  "unsupported" | "unknown" | "prompt" | "granted" | "denied";

interface UseGeolocationPermissionResult {
  permission: GeolocationPermission;
  /** True while a live `getCurrentPosition` probe is running. */
  probing: boolean;
  /**
   * Actively asks the browser for the current position, which surfaces the
   * native permission prompt when the state is `prompt`. Resolves to the
   * resulting permission. Safe to call when unsupported (returns
   * `"unsupported"`).
   */
  probe: () => Promise<GeolocationPermission>;
}

function readNavigator(): Navigator | null {
  return typeof navigator === "undefined" ? null : navigator;
}

/**
 * Tracks whether the browser will let SmartPlan read the device location.
 * The toggle in PAN 15 stores a *preference* ("prefer my current location
 * when it's available") — it never assumes the browser has granted anything,
 * so this hook only drives the explanatory copy next to the toggle.
 */
export function useGeolocationPermission(
  active: boolean,
): UseGeolocationPermissionResult {
  const [permission, setPermission] =
    useState<GeolocationPermission>("unknown");
  const [probing, setProbing] = useState(false);

  useEffect(() => {
    const nav = readNavigator();
    if (!nav || !("geolocation" in nav)) {
      setPermission("unsupported");
      return;
    }
    if (!active) return;

    let cancelled = false;
    const permissions = nav.permissions;
    if (!permissions?.query) {
      setPermission((current) =>
        current === "unsupported" ? current : "unknown",
      );
      return;
    }

    permissions
      .query({ name: "geolocation" as PermissionName })
      .then((status) => {
        if (cancelled) return;
        const apply = () =>
          setPermission(status.state as GeolocationPermission);
        apply();
        status.addEventListener("change", apply);
      })
      .catch(() => {
        if (!cancelled) setPermission("unknown");
      });

    return () => {
      cancelled = true;
    };
  }, [active]);

  const probe = useCallback(async (): Promise<GeolocationPermission> => {
    const nav = readNavigator();
    if (!nav || !("geolocation" in nav)) {
      setPermission("unsupported");
      return "unsupported";
    }

    setProbing(true);
    try {
      const result = await new Promise<GeolocationPermission>((resolve) => {
        nav.geolocation.getCurrentPosition(
          () => resolve("granted"),
          (error) =>
            resolve(
              error.code === error.PERMISSION_DENIED ? "denied" : "prompt",
            ),
          { timeout: 8000, maximumAge: 60_000 },
        );
      });
      setPermission(result);
      return result;
    } finally {
      setProbing(false);
    }
  }, []);

  return { permission, probing, probe };
}
