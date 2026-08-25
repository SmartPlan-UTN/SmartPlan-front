"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button, Icon } from "@/components/ui";
import { ApiError, deleteCollection, listCollections } from "@/lib/api";
import { collectionEditRoute, ROUTES } from "@/lib/routes";
import type { CollectionSummary } from "@/types";

import { ConfirmationDialog } from "./ConfirmationDialog";
import styles from "./CollectionsPanel.module.css";

type LoadStatus = "loading" | "idle" | "error";

export function CollectionsPanel() {
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [reloadSequence, setReloadSequence] = useState(0);
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
          page: 1,
          limit: 100,
          sortBy: "savedAt",
          direction: "desc",
        });
        if (ignore) return;
        setCollections(result.data);
        setStatus("idle");
      } catch (_error) {
        if (!ignore) setStatus("error");
      }
    }

    void load();
    return () => {
      ignore = true;
    };
  }, [reloadSequence]);

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
      setCollections((current) =>
        current.filter(({ id }) => id !== pendingDeletion.id),
      );
      setPendingDeletion(null);
      setNotice("Colección eliminada correctamente");
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setCollections((current) =>
          current.filter(({ id }) => id !== pendingDeletion.id),
        );
        setPendingDeletion(null);
        setNotice("La colección ya no se encuentra disponible");
      } else {
        setDeleteError("No pudimos eliminar la colección. Intentá nuevamente");
      }
    } finally {
      setIsDeleting(false);
    }
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
        <Link className={styles.createCard} href={ROUTES.createCollection}>
          <span className={styles.createIcon} aria-hidden="true">
            <Icon name="folder-plus" size={22} />
          </span>
          <span>Crear nueva colección</span>
        </Link>

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
                <div className={styles.cardVisual} aria-hidden="true">
                  <Icon name="folder-plus" size={30} />
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.cardHeader}>
                    <h2 className={styles.cardTitle}>{collection.nameCollection}</h2>
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
                  </div>
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
              </article>
            ))
          : null}
      </div>

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
