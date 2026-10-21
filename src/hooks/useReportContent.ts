"use client";

import { useCallback, useRef, useState } from "react";

import { reportContent } from "@/lib/api";
import { toReportError, type ReportError } from "@/lib/contentReports";
import type { ReportableContentType, ReportReason } from "@/types";

/** What the reporter is told once a report leaves their hands. */
export const REPORT_THANKS = "Gracias, lo vamos a revisar.";

/**
 * Outcome of a `submit` call; `null` when another one was already in flight.
 * `done` means the content should leave the reporter's view, with `message`
 * as the confirmation: the report was sent, or there was nothing left to
 * report (already reported, or gone).
 */
export type ReportOutcome =
  | { done: true; message: string }
  | { done: false; error: ReportError };

export interface UseReportContentResult {
  submitting: boolean;
  /** The last failure that keeps the dialog open; `null` otherwise. */
  error: ReportError | null;
  submit: (reason: ReportReason, detail: string) => Promise<ReportOutcome | null>;
}

/** Sends a report about one piece of content (#156). */
export function useReportContent(
  contentType: ReportableContentType,
  contentId: number,
): UseReportContentResult {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<ReportError | null>(null);
  const inFlight = useRef(false);

  const submit = useCallback(
    async (reason: ReportReason, detail: string): Promise<ReportOutcome | null> => {
      if (inFlight.current) return null;
      inFlight.current = true;
      setSubmitting(true);
      setError(null);
      try {
        await reportContent({
          contentType,
          contentId,
          reason,
          ...(detail.trim() ? { detail: detail.trim() } : {}),
        });
        return { done: true, message: REPORT_THANKS };
      } catch (err) {
        const reportError = toReportError(err);
        if (reportError.dismiss) return { done: true, message: reportError.message };
        setError(reportError);
        return { done: false, error: reportError };
      } finally {
        inFlight.current = false;
        setSubmitting(false);
      }
    },
    [contentType, contentId],
  );

  return { submitting, error, submit };
}
