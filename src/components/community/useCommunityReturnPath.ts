"use client";

import { useSyncExternalStore } from "react";
import { ROUTES } from "@/lib/routes";

export const COMMUNITY_POSITION_KEY = "smartplan:community-position";
const subscribe = () => () => undefined;
function readPath() {
  try {
    const stored = JSON.parse(
      sessionStorage.getItem(COMMUNITY_POSITION_KEY) ?? "null",
    ) as { q?: unknown; type?: unknown; sort?: unknown } | null;
    const params = new URLSearchParams();
    if (typeof stored?.q === "string" && stored.q)
      params.set("q", stored.q.slice(0, 100));
    if (stored?.type === "plans" || stored?.type === "experiences")
      params.set("type", stored.type);
    if (
      stored?.sort === "recent" || stored?.sort === "popular" ||
      stored?.sort === "highest_rated" || stored?.sort === "most_reviewed"
    ) params.set("sort", stored.sort);
    return `${ROUTES.community}${params.size ? `?${params}` : ""}`;
  } catch {
    return ROUTES.community;
  }
}

/** Restores discovery context without putting private data in navigation state. */
export function useCommunityReturnPath() {
  return useSyncExternalStore(subscribe, readPath, () => ROUTES.community);
}
