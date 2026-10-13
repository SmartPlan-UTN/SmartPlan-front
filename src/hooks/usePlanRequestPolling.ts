import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError, createPlanRequest, createSurprisePlanRequest, getPlanRequestStatus } from '@/lib/api';
import type {
  CreatePlanRequestPayload,
  CreateSurprisePlanRequestPayload,
  PlanDetailResult,
  PlanRequestProgressStage,
  PlanRequestStatus,
  ResolvedPlanContext,
  RequestStatusKey,
} from '@/types';

const DISPLAY_TIMEOUT_MS = 15_000;
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
  /** "Lo voy a hacer" succeeded: mark that alternative as chosen, with its outing. */
  applySelectionChange: (planId: number, outingId: number) => void;
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
  const generation = useRef(0);
  const delayedRef = useRef(false);

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

  useEffect(() => () => {
    generation.current += 1;
    activeRequestId.current = null;
    clearTimers();
  }, [clearTimers]);

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
    if (status.statusKey !== 'failed') setFailure(null);
    setPhase(delayedRef.current && ['pending', 'processing'].includes(status.statusKey) ? 'timedOut' : phaseForStatus(status));
  }, []);

  const startPolling = useCallback((id: number, startedAt = Date.now()) => {
    const epoch = ++generation.current;
    delayedRef.current = false;
    clearTimers();
    activeRequestId.current = id;
    pollStartedAt.current = startedAt;

    displayTimeoutRef.current = setTimeout(() => {
      if (generation.current !== epoch || activeRequestId.current !== id) return;
      delayedRef.current = true;
      setPhase('timedOut');
    }, Math.max(0, DISPLAY_TIMEOUT_MS - (Date.now() - startedAt)));

    let firstPoll = true;
    const poll = async () => {
      try {
        const status = await getPlanRequestStatus(id);
        if (generation.current !== epoch || activeRequestId.current !== id) return;
        if (firstPoll && Date.now() - new Date(status.requestedAt).getTime() >= DISPLAY_TIMEOUT_MS) delayedRef.current = true;
        firstPoll = false;
        applyStatus(status);

        if (status.statusKey === 'generated' || status.statusKey === 'failed') {
          clearTimers();
          return;
        }

        const age = Date.now() - pollStartedAt.current;
        const delay = age < 8_000 ? 1_200 : age < 30_000 ? 2_000 : 3_500;
        pollTimeoutRef.current = setTimeout(() => void poll(), delay);
      } catch (error) {
        if (generation.current !== epoch || activeRequestId.current !== id) return;
        if (error instanceof ApiError && !error.isNetworkError && error.status !== null && error.status < 500 && error.status !== 408 && error.status !== 429) {
          clearTimers();
          setFailure(toFailure(error));
          setPhase('failed');
          return;
        }
        setFailure({ code: 'STATUS_UNAVAILABLE', message: 'No podemos consultar el estado de tu pedido.' });
        setPhase('timedOut');
        pollTimeoutRef.current = setTimeout(() => void poll(), 3_500);
      }
    };

    void poll();
  }, [applyStatus, clearTimers]);

  useEffect(() => {
    if (initialRequestId == null) return;
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
    const epoch = ++generation.current;
    const startedAt = Date.now();
    displayTimeoutRef.current = setTimeout(() => {
      if (generation.current !== epoch) return;
      delayedRef.current = true;
      setPhase('timedOut');
    }, DISPLAY_TIMEOUT_MS);

    try {
      const accepted = await accept();
      if (generation.current !== epoch) return;
      activeRequestId.current = accepted.id;
      setPlanRequestId(accepted.id);
      if (accepted.mode) setMode(accepted.mode);
      if (accepted.requestedAt) setRequestedAt(accepted.requestedAt);
      setPhase('pending');
      startPolling(accepted.id, startedAt);
    } catch (error) {
      if (generation.current !== epoch) return;
      clearTimers();
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
    delayedRef.current = false;
    setFailure(null);
    setPhase('pending');
    // Polling continues on the same request; this only dismisses the notice.
    if (displayTimeoutRef.current !== null) clearTimeout(displayTimeoutRef.current);
  }, [planRequestId]);

  const discard = useCallback(() => {
    generation.current += 1;
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

  const applySelectionChange = useCallback((planId: number, outingId: number) => {
    setPlans((current) => current?.map((plan) => plan.id === planId
      ? { ...plan, viewerPlanState: 'selected' as const, activeOutingId: outingId }
      : plan) ?? current);
  }, []);

  const refresh = useCallback(() => {
    if (planRequestId === null) return;
    const epoch = generation.current;
    void getPlanRequestStatus(planRequestId)
      .then(status => { if (generation.current === epoch) applyStatus(status); })
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
