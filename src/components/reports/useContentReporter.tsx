"use client";

import { useCallback, useState, type ReactNode } from "react";

import { Toast } from "@/components/ui";
import { useReportContent, useToast } from "@/hooks";
import type { ReportableContentType, ReportReason } from "@/types";

import { ReportContentDialog } from "./ReportContentDialog";

/** What is being reported, and how the dialog names it. */
export interface ReportTarget {
  contentType: ReportableContentType;
  contentId: number;
  /** Dialog title, e.g. "Denunciar foto". */
  title: string;
}

export interface UseContentReporterResult {
  /** Opens the report dialog for `target`. */
  request: (target: ReportTarget) => void;
  /** The dialog and its confirmation toast; render it once, anywhere. */
  element: ReactNode;
}

/**
 * One report dialog and one confirmation toast for a whole list of
 * reportable content (#156). `onReported` runs once the content should
 * leave the reporter's view; the toast outlives the item it was about.
 */
export function useContentReporter(
  onReported: (target: ReportTarget) => void,
): UseContentReporterResult {
  const [target, setTarget] = useState<ReportTarget | null>(null);
  const toast = useToast();
  const { show } = toast;

  const finish = useCallback(
    (reported: ReportTarget, message: string) => {
      setTarget(null);
      onReported(reported);
      show(message);
    },
    [onReported, show],
  );

  return {
    request: setTarget,
    element: (
      <>
        {target ? (
          <ReportDialog
            key={`${target.contentType}:${target.contentId}`}
            target={target}
            onClose={() => setTarget(null)}
            onDone={(message) => finish(target, message)}
          />
        ) : null}
        <Toast notice={toast.notice} onDismiss={toast.dismiss} />
      </>
    ),
  };
}

function ReportDialog({
  target,
  onClose,
  onDone,
}: {
  target: ReportTarget;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const { submitting, error, submit } = useReportContent(target.contentType, target.contentId);

  async function send(reason: ReportReason, detail: string) {
    const outcome = await submit(reason, detail);
    if (outcome?.done) onDone(outcome.message);
  }

  return (
    <ReportContentDialog
      title={target.title}
      submitting={submitting}
      error={error?.message ?? null}
      onClose={onClose}
      onSubmit={(reason, detail) => void send(reason, detail)}
    />
  );
}
