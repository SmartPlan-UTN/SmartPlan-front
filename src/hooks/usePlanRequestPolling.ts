import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError, createPlanRequest, createSurprisePlanRequest, getPlanRequestStatus } from '@/lib/api';
import type {
  CreatePlanRequestPayload,
  CreateSurprisePlanRequestPayload,
  PlanDetailResult,
  PlanRequestProgressStage,
  PlanRequestStatus,
  PlanSelectionResult,
  ResolvedPlanContext,
  RequestStatusKey,
} from '@/types';

const DISPLAY_TIMEOUT_MS = 90_000;
const GENERIC_ERROR = 'No pudimos generar tu plan. Intentá de nuevo.';

export type PlanRequestPhase =
  | 'idle'
  | 'submitting'
  | 'pending'
  | 'processing'
  | 'timedOut'
  | 'generated'
  | 'failed';

export interface PlanRequestFailure {
  code: string | null;
  message: string;
}

export type LastSubmission =
  | { kind: 'auto'; payload: CreatePlanRequestPayload }
  | { kind: 'surprise'; payload: CreateSurprisePlanRequestPayload };

export interface UsePlanRequestPollingResult {
  phase: PlanRequestPhase;
  planRequestId: number | null;
  plans: PlanDetailResult[] | null;
  query: string | null;
  mode: 'automatic' | 'surprise' | null;
  requestedAt: string | null;
  progressStage: PlanRequestProgressStage | null;
  progressStageAt: string | null;
  estimatedRemainingSeconds: number | null;
  resolvedContext: ResolvedPlanContext | null;
  failure: PlanRequestFailure | null;
  submit: (payload: CreatePlanRequestPayload) => void;
  submitSurprise: (payload: CreateSurprisePlanRequestPayload) => void;
  keepWaiting: () => void;
  discard: () => void;
  retry: () => void;
  regenerate: () => void;
  lastSubmission: LastSubmission | null;
  applySelectionChange: (result: PlanSelectionResult) => void;
  refresh: () => void;
}

function toFailure(error: unknown): PlanRequestFailure {
  if (error instanceof ApiError) {
    return { code: error.code, message: error.message || GENERIC_ERROR };
  }
  return { code: null, message: GENERIC_ERROR };
}

function statusKeyToPhase(statusKey: RequestStatusKey): PlanRequestPhase {
  return statusKey;
}

function phaseForStatus(status: PlanRequestStatus): PlanRequestPhase {
  return statusKeyToPhase(status.statusKey);
}

/**
 * Owns the request lifecycle and can start from a durable ID supplied by a
 * result route. Polls never overlap, slow stages back off gently, and only
 * backend terminal statuses finish the request.
 */
export function usePlanRequestPolling(initialRequestId?: number): UsePlanRequestPollingResult {
  const [phase, setPhase] = useState<PlanRequestPhase>(initialRequestId ? 'pending' : 'idle');
  const [planRequestId, setPlanRequestId] = useState<number | null>(initialRequestId ?? null);
  const [plans, setPlans] = useState<PlanDetailResult[] | null>(null);
  const [query, setQuery] = useState<string | null>(null);
  const [mode, setMode] = useState<'automatic' | 'surprise' | null>(null);
  const [requestedAt, setRequestedAt] = useState<string | null>(null);
  const [progressStage, setProgressStage] = useState<PlanRequestProgressStage | null>(null);
  const [progressStageAt, setProgressStageAt] = useState<string | null>(null);
  const [estimatedRemainingSeconds, setEstimatedRemainingSeconds] = useState<number | null>(null);
  const [resolvedContext, setResolvedContext] = useState<ResolvedPlanContext | null>(null);
  const [failure, setFailure] = useState<PlanRequestFailure | null>(null);
  const [lastSubmission, setLastSubmission] = useState<LastSubmission | null>(null);

  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const displayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRequestId = useRef<number | null>(initialRequestId ?? null);
  const pollStartedAt = useRef(0);
  const initializedRequestId = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (pollTimeoutRef.current !== null) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
    if (displayTimeoutRef.current !== null) {
      clearTimeout(displayTimeoutRef.current);
      displayTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const applyStatus = useCallback((status: PlanRequestStatus) => {
    // Older API responses omit query; keep the accepted POST value visible.
    setQuery((current) => status.query ?? current);
    setMode(status.mode);
    setRequestedAt(status.requestedAt);
    setProgressStage(status.progressStage ?? null);
    setProgressStageAt(status.progressStageAt ?? null);
    setEstimatedRemainingSeconds(status.estimatedRemainingSeconds ?? null);
    setResolvedContext(status.resolvedContext ?? null);

    if (status.statusKey === 'generated') {
      setPlans(status.plans ?? []);
      setFailure(null);
    } else if (status.statusKey === 'failed') {
      setFailure({ code: status.failureCode ?? null, message: GENERIC_ERROR });
    }
    setPhase(phaseForStatus(status));
  }, []);

  const startPolling = useCallback((id: number) => {
    clearTimers();
    activeRequestId.current = id;
    pollStartedAt.current = Date.now();

    displayTimeoutRef.current = setTimeout(() => {
      if (activeRequestId.current !== id) return;
      if (pollTimeoutRef.current !== null) {
        clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }
      setPhase('timedOut');
    }, DISPLAY_TIMEOUT_MS);

    const poll = async () => {
      try {
        const status = await getPlanRequestStatus(id);
        if (activeRequestId.current !== id) return;
        applyStatus(status);

        if (status.statusKey === 'generated' || status.statusKey === 'failed') {
          clearTimers();
          return;
        }

        const age = Date.now() - pollStartedAt.current;
        const delay = age < 8_000 ? 1_200 : age < 30_000 ? 2_000 : 3_500;
        pollTimeoutRef.current = setTimeout(() => void poll(), delay);
      } catch (error) {
        if (activeRequestId.current !== id) return;
        clearTimers();
        setFailure(toFailure(error));
        setPhase('failed');
      }
    };

    void poll();
  }, [applyStatus, clearTimers]);

  useEffect(() => {
    if (initialRequestId == null || initializedRequestId.current === initialRequestId) return;
    initializedRequestId.current = initialRequestId;
    startPolling(initialRequestId);
  }, [initialRequestId, startPolling]);

  const beginRequest = useCallback(async (
    accept: () => Promise<{ id: number; mode?: 'automatic' | 'surprise'; requestedAt?: string }>,
  ) => {
    clearTimers();
    activeRequestId.current = null;
    setFailure(null);
    setPlans(null);
    setResolvedContext(null);
    setProgressStage(null);
    setProgressStageAt(null);
    setEstimatedRemainingSeconds(null);
    setPhase('submitting');

    try {
      const accepted = await accept();
      activeRequestId.current = accepted.id;
      setPlanRequestId(accepted.id);
      if (accepted.mode) setMode(accepted.mode);
      if (accepted.requestedAt) setRequestedAt(accepted.requestedAt);
      setPhase('pending');
      startPolling(accepted.id);
    } catch (error) {
      setFailure(toFailure(error));
      setPhase('failed');
    }
  }, [clearTimers, startPolling]);

  const submit = useCallback((payload: CreatePlanRequestPayload) => {
    setLastSubmission({ kind: 'auto', payload });
    setQuery(payload.query);
    setMode('automatic');
    void beginRequest(() => createPlanRequest(payload));
  }, [beginRequest]);

  const submitSurprise = useCallback((payload: CreateSurprisePlanRequestPayload) => {
    setLastSubmission({ kind: 'surprise', payload });
    setQuery(null);
    setMode('surprise');
    void beginRequest(() => createSurprisePlanRequest(payload));
  }, [beginRequest]);

  const retry = useCallback(() => {
    if (!lastSubmission) return;
    if (lastSubmission.kind === 'surprise') {
      void beginRequest(() => createSurprisePlanRequest(lastSubmission.payload));
    } else {
      void beginRequest(() => createPlanRequest(lastSubmission.payload));
    }
  }, [beginRequest, lastSubmission]);

  const regenerate = useCallback(() => {
    if (!lastSubmission || lastSubmission.kind !== 'surprise') return;
    if (phase === 'submitting' || phase === 'pending' || phase === 'processing') return;
    void beginRequest(() => createSurprisePlanRequest(lastSubmission.payload));
  }, [beginRequest, lastSubmission, phase]);

  const keepWaiting = useCallback(() => {
    if (planRequestId === null) return;
    setPhase('processing');
    startPolling(planRequestId);
  }, [planRequestId, startPolling]);

  const discard = useCallback(() => {
    clearTimers();
    activeRequestId.current = null;
    setPlanRequestId(null);
    setPlans(null);
    setQuery(null);
    setMode(null);
    setRequestedAt(null);
    setProgressStage(null);
    setProgressStageAt(null);
    setEstimatedRemainingSeconds(null);
    setResolvedContext(null);
    setFailure(null);
    setPhase('idle');
  }, [clearTimers]);

  const applySelectionChange = useCallback((result: PlanSelectionResult) => {
    setPlans((current) => current?.map((plan) => plan.id === result.id
      ? { ...plan, status: result.status, viewerPlanState: result.viewerPlanState ?? plan.viewerPlanState }
      : plan) ?? current);
  }, []);

  const refresh = useCallback(() => {
    if (planRequestId === null) return;
    void getPlanRequestStatus(planRequestId)
      .then(applyStatus)
      .catch(() => {
        // Leave the visible result intact; the next normal poll can reconcile it.
      });
  }, [applyStatus, planRequestId]);

  return {
    phase,
    planRequestId,
    plans,
    query,
    mode,
    requestedAt,
    progressStage,
    progressStageAt,
    estimatedRemainingSeconds,
    resolvedContext,
    failure,
    submit,
    submitSurprise,
    keepWaiting,
    discard,
    retry,
    regenerate,
    lastSubmission,
    applySelectionChange,
    refresh,
  };
}
