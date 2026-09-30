"use client";

import { useMemo, useState, type DragEvent, type KeyboardEvent } from "react";

import { CategoryChips } from "@/components/explore";
import { Button, Icon, Select, type SelectOption } from "@/components/ui";
import type { UseExplorationSearchResult } from "@/hooks";
import { formatArs, formatDuration } from "@/lib/utils";
import type { ActivitySearchParams, ActivitySearchResult } from "@/types";

import type { ComposerStop } from "./draft";
import styles from "./ActivitiesStep.module.css";

export type ComposerPane = "catalog" | "itinerary";
type ActivitySortBy = NonNullable<ActivitySearchParams["sortBy"]>;

interface ActivitiesStepProps {
  catalog: UseExplorationSearchResult<ActivitySearchResult>;
  stops: ComposerStop[];
  totalCost: number;
  totalDuration: number;
  costPerPerson: number;
  search: string;
  minPrice: string;
  maxPrice: string;
  categoryIds: number[];
  sortBy: ActivitySortBy;
  expanded: boolean;
  mobilePane: ComposerPane;
  isSearchTermTooShort: boolean;
  isSearchSettling: boolean;
  prefillLoading: boolean;
  prefillError: string | null;
  itineraryError: string | null;
  isSaving: boolean;
  announcement: string;
  onSearchChange: (value: string) => void;
  onMinPriceChange: (value: string) => void;
  onMaxPriceChange: (value: string) => void;
  onToggleCategory: (categoryId: number) => void;
  onSortChange: (value: ActivitySortBy) => void;
  onExpand: () => void;
  onPaneChange: (pane: ComposerPane) => void;
  onAdd: (activity: ActivitySearchResult) => void;
  onRemove: (activityId: number) => void;
  onMove: (activityId: number, direction: -1 | 1) => void;
  onReorder: (sourceActivityId: number, targetActivityId: number) => void;
}

const SORT_OPTIONS = [
  { value: "relevance", label: "Relevancia" },
  { value: "price", label: "Precio" },
  { value: "rating", label: "Valoración" },
] satisfies SelectOption<ActivitySortBy>[];

export function ActivitiesStep({
  catalog,
  stops,
  totalCost,
  totalDuration,
  costPerPerson,
  search,
  minPrice,
  maxPrice,
  categoryIds,
  sortBy,
  expanded,
  mobilePane,
  isSearchTermTooShort,
  isSearchSettling,
  prefillLoading,
  prefillError,
  itineraryError,
  isSaving,
  announcement,
  onSearchChange,
  onMinPriceChange,
  onMaxPriceChange,
  onToggleCategory,
  onSortChange,
  onExpand,
  onPaneChange,
  onAdd,
  onRemove,
  onMove,
  onReorder,
}: ActivitiesStepProps) {
  const [draggedActivityId, setDraggedActivityId] = useState<number | null>(
    null,
  );
  const [dropTargetId, setDropTargetId] = useState<number | null>(null);
  const activeActivityIds = useMemo(
    () => new Set(stops.map((stop) => stop.activity.id)),
    [stops],
  );
  const visibleActivities = expanded
    ? catalog.items
    : catalog.items.slice(0, 5);
  const resultTotal = catalog.pagination?.total ?? catalog.items.length;
  const isLoading = catalog.status === "loading" || isSearchSettling;

  function changePane(nextPane: ComposerPane) {
    onPaneChange(nextPane);
    document
      .getElementById(
        nextPane === "catalog"
          ? "composer-tab-catalog"
          : "composer-tab-itinerary",
      )
      ?.focus();
  }

  function handleTabKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    currentPane: ComposerPane,
  ) {
    if (event.key === "ArrowRight" && currentPane === "catalog") {
      event.preventDefault();
      changePane("itinerary");
    } else if (event.key === "ArrowLeft" && currentPane === "itinerary") {
      event.preventDefault();
      changePane("catalog");
    } else if (event.key === "Home") {
      event.preventDefault();
      changePane("catalog");
    } else if (event.key === "End") {
      event.preventDefault();
      changePane("itinerary");
    }
  }

  function startDragging(event: DragEvent<HTMLLIElement>, activityId: number) {
    setDraggedActivityId(activityId);
    setDropTargetId(null);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(activityId));
  }

  function dropOn(targetActivityId: number) {
    if (draggedActivityId !== null && draggedActivityId !== targetActivityId) {
      onReorder(draggedActivityId, targetActivityId);
    }
    setDraggedActivityId(null);
    setDropTargetId(null);
  }

  return (
    <div className={styles.routeStep}>
      <div
        className={styles.mobileTabs}
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
          onClick={() => onPaneChange("catalog")}
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
          onClick={() => onPaneChange("itinerary")}
          onKeyDown={(event) => handleTabKeyDown(event, "itinerary")}
        >
          Recorrido <span>{stops.length}</span>
        </button>
      </div>

      <div
        id="composer-panel-catalog"
        role="tabpanel"
        tabIndex={0}
        aria-labelledby="composer-tab-catalog"
        className={`${styles.catalogPanel} ${mobilePane === "catalog" ? styles.mobileVisible : ""}`}
      >
        <div className={styles.panelHeading}>
          <div>
            <span className={styles.eyebrow}>02 / DESCUBRÍ</span>
            <h3>Encontrá tu próxima parada</h3>
          </div>
          <span className={styles.countPill}>
            {isSearchTermTooShort || isSearchSettling
              ? "Buscando"
              : `${resultTotal} actividades`}
          </span>
        </div>

        <label className={styles.searchBox}>
          <Icon name="search" size={18} aria-hidden="true" />
          <span className={styles.srOnly}>Buscar actividades</span>
          <input
            type="search"
            placeholder="Bodega, trekking, cocina..."
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            disabled={isSaving}
          />
          {isLoading ? (
            <>
              <Icon
                name="loader-circle"
                size={17}
                className={styles.spin}
                aria-hidden="true"
              />
              <span className={styles.srOnly} role="status">
                Buscando actividades
              </span>
            </>
          ) : null}
        </label>

        <div className={styles.categoryRail} inert={isSaving}>
          <CategoryChips
            selectedIds={categoryIds}
            onToggle={onToggleCategory}
          />
        </div>

        <div className={styles.filtersRow}>
          <label>
            Desde <span className={styles.srOnly}>Precio mínimo</span>
            <input
              inputMode="numeric"
              placeholder="$ mín."
              value={minPrice}
              onChange={(event) => onMinPriceChange(event.target.value)}
              disabled={isSaving}
            />
          </label>
          <label>
            Hasta <span className={styles.srOnly}>Precio máximo</span>
            <input
              inputMode="numeric"
              placeholder="$ máx."
              value={maxPrice}
              onChange={(event) => onMaxPriceChange(event.target.value)}
              disabled={isSaving}
            />
          </label>
          <label className={styles.sortField}>
            <span>Ordenar</span>
            <Select
              value={sortBy}
              options={SORT_OPTIONS}
              aria-label="Ordenar actividades"
              onChange={onSortChange}
              disabled={isSaving}
            />
          </label>
        </div>

        {catalog.errorMessage ? (
          <div className={styles.catalogMessage} role="alert">
            <p>{catalog.errorMessage}</p>
            <Button variant="ghostLight" size="sm" onClick={catalog.retry}>
              Reintentar
            </Button>
          </div>
        ) : null}
        {prefillError ? (
          <p className={styles.inlineError} role="alert">
            {prefillError}
          </p>
        ) : null}
        {prefillLoading ? (
          <p className={styles.loadingLine} role="status">
            Cargando la actividad elegida…
          </p>
        ) : null}

        {isSearchTermTooShort ? (
          <div className={styles.catalogEmpty} role="status">
            <Icon name="search" size={24} aria-hidden="true" />
            <strong>La búsqueda empieza con dos letras</strong>
            <span>Escribí un poco más para encontrar actividades.</span>
          </div>
        ) : null}
        {!isSearchTermTooShort &&
        !isLoading &&
        !catalog.hasResults &&
        catalog.status === "idle" ? (
          <div className={styles.catalogEmpty}>
            <Icon name="search" size={24} aria-hidden="true" />
            <strong>No encontramos actividades con esos criterios</strong>
            <span>Probá con otra búsqueda o quitá algún filtro.</span>
          </div>
        ) : null}

        {!isSearchTermTooShort ? (
          <div className={styles.resultList} aria-busy={isLoading}>
            {visibleActivities.map((activity) => {
              const alreadyAdded = activeActivityIds.has(activity.id);
              return (
                <article className={styles.resultCard} key={activity.id}>
                  <div className={styles.resultMark} aria-hidden="true">
                    <Icon name="map-pin" size={17} />
                  </div>
                  <div className={styles.resultCopy}>
                    <div className={styles.resultTags}>
                      {activity.categories.slice(0, 2).map((category) => (
                        <span key={category.id}>{category.name}</span>
                      ))}
                    </div>
                    <h4>{activity.name}</h4>
                    <p>
                      {formatArs(activity.estimatedCost)} <b>·</b>{" "}
                      {formatDuration(activity.estimatedDuration)}
                    </p>
                  </div>
                  <Button
                    variant={alreadyAdded ? "secondary" : "ghostEmber"}
                    size="sm"
                    aria-pressed={alreadyAdded}
                    onClick={() => onAdd(activity)}
                    disabled={isSaving}
                    aria-label={
                      alreadyAdded
                        ? `${activity.name} ya está en el recorrido`
                        : `Agregar ${activity.name}`
                    }
                  >
                    {alreadyAdded ? (
                      <>
                        <Icon name="check" size={14} aria-hidden="true" /> En el
                        recorrido
                      </>
                    ) : (
                      <>
                        <Icon name="plus" size={15} aria-hidden="true" /> Sumar
                      </>
                    )}
                  </Button>
                </article>
              );
            })}
          </div>
        ) : null}

        {!isSearchTermTooShort && !isLoading && !expanded && resultTotal > 5 ? (
          <Button
            variant="secondary"
            className={styles.moreButton}
            onClick={onExpand}
            disabled={isSaving}
          >
            Ver más resultados{" "}
            <Icon name="arrow-right" size={15} aria-hidden="true" />
          </Button>
        ) : null}
        {!isSearchTermTooShort &&
        !isLoading &&
        expanded &&
        catalog.pagination &&
        catalog.pagination.totalPages > 1 ? (
          <nav
            className={styles.pagination}
            aria-label="Páginas de actividades"
          >
            <Button
              variant="ghostLight"
              size="sm"
              disabled={catalog.page <= 1 || isLoading || isSaving}
              onClick={() => catalog.goToPage(catalog.page - 1)}
            >
              Anterior
            </Button>
            <span>
              Página <strong>{catalog.page}</strong> de{" "}
              {catalog.pagination.totalPages}
            </span>
            <Button
              variant="ghostLight"
              size="sm"
              disabled={
                catalog.page >= catalog.pagination.totalPages ||
                isLoading ||
                isSaving
              }
              onClick={() => catalog.goToPage(catalog.page + 1)}
            >
              Siguiente
            </Button>
          </nav>
        ) : null}
      </div>

      <aside
        id="composer-panel-itinerary"
        role="tabpanel"
        tabIndex={0}
        aria-labelledby="composer-tab-itinerary"
        className={`${styles.itineraryPanel} ${mobilePane === "itinerary" ? styles.mobileVisible : ""}`}
      >
        <div className={styles.panelHeading}>
          <div>
            <span className={styles.eyebrow}>TU PLAN, EN TIEMPO REAL</span>
            <h3>El recorrido</h3>
          </div>
          <span className={styles.countPill}>
            {stops.length} {stops.length === 1 ? "parada" : "paradas"}
          </span>
        </div>

        {itineraryError ? (
          <p className={styles.inlineError} role="alert">
            {itineraryError}
          </p>
        ) : null}
        {stops.length === 0 ? (
          <div className={styles.itineraryEmpty}>
            <span className={styles.emptyIcon}>
              <Icon name="route" size={21} aria-hidden="true" />
            </span>
            <strong>El mapa todavía está en blanco</strong>
            <p>
              Sumá actividades del catálogo y acá vas a ver cómo toma forma el
              día.
            </p>
            <button type="button" onClick={() => changePane("catalog")}>
              Explorar actividades{" "}
              <Icon name="arrow-right" size={14} aria-hidden="true" />
            </button>
          </div>
        ) : (
          <ol className={styles.stopList} aria-label="Paradas en orden">
            {stops.map((stop, index) => {
              const activityId = stop.activity.id;
              return (
                <li
                  key={stop.detailId ?? `new-${activityId}`}
                  className={`${styles.stopItem} ${draggedActivityId === activityId ? styles.stopDragging : ""} ${dropTargetId === activityId && draggedActivityId !== activityId ? styles.stopDropTarget : ""}`}
                  draggable={!isSaving}
                  onDragStart={(event) => startDragging(event, activityId)}
                  onDragEnter={() => setDropTargetId(activityId)}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={() => dropOn(activityId)}
                  onDragEnd={() => {
                    setDraggedActivityId(null);
                    setDropTargetId(null);
                  }}
                >
                  <span className={styles.stopNumber} aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className={styles.stopText}>
                    <strong>{stop.activity.name}</strong>
                    <span>
                      {stop.activity.type ??
                        stop.activity.categories[0]?.name ??
                        "Experiencia"}{" "}
                      · {formatDuration(stop.estimatedDuration)}
                    </span>
                    <b>{formatArs(stop.estimatedCost)}</b>
                  </div>
                  <div className={styles.stopActions}>
                    <button
                      type="button"
                      aria-label={`Mover ${stop.activity.name} arriba`}
                      onClick={() => onMove(activityId, -1)}
                      disabled={isSaving || index === 0}
                    >
                      <Icon name="arrow-up" size={16} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Mover ${stop.activity.name} abajo`}
                      onClick={() => onMove(activityId, 1)}
                      disabled={isSaving || index === stops.length - 1}
                    >
                      <Icon name="arrow-down" size={16} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className={styles.removeStop}
                      aria-label={`Quitar ${stop.activity.name}`}
                      onClick={() => onRemove(activityId)}
                      disabled={isSaving}
                    >
                      <Icon name="x" size={16} aria-hidden="true" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        <div className={styles.totalCard} aria-label="Estimación del recorrido">
          <div className={styles.totalTop}>
            <span>Estimación del recorrido</span>
            <span>
              {stops.length} {stops.length === 1 ? "actividad" : "actividades"}
            </span>
          </div>
          <div className={styles.totalLine}>
            <span>Duración</span>
            <strong>{formatDuration(totalDuration)}</strong>
          </div>
          <div className={styles.totalLine}>
            <span>Por persona</span>
            <strong>{formatArs(costPerPerson)}</strong>
          </div>
          <div className={styles.grandTotal}>
            <span>Costo estimado</span>
            <strong>{formatArs(totalCost)}</strong>
          </div>
        </div>
      </aside>

      <p
        className={styles.srOnly}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {announcement}
      </p>
    </div>
  );
}
