"use client";

import { useSyncExternalStore } from "react";
import { ROUTES } from "@/lib/routes";

export const COMMUNITY_POSITION_KEY = "smartplan:community-position";
const subscribe = () => () => undefined;
function readPath() {
  try {
    const stored = JSON.parse(
      sessionStorage.getItem(COMMUNITY_POSITION_KEY) ?? "null",
    ) as { q?: unknown; type?: unknown } | null;
    const params = new URLSearchParams();
    if (typeof stored?.q === "string" && stored.q)
      params.set("q", stored.q.slice(0, 100));
    if (stored?.type === "plans" || stored?.type === "experiences")
      params.set("type", stored.type);
    return `${ROUTES.community}${params.size ? `?${params}` : ""}`;
  } catch {
    return ROUTES.community;
  }
}

/** Restores discovery context without putting private data in navigation state. */
export function useCommunityReturnPath() {
  return useSyncExternalStore(subscribe, readPath, () => ROUTES.community);
}
