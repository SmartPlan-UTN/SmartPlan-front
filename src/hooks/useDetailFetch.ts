import { useEffect, useState } from "react";

import { ApiError } from "@/lib/api";

export type DetailFetchStatus = "loading" | "error" | "not-found" | "idle";

export interface UseDetailFetchResult<TResult> {
  data: TResult | null;
  status: DetailFetchStatus;
  errorMessage: string | null;
}

/**
 * Fetch-by-id scaffolding shared by every detail screen (CU13, CU14):
 * a 404 becomes `"not-found"` (its own empty state, distinct from a real
 * error), and a stale response from a superseded `id` is ignored.
 */
export function useDetailFetch<TResult>(
  fetcher: (id: number) => Promise<TResult>,
  id: number,
  genericErrorMessage: string,
): UseDetailFetchResult<TResult> {
  const [data, setData] = useState<TResult | null>(null);
  const [status, setStatus] = useState<DetailFetchStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function run() {
      setStatus("loading");

      try {
        const result = await fetcher(id);
        if (ignore) return;
        setData(result);
        setStatus("idle");
      } catch (error) {
        if (ignore) return;
        if (error instanceof ApiError && error.status === 404) {
          setStatus("not-found");
          return;
        }
        setStatus("error");
        setErrorMessage(error instanceof ApiError ? error.message : genericErrorMessage);
      }
    }

    void run();
    return () => {
      ignore = true;
    };
  }, [fetcher, id, genericErrorMessage]);

  return { data, status, errorMessage };
}
