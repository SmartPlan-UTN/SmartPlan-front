"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";

import { FeedbackDialog } from "@/components/feedback";
import { PageKicker } from "@/components/layout";
import { Button, ConfirmationDialog, Icon } from "@/components/ui";
import { useDebouncedValue, useOutings } from "@/hooks";
import { cancelOuting, completeOuting, repeatOuting } from "@/lib/api";
import {
  outingsTabRoute,
  PLAN_COMPOSER_ROUTE,
  type OutingsTab,
} from "@/lib/routes";
import type {
  OutingDetail,
  OutingFilters,
  OutingSummary,
  PlanFeedback,
} from "@/types";

import { OutingCard } from "./OutingCard";
import { activeFilterCount, OutingsFilters } from "./OutingsFilters";
import { OutingsPagination } from "./OutingsPagination";
import { OUTINGS_COPY } from "./outingsContent";
import styles from "./outings.module.css";

const SKELETON_KEYS = ["a", "b", "c", "d"];
const SEARCH_DEBOUNCE_MS = 300;

const monthFormatter = new Intl.DateTimeFormat("es-AR", {
  month: "long",
  year: "numeric",
});

interface MonthGroup {
  key: string;
  label: string;
  outings: OutingSummary[];
}

/** The date an outing is filed under: when it was done, else when chosen. */
function outingDate(outing: OutingSummary): Date {
  return new Date(
    outing.status === "completed"
      ? (outing.completedAt ?? outing.createdAt)
      : outing.createdAt,
  );
}

/**
 * Splits a page into months, keeping the API's order, so the list reads like
 * a diary ("Septiembre 2026") instead of an undifferentiated grid (#134).
 */
function groupByMonth(outings: OutingSummary[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  for (const outing of outings) {
    const date = outingDate(outing);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const last = groups.at(-1);
    if (last?.key === key) {
      last.outings.push(outing);
    } else {
      const label = monthFormatter.format(date).replace(" de ", " ");
      groups.push({
        key,
        label: label.charAt(0).toUpperCase() + label.slice(1),
        outings: [outing],
      });
    }
  }
  return groups;
}

const TABS: ReadonlyArray<{ id: OutingsTab; label: string }> = [
  { id: "to-do", label: OUTINGS_COPY.tabs.toDo },
  { id: "completed", label: OUTINGS_COPY.tabs.completed },
];

export interface OutingsViewProps {
  initialTab?: OutingsTab;
}

type Notice = { tone: "ok" | "warn"; text: string };

/**
 * "Mis salidas" (#130, CU22, CU23), replacing Historial: the plans the
 * person chose to do and the ones they did, in two tabs.
 *
 *  - "Marcar como realizada" moves the outing to Realizadas and opens the
 *    feedback right away; "Ahora no" closes it and the invite stays on the
 *    card, as the 24 h reminder will point back here.
 *  - Cancelling asks first, and only exists for outings still to do.
 *  - "Volver a hacer este plan" adds a new outing to Por hacer and keeps the
 *    done one, with its feedback, in Realizadas.
 */
export function OutingsView({ initialTab = "to-do" }: OutingsViewProps) {
  const [tab, setTab] = useState<OutingsTab>(initialTab);
  // A link to the other tab while this screen is open (the back link of an
  // outing, a notification) arrives as a new `initialTab`. Adjusted during
  // render, like `useExplorationSearch`'s page reset, so the view never
  // remounts and loses what it is showing (the feedback dialog).
  const [lastInitialTab, setLastInitialTab] = useState(initialTab);
  if (initialTab !== lastInitialTab) {
    setLastInitialTab(initialTab);
    setTab(initialTab);
  }
  const [searchText, setSearchText] = useState("");
  const [filters, setFilters] = useState<OutingFilters>({});
  const debouncedSearch = useDebouncedValue(searchText, SEARCH_DEBOUNCE_MS);
  // Typing waits for a pause; emptying the box (or "Limpiar") applies at once.
  const search = searchText.trim() === "" ? "" : debouncedSearch;
  const filtering =
    search.trim() !== "" || activeFilterCount(filters, tab === "completed") > 0;
  const clearFilters = useCallback(() => {
    setSearchText("");
    setFilters({});
  }, []);
  const {
    outings,
    status,
    errorMessage,
    hasResults,
    page,
    totalPages,
    total,
    pageSize,
    goToPage,
    retry,
    patchOuting,
  } = useOutings(tab === "to-do" ? "to_do" : "completed", {
    ...filters,
    search,
  });

  // Filed by month only while the list runs by date; ordered by cost, a
  // month heading would repeat out of order.
  const byDate = !filters.sort || filters.sort === "recent" || filters.sort === "oldest";
  const groups = useMemo(
    () =>
      byDate
        ? groupByMonth(outings)
        : [{ key: "all", label: "", outings }],
    [byDate, outings],
  );
  const panelRef = useRef<HTMLDivElement>(null);

  // Changing page brings the top of the list back into view; otherwise the
  // new page appears below the fold, where the pagination was clicked.
  const changePage = useCallback(
    (next: number) => {
      goToPage(next);
      const panel = panelRef.current;
      if (panel && panel.getBoundingClientRect().top < 0) {
        panel.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    [goToPage],
  );

  const [busyId, setBusyId] = useState<number | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [pendingCancel, setPendingCancel] = useState<OutingSummary | null>(
    null,
  );
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  // The outing just marked as done, whose feedback opens immediately.
  const [justCompleted, setJustCompleted] = useState<OutingDetail | null>(
    null,
  );
  // "Ahora no" — session only, never persisted (US18 defines no dismissal).
  const [dismissedInvites, setDismissedInvites] = useState<Set<number>>(
    () => new Set(),
  );

  // The URL follows the tab so a reload or a shared link opens it, but
  // through `history.replaceState`: a router navigation would re-render the
  // page on the server for no reason. Next.js keeps its router in sync.
  const selectTab = useCallback((next: OutingsTab) => {
    setTab(next);
    window.history.replaceState(null, "", outingsTabRoute(next));
  }, []);

  const dismissInvite = useCallback((outingId: number) => {
    setDismissedInvites((current) => new Set(current).add(outingId));
  }, []);

  const handleSubmitted = useCallback(
    (outingId: number, feedback: PlanFeedback) => {
      patchOuting(outingId, { feedbackState: "submitted", feedback });
    },
    [patchOuting],
  );

  async function handleComplete(outing: OutingSummary) {
    if (busyId !== null) return;
    setBusyId(outing.id);
    setNotice(null);
    try {
      const completed = await completeOuting(outing.id);
      setNotice({ tone: "ok", text: OUTINGS_COPY.notices.completed(outing.title) });
      setJustCompleted(completed);
      if (tab === "completed") retry();
      else selectTab("completed");
    } catch {
      setNotice({ tone: "warn", text: OUTINGS_COPY.errors.complete });
    } finally {
      setBusyId(null);
    }
  }

  async function handleRepeat(outing: OutingSummary) {
    if (busyId !== null) return;
    setBusyId(outing.id);
    setNotice(null);
    try {
      const { created } = await repeatOuting(outing.id);
      setNotice({
        tone: "ok",
        text: created
          ? OUTINGS_COPY.notices.repeated(outing.title)
          : OUTINGS_COPY.notices.alreadyToDo(outing.title),
      });
      selectTab("to-do");
    } catch {
      setNotice({ tone: "warn", text: OUTINGS_COPY.errors.repeat });
    } finally {
      setBusyId(null);
    }
  }

  async function confirmCancel() {
    if (!pendingCancel) return;
    setIsCancelling(true);
    setCancelError(null);
    try {
      await cancelOuting(pendingCancel.id);
      setNotice({
        tone: "ok",
        text: OUTINGS_COPY.notices.cancelled(pendingCancel.title),
      });
      setPendingCancel(null);
      retry();
    } catch {
      setCancelError(OUTINGS_COPY.errors.cancel);
    } finally {
      setIsCancelling(false);
    }
  }

  const emptyText =
    tab === "to-do" ? OUTINGS_COPY.empty.toDo : OUTINGS_COPY.empty.completed;

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <PageKicker>{OUTINGS_COPY.kicker}</PageKicker>
        <h1 id="outings-title" className="sp-page-title">
          {OUTINGS_COPY.title}{" "}
          <span className="sp-page-title-accent">
            {OUTINGS_COPY.titleAccent}
          </span>
        </h1>
        <p className="sp-page-lead">{OUTINGS_COPY.lead}</p>

        <div
          className={styles.tabs}
          role="tablist"
          aria-label={OUTINGS_COPY.tabsLabel}
        >
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`outings-${item.id}-tab`}
              aria-selected={tab === item.id}
              aria-controls="outings-panel"
              className={
                tab === item.id ? `${styles.tab} ${styles.tabActive}` : styles.tab
              }
              onClick={() => selectTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <OutingsFilters
          searchText={searchText}
          onSearchTextChange={setSearchText}
          filters={filters}
          onFiltersChange={setFilters}
          showRated={tab === "completed"}
          onClear={clearFilters}
        />
      </header>

      <p
        className={
          notice?.tone === "warn"
            ? `${styles.notice} ${styles.noticeWarn}`
            : styles.notice
        }
        role="status"
        aria-live="polite"
      >
        {notice ? (
          <>
            <Icon
              name={notice.tone === "ok" ? "circle-check" : "circle-alert"}
              size={16}
              aria-hidden="true"
            />
            {notice.text}
          </>
        ) : null}
      </p>

      <div
        id="outings-panel"
        ref={panelRef}
        className={styles.panel}
        role="tabpanel"
        aria-labelledby={`outings-${tab}-tab`}
      >
        {status === "loading" && !hasResults ? (
          <div className={styles.list} aria-hidden="true">
            {SKELETON_KEYS.map((key) => (
              <div key={key} className={styles.skeleton} />
            ))}
          </div>
        ) : status === "error" && !hasResults ? (
          <div className={styles.state} role="alert">
            <Icon name="triangle-alert" size={30} className={styles.stateIcon} />
            <p className="sp-body">{errorMessage ?? OUTINGS_COPY.loadError}</p>
            <Button variant="secondary" size="sm" onClick={retry}>
              {OUTINGS_COPY.retry}
            </Button>
          </div>
        ) : !hasResults && filtering ? (
          <div className={`${styles.state} ${styles.stateFiltered}`}>
            <Icon name="search" size={30} className={styles.stateIcon} />
            <p className="sp-body">{OUTINGS_COPY.filters.noResults}</p>
            <Button variant="secondary" size="sm" onClick={clearFilters}>
              {OUTINGS_COPY.filters.clear}
            </Button>
          </div>
        ) : !hasResults ? (
          <div className={styles.state}>
            <Icon name="calendar-check" size={30} className={styles.stateIcon} />
            <p className="sp-body">{emptyText}</p>
            {tab === "to-do" ? (
              <Link href={PLAN_COMPOSER_ROUTE} className={styles.stateCta}>
                <Button variant="primary" size="sm">
                  <Icon name="sparkles" size={14} aria-hidden="true" />
                  {OUTINGS_COPY.empty.cta}
                </Button>
              </Link>
            ) : null}
          </div>
        ) : (
          <>
            {groups.map((group) => (
              <section
                key={group.key}
                className={styles.month}
                aria-labelledby={group.label ? `outings-month-${group.key}` : undefined}
              >
                {group.label ? (
                  <h2 id={`outings-month-${group.key}`} className={styles.monthTitle}>
                    {group.label}
                    <span className={styles.monthCount}>
                      {OUTINGS_COPY.monthCount(group.outings.length)}
                    </span>
                  </h2>
                ) : null}
                <div className={styles.list}>
                  {group.outings.map((outing) => (
                    <OutingCard
                      key={outing.id}
                      outing={outing}
                      busy={busyId === outing.id}
                      inviteDismissed={dismissedInvites.has(outing.id)}
                      onComplete={(target) => void handleComplete(target)}
                      onCancel={(target) => {
                        setCancelError(null);
                        setPendingCancel(target);
                      }}
                      onRepeat={(target) => void handleRepeat(target)}
                      onDismissInvite={() => dismissInvite(outing.id)}
                      onSubmitted={handleSubmitted}
                      onReconcile={retry}
                    />
                  ))}
                </div>
              </section>
            ))}

            <OutingsPagination
              page={page}
              totalPages={totalPages}
              total={total}
              pageSize={pageSize}
              onPageChange={changePage}
            />
          </>
        )}
      </div>

      {justCompleted ? (
        <FeedbackDialog
          open
          planId={justCompleted.id}
          planTitle={justCompleted.title}
          estimatedTotalCost={justCompleted.estimatedTotalCost}
          completedAt={justCompleted.completedAt}
          activityCount={justCompleted.activityCount}
          canShare={justCompleted.source?.hasCommunity ?? false}
          onDismiss={() => setJustCompleted(null)}
          onSubmitted={(feedback) => {
            handleSubmitted(justCompleted.id, feedback);
            setJustCompleted(null);
          }}
          onReconcile={retry}
          onMediaChanged={retry}
        />
      ) : null}

      {pendingCancel ? (
        <ConfirmationDialog
          title={OUTINGS_COPY.cancelDialog.title(pendingCancel.title)}
          confirmLabel={OUTINGS_COPY.cancelDialog.confirm}
          confirmingLabel={OUTINGS_COPY.cancelDialog.confirming}
          cancelLabel={OUTINGS_COPY.cancelDialog.back}
          isConfirming={isCancelling}
          error={cancelError}
          onCancel={() => setPendingCancel(null)}
          onConfirm={() => void confirmCancel()}
        >
          <p>{OUTINGS_COPY.cancelDialog.body}</p>
        </ConfirmationDialog>
      ) : null}
    </div>
  );
}
