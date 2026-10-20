"use client";

import { useEffect, useState } from "react";

import { ExperienceSummary, FeedbackDialog } from "@/components/feedback";
import { Button, LoadingDots } from "@/components/ui";
import { listOutings } from "@/lib/api";
import { useSession } from "@/lib/auth";
import type { OutingSummary, PlanFeedback } from "@/types";

export interface PlanOwnExperiencesProps {
  planId: number;
  onChanged: () => void;
}

/** Private feedback stays editable from the original plan, across repeat outings. */
export function PlanOwnExperiences({ planId, onChanged }: PlanOwnExperiencesProps) {
  const { status: sessionStatus, user } = useSession();
  const scope = `${planId}:${user?.id ?? sessionStatus}`;
  const [result, setResult] = useState<{
    scope: string;
    outings: OutingSummary[];
    error: boolean;
  } | null>(null);
  const [retry, setRetry] = useState(0);
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    let active = true;
    async function load() {
      try {
        const outings: OutingSummary[] = [];
        let page = 1;
        while (true) {
          const response = await listOutings({ sourcePlanId: planId, status: "completed", rated: true, page, limit: 100 });
          if (!active) return;
          outings.push(...response.data.filter((outing) => outing.source?.id === planId && outing.feedback));
          if (page >= response.pagination.totalPages) break;
          page += 1;
        }
        setResult({ scope, outings, error: false });
      } catch {
        if (active) setResult({ scope, outings: [], error: true });
      }
    }
    void load();
    return () => { active = false; };
  }, [planId, scope, sessionStatus, retry]);

  if (sessionStatus !== "authenticated") return null;
  if (result?.scope !== scope) return <LoadingDots label="Buscando tu valoración…" />;
  if (result.error) {
    return (
      <div role="alert">
        <p>No pudimos cargar tu valoración de este plan.</p>
        <Button variant="ghostLight" onClick={() => { setResult(null); setRetry((value) => value + 1); }}>
          Reintentar
        </Button>
      </div>
    );
  }

  const editing = result.outings.find((outing) => outing.id === editingId);
  function applyFeedback(outingId: number, feedback: PlanFeedback) {
    setResult((current) => current?.scope === scope ? {
      ...current,
      outings: current.outings.map((outing) => outing.id === outingId ? { ...outing, feedback } : outing),
    } : current);
    setEditingId(null);
    onChanged();
  }

  return (
    <>
      {result.outings.map((outing) => outing.feedback ? (
        <div key={outing.id}>
          {result.outings.length > 1 && outing.completedAt ? (
            <p>Salida del {new Intl.DateTimeFormat("es-AR", { dateStyle: "long" }).format(new Date(outing.completedAt))}</p>
          ) : null}
          <ExperienceSummary
            feedback={outing.feedback}
            estimatedTotalCost={outing.estimatedTotalCost}
            onEdit={() => setEditingId(outing.id)}
          />
        </div>
      ) : null)}
      {editing?.feedback ? (
        <FeedbackDialog
          key={editing.id}
          open
          planId={editing.id}
          planTitle={editing.title}
          estimatedTotalCost={editing.estimatedTotalCost}
          completedAt={editing.completedAt}
          activityCount={editing.activityCount}
          existingFeedback={editing.feedback}
          onDismiss={() => setEditingId(null)}
          onSubmitted={(feedback) => applyFeedback(editing.id, feedback)}
        />
      ) : null}
    </>
  );
}
