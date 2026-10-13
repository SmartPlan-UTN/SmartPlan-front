"use client";

import { useCallback, useRef, useState } from "react";

import type { ToastNotice } from "@/components/ui";

export interface UseToastResult {
  notice: ToastNotice | null;
  show: (message: string) => void;
  dismiss: () => void;
}

/** The state behind a `Toast`: each `show` restarts its timer. */
export function useToast(): UseToastResult {
  const [notice, setNotice] = useState<ToastNotice | null>(null);
  const nextId = useRef(0);

  const show = useCallback((message: string) => {
    nextId.current += 1;
    setNotice({ id: nextId.current, message });
  }, []);
  const dismiss = useCallback(() => setNotice(null), []);

  return { notice, show, dismiss };
}
