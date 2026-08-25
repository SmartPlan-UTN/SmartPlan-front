"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Badge, Icon } from "@/components/ui";
import { useDetailFetch } from "@/hooks";
import { ApiError, getCollection, removeActivityFromCollection } from "@/lib/api";
import {
  activityDetailRoute,
  collectionEditRoute,
  ROUTES,
} from "@/lib/routes";
import { formatArs, formatDuration, gradientFor } from "@/lib/utils";
import type { CollectionActivityDetail, CollectionDetail } from "@/types";

import { ConfirmationDialog } from "./ConfirmationDialog";
import styles from "./CollectionDetailView.module.css";

const LOAD_ERROR = "No pudimos cargar la colección. Intentá nuevamente.";

export interface CollectionDetailViewProps {
  collectionId: number;
}

export function CollectionDetailView({ collectionId }: CollectionDetailViewProps) {
  const result = useDetailFetch<CollectionDetail>(
    getCollection,
    collectionId,
    LOAD_ERROR,
  );
  const [collection, setCollection] = useState<CollectionDetail | null>(null);
  const [pendingRemoval, setPendingRemoval] =
    useState<CollectionActivityDetail | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    setCollection(result.data);
  }, [result.data]);

  useEffect(() => {
    if (notice) noticeRef.current?.focus();
  }, [notice]);

  async function removePendingActivity() {
    if (!pendingRemoval || !collection) return;

    setIsRemoving(true);
    setRemoveError(null);
    try {
      await removeActivityFromCollection(collection.id, pendingRemoval.idActivity);
      finishRemoval(pendingRemoval.idActivity, "Actividad quitada de la colección");
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.code === "COLLECTION_ACTIVITY_NOT_FOUND"
      ) {
        finishRemoval(
          pendingRemoval.idActivity,
          "La actividad ya no estaba en esta colección",
        );
      } else if (
        error instanceof ApiError &&
        error.code === "COLLECTION_NOT_FOUND"
      ) {
        setCollection(null);
        setPendingRemoval(null);
      } else {
        setRemoveError(
          "No pudimos quitar la actividad. Intentá nuevamente.",
        );
      }
    } finally {
      setIsRemoving(false);
    }
  }

  function finishRemoval(activityId: number, message: string) {
    setCollection((current) => {
      if (!current) return current;
      const activities = current.activities.filter(
        ({ idActivity }) => idActivity !== activityId,
      );
      return { ...current, activities, activityCount: activities.length };
    });
    setPendingRemoval(null);
    setNotice(message);
  }

  if (result.status === "loading") {
    return <CollectionPageState icon="loader-circle" message="Cargando la colección..." spin />;
  }

  if (result.status === "not-found" || (result.status === "idle" && !collection)) {
    return (
      <CollectionPageState
        icon="inbox"
        title="No encontramos esta colección"
        message="Puede que haya sido eliminada o que ya no esté disponible."
      />
    );
  }

  if (result.status === "error" || !collection) {
    return (
      <CollectionPageState
        icon="triangle-alert"
        title="Algo salió mal"
        message={result.errorMessage ?? LOAD_ERROR}
        error
      />
    );
  }

  return (
    <section className={styles.screen} aria-labelledby="collection-title">
      <Link href={ROUTES.favorites} className={styles.backLink}>
        <Icon name="arrow-left" size={15} />
        Volver a colecciones
      </Link>

      <header className={styles.header}>
        <span className={styles.headerIcon} aria-hidden="true">
          <Icon name="folder-plus" size={28} />
        </span>
        <div className={styles.headingCopy}>
          <p className={`sp-label ${styles.eyebrow}`}>Tu colección</p>
          <h1 id="collection-title" className="sp-h2">
            {collection.nameCollection}
          </h1>
          {collection.description ? (
            <p className={styles.description}>{collection.description}</p>
          ) : null}
          <p className={styles.count}>
            {collection.activityCount === 1
              ? "1 actividad"
              : `${collection.activityCount} actividades`}
          </p>
        </div>
        <Link
          href={collectionEditRoute(collection.id)}
          className={styles.editLink}
        >
          <Icon name="pencil" size={15} />
          Editar colección
        </Link>
      </header>

      {notice ? (
        <p
          className={styles.notice}
          role="status"
          tabIndex={-1}
          ref={noticeRef}
        >
          <Icon name="circle-check" size={18} />
          {notice}
        </p>
      ) : null}

      {collection.activities.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon} aria-hidden="true">
            <Icon name="route" size={30} />
          </span>
          <h2 className="sp-h4">Esta colección todavía está vacía</h2>
          <p>Explorá actividades y agregá las que quieras guardar juntas.</p>
          <Link href={ROUTES.explore} className={styles.exploreLink}>
            <Icon name="search" size={15} />
            Explorar actividades
          </Link>
        </div>
      ) : (
        <div className={styles.grid}>
          {collection.activities.map((membership) => (
            <CollectionActivityCard
              key={membership.id}
              membership={membership}
              onRemove={() => {
                setNotice(null);
                setRemoveError(null);
                setPendingRemoval(membership);
              }}
            />
          ))}
        </div>
      )}

      {pendingRemoval ? (
        <ConfirmationDialog
          title={`¿Quitar “${pendingRemoval.activity.name}”?`}
          confirmLabel="Quitar actividad"
          confirmingLabel="Quitando..."
          isConfirming={isRemoving}
          error={removeError}
          onCancel={() => setPendingRemoval(null)}
          onConfirm={() => void removePendingActivity()}
        >
          <p>Se quitará únicamente de esta colección.</p>
          <p>La actividad seguirá disponible en el catálogo y en otras colecciones.</p>
        </ConfirmationDialog>
      ) : null}
    </section>
  );
}

function CollectionActivityCard({
  membership,
  onRemove,
}: {
  membership: CollectionActivityDetail;
  onRemove: () => void;
}) {
  const { activity } = membership;

  return (
    <article className={styles.activityCard}>
      <Link
        href={activityDetailRoute(activity.id)}
        className={styles.activityLink}
        aria-label={`Ver ${activity.name}`}
      >
        <span
          className={styles.activityVisual}
          style={{ background: gradientFor(activity.id) }}
          aria-hidden="true"
        >
          <Icon name="route" size={34} />
        </span>
        <span className={styles.activityBody}>
          {activity.type ? <Badge variant="tag">{activity.type}</Badge> : null}
          <span className={styles.activityName}>{activity.name}</span>
          <span className={styles.activityDescription}>{activity.description}</span>
          <span className={styles.metaRow}>
            <span className={styles.metaItem}>
              <Icon name="clock" size={13} />
              {formatDuration(activity.estimatedDuration)}
            </span>
            <Badge variant="cost">{formatArs(activity.estimatedCost)}</Badge>
          </span>
        </span>
      </Link>
      <button
        type="button"
        className={styles.removeButton}
        onClick={onRemove}
        aria-label={`Quitar ${activity.name} de la colección`}
      >
        <Icon name="trash-2" size={16} />
      </button>
    </article>
  );
}

function CollectionPageState({
  icon,
  title,
  message,
  spin = false,
  error = false,
}: {
  icon: "inbox" | "loader-circle" | "triangle-alert";
  title?: string;
  message: string;
  spin?: boolean;
  error?: boolean;
}) {
  return (
    <div
      className={styles.pageState}
      role={error ? "alert" : spin ? "status" : undefined}
    >
      <Icon name={icon} size={32} className={spin ? "sp-spin" : undefined} />
      {title ? <h1 className="sp-h3">{title}</h1> : null}
      <p>{message}</p>
      {!spin ? (
        <Link href={ROUTES.favorites} className={styles.exploreLink}>
          Volver a colecciones
        </Link>
      ) : null}
    </div>
  );
}
