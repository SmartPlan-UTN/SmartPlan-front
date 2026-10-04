"use client";

import {
  useEffect,
  useMemo,
  useRef,
  type KeyboardEvent,
  type Ref,
} from "react";

import { Icon } from "@/components/ui";
import type { UseExplorationSearchResult } from "@/hooks";
import { formatArs, formatDuration } from "@/lib/utils";
import type { ActivitySearchParams, ActivitySearchResult } from "@/types";

import {
  CatalogPanel,
  type CatalogAssistant,
  type CatalogMapInput,
  type DiscoveryView,
} from "./CatalogPanel";
import type { ComposerStop } from "./draft";
import type { DurationHealth } from "./planDuration";
import type { CatalogLocation } from "./useCatalogLocation";
import { useStickyOverflow } from "./useStickyTop";
import styles from "./ActivitiesStep.module.css";

export type ComposerPane = "catalog" | "itinerary";
type ActivitySortBy = NonNullable<ActivitySearchParams["sortBy"]>;

interface ActivitiesStepProps {
  title: string;
  headingRef: Ref<HTMLHeadingElement>;
  health: DurationHealth;
  catalog: UseExplorationSearchResult<ActivitySearchResult>;
  location: CatalogLocation;
  assistant: CatalogAssistant;
  stops: ComposerStop[];
  totalCost: number;
  totalDuration: number;
  search: string;
  minPrice: string;
  maxPrice: string;
  priceRangeError: string | null;
  categoryIds: number[];
  sortBy: ActivitySortBy;
  defaultSort: ActivitySortBy;
  mobilePane: ComposerPane;
  view: DiscoveryView;
  map: CatalogMapInput;
  isSearchTermTooShort: boolean;
  isSearchSettling: boolean;
  prefillLoading: boolean;
  prefillError: string | null;
  isSaving: boolean;
  announcement: string;
  onSearchChange: (value: string) => void;
  onMinPriceChange: (value: string) => void;
  onMaxPriceChange: (value: string) => void;
  onToggleCategory: (categoryId: number) => void;
  onSortChange: (value: ActivitySortBy) => void;
  onPaneChange: (pane: ComposerPane) => void;
  onViewChange: (view: DiscoveryView) => void;
  onAdd: (activity: ActivitySearchResult) => void;
  onRemove: (activityId: number) => void;
  /** The activity pointed at anywhere in the composer. */
  focusedActivityId: number | null;
  onPoint: (activityId: number | null) => void;
}

/**
 * The discovery half of the route step: what the person is making (its name,
 * the search that feeds it) on the cream canvas. The route they are drawing is
 * the composer's own dark object beside it. From 900px both are visible at
 * once; below that they are two tabs of the same page (these tabs control the
 * route too) and each keeps its own state while the other is shown.
 */
export function ActivitiesStep({
  title,
  headingRef,
  health,
  catalog,
  location,
  assistant,
  stops,
  totalCost,
  totalDuration,
  search,
  minPrice,
  maxPrice,
  priceRangeError,
  categoryIds,
  sortBy,
  defaultSort,
  mobilePane,
  view,
  map,
  isSearchTermTooShort,
  isSearchSettling,
  prefillLoading,
  prefillError,
  isSaving,
  announcement,
  onSearchChange,
  onMinPriceChange,
  onMaxPriceChange,
  onToggleCategory,
  onSortChange,
  onPaneChange,
  onViewChange,
  onAdd,
  onRemove,
  focusedActivityId,
  onPoint,
}: ActivitiesStepProps) {
  // Numbered like the route: a row's ✓ and its marker carry the same number.
  const stopNumbers = useMemo(
    () => new Map(stops.map((stop, index) => [stop.activity.id, index + 1])),
    [stops],
  );
  const discoverRef = useRef<HTMLDivElement>(null);
  useStickyOverflow(discoverRef);
  const catalogScrollRef = useRef(0);
  const previousPaneRef = useRef(mobilePane);

  // The panes share one page, so switching must not strand the reader at the
  // old scroll depth: the route opens at its top, and the catalog comes back
  // exactly where it was left.
  useEffect(() => {
    const previous = previousPaneRef.current;
    if (previous === mobilePane) return;
    previousPaneRef.current = mobilePane;
    if (mobilePane === "itinerary") window.scrollTo({ top: 0 });
    else window.scrollTo({ top: catalogScrollRef.current });
  }, [mobilePane]);

  function changePane(nextPane: ComposerPane) {
    if (nextPane === mobilePane) return;
    if (mobilePane === "catalog") catalogScrollRef.current = window.scrollY;
    onPaneChange(nextPane);
  }

  // The map is sized to fill the screen when the page is at its end: opening
  // it brings the page there, so the map is exactly in view and nothing is
  // left to scroll (on a phone, panning never competes with the page). The
  // list comes back at the depth it was left, like the catalog tab does.
  const listScrollRef = useRef(0);
  const previousViewRef = useRef(view);
  useEffect(() => {
    const previous = previousViewRef.current;
    previousViewRef.current = view;
    if (previous === view) return;
    window.scrollTo({
      top:
        view === "map"
          ? document.documentElement.scrollHeight
          : listScrollRef.current,
    });
  }, [view]);

  function changeView(nextView: DiscoveryView) {
    if (nextView === view) return;
    if (view === "list") listScrollRef.current = window.scrollY;
    onViewChange(nextView);
  }

  function focusPaneTab(pane: ComposerPane) {
    changePane(pane);
    document
      .getElementById(
        pane === "catalog" ? "composer-tab-catalog" : "composer-tab-itinerary",
      )
      ?.focus();
  }

  function handleTabKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    currentPane: ComposerPane,
  ) {
    if (event.key === "ArrowRight" && currentPane === "catalog") {
      event.preventDefault();
      focusPaneTab("itinerary");
    } else if (event.key === "ArrowLeft" && currentPane === "itinerary") {
      event.preventDefault();
      focusPaneTab("catalog");
    } else if (event.key === "Home") {
      event.preventDefault();
      focusPaneTab("catalog");
    } else if (event.key === "End") {
      event.preventDefault();
      focusPaneTab("itinerary");
    }
  }

  // Fragments on purpose: the discovery column, the phone's summary bar and
  // the live region are direct children of the composer's stage, beside the
  // route, so the pinned tab bar and floating bar span the whole page.
  return (
    <>
      <div ref={discoverRef} className={styles.discover}>
        <header className={styles.headline}>
          <h2 ref={headingRef} tabIndex={-1}>
            {title.trim() || "Tu recorrido"}
          </h2>
          <p>Sumá lo que quieras: vos armás el recorrido.</p>
        </header>

        <div
          className={styles.tabs}
          role="tablist"
          aria-label="Catálogo y recorrido"
        >
          <button
            id="composer-tab-catalog"
            type="button"
            role="tab"
            aria-controls="composer-panel-catalog"
            aria-selected={mobilePane === "catalog"}
            tabIndex={mobilePane === "catalog" ? 0 : -1}
            disabled={isSaving}
            onClick={() => changePane("catalog")}
            onKeyDown={(event) => handleTabKeyDown(event, "catalog")}
          >
            Catálogo
          </button>
          <button
            id="composer-tab-itinerary"
            type="button"
            role="tab"
            aria-controls="composer-panel-itinerary"
            aria-selected={mobilePane === "itinerary"}
            tabIndex={mobilePane === "itinerary" ? 0 : -1}
            disabled={isSaving}
            onClick={() => changePane("itinerary")}
            onKeyDown={(event) => handleTabKeyDown(event, "itinerary")}
          >
            Recorrido <span key={stops.length}>{stops.length}</span>
          </button>
        </div>

        <CatalogPanel
          catalog={catalog}
          stopNumbers={stopNumbers}
          search={search}
          categoryIds={categoryIds}
          minPrice={minPrice}
          maxPrice={maxPrice}
          priceRangeError={priceRangeError}
          sortBy={sortBy}
          defaultSort={defaultSort}
          location={location}
          assistant={assistant}
          isSearchTermTooShort={isSearchTermTooShort}
          isSearchSettling={isSearchSettling}
          prefillLoading={prefillLoading}
          prefillError={prefillError}
          isSaving={isSaving}
          visibleOnMobile={mobilePane === "catalog"}
          view={view}
          map={map}
          onViewChange={changeView}
          onSearchChange={onSearchChange}
          onToggleCategory={onToggleCategory}
          onMinPriceChange={onMinPriceChange}
          onMaxPriceChange={onMaxPriceChange}
          onSortChange={onSortChange}
          onAdd={onAdd}
          onRemove={onRemove}
          focusedActivityId={focusedActivityId}
          onPoint={onPoint}
        />
      </div>

      {mobilePane === "catalog" && stops.length > 0 ? (
        <div
          className={`${styles.mobileBar} ${view === "map" ? styles.mobileBarOverMap : ""}`}
        >
          <div aria-label="Resumen del recorrido">
            <strong>
              {stops.length} {stops.length === 1 ? "parada" : "paradas"}
            </strong>
            <span
              className={
                health.level === "normal" ? undefined : styles[health.level]
              }
            >
              {formatDuration(totalDuration)} · {formatArs(totalCost)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => changePane("itinerary")}
            disabled={isSaving}
          >
            Ver recorrido
            <Icon name="arrow-right" size={15} aria-hidden="true" />
          </button>
        </div>
      ) : null}

      <p
        className={styles.srOnly}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {announcement}
      </p>
    </>
  );
}
