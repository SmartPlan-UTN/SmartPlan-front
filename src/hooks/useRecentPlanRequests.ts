"use client";

import { useCallback, useEffect, useState } from "react";

import { listPlanRequests } from "@/lib/api";
import { useSession } from "@/lib/auth";
import type { PlanRequestSummary } from "@/types";

export type RecentPlanRequestsStatus = "idle" | "loading" | "ready" | "empty" | "error";

export interface UseRecentPlanRequestsResult {
  status: RecentPlanRequestsStatus;
  requests: PlanRequestSummary[];
  retry: () => void;
}

const RECENT_LIMIT = 5;
/** While a listed search is still generating, refresh so it turns into "N planes". */
const IN_FLIGHT_REFRESH_MS = 5_000;

/**
 * The signed-in user's latest searches (#189). The API only lists searches
 * with something to reopen. Without a session it stays `idle`, never calls
 * the API and forgets the previous user's list.
 */
export function useRecentPlanRequests(): UseRecentPlanRequestsResult {
  const { authenticated, user } = useSession();
  const userId = authenticated ? (user?.id ?? null) : null;
  const [status, setStatus] = useState<RecentPlanRequestsStatus>("loading");
  const [requests, setRequests] = useState<PlanRequestSummary[]>([]);
  const [attempt, setAttempt] = useState(0);
  const [refresh, setRefresh] = useState(0);

  // Another user (or none): never show the previous one's searches, not even
  // while the new list loads.
  const [listedFor, setListedFor] = useState(userId);
  if (listedFor !== userId) {
    setListedFor(userId);
    setStatus("loading");
    setRequests([]);
    setRefresh(0);
  }

  useEffect(() => {
    if (userId === null) return;
    let active = true;

    listPlanRequests({ limit: RECENT_LIMIT })
      .then(({ data }) => {
        if (!active) return;
        setRequests(data);
        setStatus(data.length > 0 ? "ready" : "empty");
      })
      .catch(() => {
        if (!active) return;
        // A background refresh keeps the last good list on screen.
        if (refresh === 0) setStatus("error");
      });

    return () => {
      active = false;
    };
  }, [userId, attempt, refresh]);

  const inFlight = requests.some((request) => request.statusKey !== "generated");
  useEffect(() => {
    if (!inFlight) return;
    const id = setTimeout(() => setRefresh((value) => value + 1), IN_FLIGHT_REFRESH_MS);
    return () => clearTimeout(id);
  }, [inFlight, refresh]);

  const retry = useCallback(() => {
    setStatus("loading");
    setRefresh(0);
    setAttempt((value) => value + 1);
  }, []);

  return { status: userId === null ? "idle" : status, requests, retry };
}
