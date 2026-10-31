"use client";

import { useEffect, useState } from "react";

import { getProfile } from "@/lib/api";
import { useSession } from "@/lib/auth";

/**
 * The signed-in person's public handle (lowercase, as the community routes
 * compare it), or `null` for a guest or while it is unknown. The session
 * carries no username, so it is read once from the profile.
 */
export function useOwnUsername(): string | null {
  const { status } = useSession();
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    let active = true;
    getProfile()
      .then((profile) => {
        if (active)
          setUsername(
            (profile.username ?? `viajero${profile.id}`).toLowerCase(),
          );
      })
      .catch(() => {
        // Without it the page is simply the public one.
      });
    return () => {
      active = false;
    };
  }, [status]);

  return status === "authenticated" ? username : null;
}
