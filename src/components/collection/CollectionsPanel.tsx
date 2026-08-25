"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button, Icon } from "@/components/ui";
import { ApiError, deleteCollection, listCollections } from "@/lib/api";
import {
  collectionDetailRoute,
  collectionEditRoute,
  ROUTES,
} from "@/lib/routes";
import type { CollectionSummary, PaginationMetadata } from "@/types";

import { ConfirmationDialog } from "./ConfirmationDialog";
import styles from "./CollectionsPanel.module.css";

type LoadStatus = "loading" | "idle" | "error";
const COLLECTIONS_PER_PAGE = 11;

export function CollectionsPanel() {
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [reloadSequence, setReloadSequence] = useState(0);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMetadata>({
    page: 1,
    limit: COLLECTIONS_PER_PAGE,
    total: 0,
    totalPages: 1,
  });
  const [pendingDeletion, setPendingDeletion] =
    useState<CollectionSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setStatus("loading");
      try {
        const result = await listCollections({
          page,
          limit: COLLECTIONS_PER_PAGE,
          sortBy: "savedAt",
          direction: "desc",
        });
        if (ignore) return;
        setCollections(result.data);
        setPagination(result.pagination);
        setStatus("idle");
      } catch (_error) {
        if (!ignore) setStatus("error");
      }
    }

    void load();
    return () => {
      ignore = true;
    };
  }, [page, reloadSequence]);

  function requestDeletion(collection: CollectionSummary) {
    setNotice(null);
    setDeleteError(null);
    setPendingDeletion(collection);
  }

  async function removePendingCollection() {
    if (!pendingDeletion) return;

    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteCollection(pendingDeletion.id);
      discardPendingCollection("Colección eliminada correctamente");
      setPendingDeletion(null);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        discardPendingCollection("La colección ya no se encuentra disponible");
        setPendingDeletion(null);
      } else {
        setDeleteError("No pudimos eliminar la colección. Intentá nuevamente");
      }
    } finally {
      setIsDeleting(false);
    }
  }

  function discardPendingCollection(message: string) {
    if (!pendingDeletion) return;

    if (collections.length === 1 && page > 1) {
      setPage((current) => current - 1);
    } else if (pagination.total > collections.length) {
      // Refill this page with the first card shifted from the following page.
      setReloadSequence((current) => current + 1);
    } else {
      setCollections((current) =>
        current.filter(({ id }) => id !== pendingDeletion.id),
      );
      setPagination((current) => {
        const total = Math.max(0, current.total - 1);
        return {
          ...current,
          total,
          totalPages: Math.max(1, Math.ceil(total / current.limit)),
        };
      });
    }
    setNotice(message);
  }

  return (
    <>
      {notice ? (
        <p className={styles.notice} role="status">
          <Icon name="circle-check" size={18} />
          {notice}
        </p>
      ) : null}

      <div className={styles.grid} aria-busy={status === "loading"}>
        {status !== "idle" || collections.length > 0 ? (
          <Link className={styles.createCard} href={ROUTES.createCollection}>
            <span className={styles.createIcon} aria-hidden="true">
              <Icon name="folder-plus" size={22} />
            </span>
            <span>Crear nueva colección</span>
          </Link>
        ) : null}

        {status === "loading" ? (
          <p className={styles.stateCard} role="status">
            <Icon name="loader-circle" className="sp-spin" />
            Cargando tus colecciones...
          </p>
        ) : null}

        {status === "error" ? (
          <div className={styles.stateCard} role="alert">
            <Icon name="triangle-alert" />
            <p>No pudimos cargar tus colecciones.</p>
            <Button
              variant="ghostLight"
              size="sm"
              onClick={() => setReloadSequence((current) => current + 1)}
            >
              Reintentar
            </Button>
          </div>
        ) : null}

        {status === "idle"
          ? collections.map((collection) => (
              <article className={styles.collectionCard} key={collection.id}>
                <Link
                  className={styles.cardLink}
                  href={collectionDetailRoute(collection.id)}
                  aria-label={`Ver colección ${collection.nameCollection}`}
                >
                  <div className={styles.cardVisual} aria-hidden="true">
                    <Icon name="folder-plus" size={30} />
                  </div>
                  <div className={styles.cardBody}>
                    <h2 className={styles.cardTitle}>{collection.nameCollection}</h2>
                    {collection.description ? (
                      <p className={styles.description}>{collection.description}</p>
                    ) : null}
                    <p className={styles.activityCount}>
                      <Icon name="route" size={14} />
                      {collection.activityCount === 1
                        ? "1 actividad"
                        : `${collection.activityCount} actividades`}
                    </p>
                  </div>
                </Link>
                <div className={styles.cardActions}>
                  <Link
                    className={styles.iconAction}
                    href={collectionEditRoute(collection.id)}
                    aria-label={`Editar ${collection.nameCollection}`}
                  >
                    <Icon name="pencil" size={16} />
                  </Link>
                  <button
                    type="button"
                    className={`${styles.iconAction} ${styles.deleteAction}`}
                    onClick={() => requestDeletion(collection)}
                    aria-label={`Eliminar ${collection.nameCollection}`}
                  >
                    <Icon name="trash-2" size={16} />
                  </button>
                </div>
              </article>
            ))
          : null}
      </div>

      {status === "idle" && collections.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon} aria-hidden="true">
            <Icon name="folder-plus" size={30} />
          </span>
          <h2 className="sp-h4">Aún no creaste ninguna colección</h2>
          <p>Creá una para reunir actividades que quieras hacer más adelante.</p>
          <Link className={styles.emptyAction} href={ROUTES.createCollection}>
            <Icon name="plus" size={15} />
            Crear colección
          </Link>
        </div>
      ) : null}

      {status === "idle" && pagination.totalPages > 1 ? (
        <nav className={styles.pagination} aria-label="Paginación de colecciones">
          <button
            type="button"
            onClick={() => setPage((current) => current - 1)}
            disabled={page <= 1}
            aria-label="Página anterior"
          >
            <Icon name="chevron-left" size={16} />
          </button>
          <span aria-live="polite">
            Página <strong>{page}</strong> de {pagination.totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((current) => current + 1)}
            disabled={page >= pagination.totalPages}
            aria-label="Página siguiente"
          >
            <Icon name="chevron-right" size={16} />
          </button>
        </nav>
      ) : null}

      {pendingDeletion ? (
        <ConfirmationDialog
          title={`¿Eliminar “${pendingDeletion.nameCollection}”?`}
          confirmLabel="Eliminar colección"
          confirmingLabel="Eliminando..."
          isConfirming={isDeleting}
          error={deleteError}
          onCancel={() => setPendingDeletion(null)}
          onConfirm={() => void removePendingCollection()}
        >
          <p>Se eliminará la agrupación de tu listado personal.</p>
          <p>
            Las actividades no se borrarán del catálogo, de otras colecciones
            ni de tus favoritos si también las guardaste allí.
          </p>
        </ConfirmationDialog>
      ) : null}
    </>
  );
}
