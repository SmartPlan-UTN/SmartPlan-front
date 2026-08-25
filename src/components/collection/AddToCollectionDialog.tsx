"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { Button, Icon } from "@/components/ui";
import {
  addActivityToCollection,
  ApiError,
  createCollection,
  listCollections,
} from "@/lib/api";
import type { CollectionSummary } from "@/types";

import {
  MAX_COLLECTION_DESCRIPTION_LENGTH,
  MAX_COLLECTION_NAME_LENGTH,
  validateCollection,
} from "./collection-validation";
import styles from "./AddToCollectionDialog.module.css";

type LoadStatus = "loading" | "idle" | "error";
type Completion = { collectionName: string; alreadyIncluded: boolean };

export interface AddToCollectionDialogProps {
  activityId: number;
  activityName: string;
  onClose: () => void;
}

export function AddToCollectionDialog({
  activityId,
  activityName,
  onClose,
}: AddToCollectionDialogProps) {
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [reloadSequence, setReloadSequence] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pendingCreatedCollection, setPendingCreatedCollection] =
    useState<CollectionSummary | null>(null);
  const [completion, setCompletion] = useState<Completion | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const firstControlRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    firstControlRef.current?.focus();

    return () => {
      previousFocusRef.current?.focus();
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;

      const controls = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), a[href]',
        ),
      );
      const first = controls[0];
      const last = controls.at(-1);
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSubmitting, onClose]);

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

  function selectCollection(id: number) {
    setCreating(false);
    setSelectedId(id);
    setSubmitError(null);
    setPendingCreatedCollection(null);
  }

  function beginCreation() {
    setCreating(true);
    setSelectedId(null);
    setSubmitError(null);
    setPendingCreatedCollection(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    if (pendingCreatedCollection) {
      await addToCollection(pendingCreatedCollection, true);
      return;
    }

    if (creating) {
      const errors = validateCollection(name, description);
      setNameError(errors.name ?? null);
      setDescriptionError(errors.description ?? null);
      if (errors.name || errors.description) return;

      setIsSubmitting(true);
      setSubmitError(null);
      try {
        const created = await createCollection({
          nameCollection: name.trim(),
          ...(description.trim() ? { description: description.trim() } : {}),
        });
        setCollections((current) => [created, ...current]);
        setPendingCreatedCollection(created);
        await addToCollection(created, true, false);
      } catch (error) {
        if (
          error instanceof ApiError &&
          error.code === "COLLECTION_NAME_ALREADY_EXISTS"
        ) {
          setNameError("Ya tenés una colección con este nombre");
        } else {
          setSubmitError("No pudimos crear la colección. Intentá nuevamente.");
        }
        setIsSubmitting(false);
      }
      return;
    }

    const selected = collections.find(({ id }) => id === selectedId);
    if (selected) await addToCollection(selected, false);
  }

  async function addToCollection(
    collection: CollectionSummary,
    wasJustCreated: boolean,
    manageSubmitting = true,
  ) {
    if (manageSubmitting) setIsSubmitting(true);
    setSubmitError(null);
    try {
      await addActivityToCollection(collection.id, activityId);
      setPendingCreatedCollection(null);
      setCompletion({
        collectionName: collection.nameCollection,
        alreadyIncluded: false,
      });
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.code === "ACTIVITY_ALREADY_IN_COLLECTION"
      ) {
        setPendingCreatedCollection(null);
        setCompletion({
          collectionName: collection.nameCollection,
          alreadyIncluded: true,
        });
      } else if (
        error instanceof ApiError &&
        error.code === "COLLECTION_NOT_FOUND"
      ) {
        setCollections((current) =>
          current.filter(({ id }) => id !== collection.id),
        );
        setSelectedId(null);
        setPendingCreatedCollection(null);
        setSubmitError("La colección ya no se encuentra disponible.");
      } else if (
        error instanceof ApiError &&
        error.code === "ACTIVITY_NOT_FOUND"
      ) {
        setSubmitError("La actividad ya no se encuentra disponible.");
      } else if (wasJustCreated) {
        setPendingCreatedCollection(collection);
        setSubmitError(
          `Creamos “${collection.nameCollection}”, pero no pudimos agregar la actividad. Reintentá para completar la acción.`,
        );
      } else {
        setSubmitError("No pudimos agregar la actividad. Intentá nuevamente.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) onClose();
      }}
    >
      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-collection-title"
        aria-describedby="add-collection-description"
        ref={dialogRef}
      >
        <div className={styles.dialogHeader}>
          <span className={styles.dialogIcon} aria-hidden="true">
            <Icon name="folder-plus" size={22} />
          </span>
          <div>
            <h2 id="add-collection-title" className="sp-h4">
              {completion ? "Actividad agregada" : "Agregar a una colección"}
            </h2>
            <p id="add-collection-description" className={styles.intro}>
              {completion
                ? activityName
                : "Elegí dónde querés guardar esta actividad."}
            </p>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Cerrar"
            ref={firstControlRef}
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        {completion ? (
          <div className={styles.success} role="status">
            <span className={styles.successIcon} aria-hidden="true">
              <Icon name="circle-check" size={28} />
            </span>
            <p>
              {completion.alreadyIncluded
                ? `Esta actividad ya estaba en “${completion.collectionName}”.`
                : `Guardamos la actividad en “${completion.collectionName}”.`}
            </p>
            <Button variant="primary" onClick={onClose}>
              Volver a la actividad
            </Button>
          </div>
        ) : (
          <form className={styles.form} onSubmit={(event) => void submit(event)}>
            <div className={styles.content} aria-busy={status === "loading"}>
              {status === "loading" ? (
                <div className={styles.state} role="status">
                  <Icon name="loader-circle" className="sp-spin" />
                  Cargando tus colecciones...
                </div>
              ) : null}

              {status === "error" ? (
                <div className={styles.state} role="alert">
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

              {status === "idle" && collections.length > 0 ? (
                <div className={styles.collectionList}>
                  {collections.map((collection) => (
                    <button
                      type="button"
                      className={`${styles.collectionOption} ${
                        selectedId === collection.id ? styles.selected : ""
                      }`}
                      key={collection.id}
                      onClick={() => selectCollection(collection.id)}
                      aria-pressed={selectedId === collection.id}
                      disabled={isSubmitting}
                    >
                      <span className={styles.optionIcon} aria-hidden="true">
                        <Icon name="folder-plus" size={18} />
                      </span>
                      <span className={styles.optionCopy}>
                        <strong>{collection.nameCollection}</strong>
                        <span>
                          {collection.activityCount === 1
                            ? "1 actividad"
                            : `${collection.activityCount} actividades`}
                        </span>
                      </span>
                      {selectedId === collection.id ? (
                        <Icon name="circle-check" size={18} />
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : null}

              {status === "idle" && collections.length === 0 && !creating ? (
                <div className={styles.state}>
                  <Icon name="inbox" size={28} />
                  <p>Aún no creaste ninguna colección.</p>
                </div>
              ) : null}

              {status === "idle" && !creating ? (
                <button
                  type="button"
                  className={styles.createToggle}
                  onClick={beginCreation}
                  disabled={isSubmitting}
                >
                  <Icon name="plus" size={16} />
                  Crear nueva colección
                </button>
              ) : null}

              {creating ? (
                <div className={styles.creationFields}>
                  <div className={styles.creationHeading}>
                    <strong>Nueva colección</strong>
                    <button
                      type="button"
                      onClick={() => setCreating(false)}
                      disabled={isSubmitting}
                    >
                      Elegir existente
                    </button>
                  </div>
                  <label className={styles.field}>
                    <span>Nombre</span>
                    <input
                      value={name}
                      onChange={(event) => {
                        setName(event.target.value);
                        setNameError(null);
                      }}
                      maxLength={MAX_COLLECTION_NAME_LENGTH}
                      disabled={isSubmitting || pendingCreatedCollection != null}
                      aria-invalid={Boolean(nameError)}
                    />
                    {nameError ? <small role="alert">{nameError}</small> : null}
                  </label>
                  <label className={styles.field}>
                    <span>Descripción <em>opcional</em></span>
                    <textarea
                      value={description}
                      onChange={(event) => {
                        setDescription(event.target.value);
                        setDescriptionError(null);
                      }}
                      maxLength={MAX_COLLECTION_DESCRIPTION_LENGTH}
                      disabled={isSubmitting || pendingCreatedCollection != null}
                      aria-invalid={Boolean(descriptionError)}
                    />
                    {descriptionError ? (
                      <small role="alert">{descriptionError}</small>
                    ) : null}
                  </label>
                </div>
              ) : null}
            </div>

            {submitError ? (
              <p className={styles.submitError} role="alert">
                <Icon name="triangle-alert" size={17} />
                {submitError}
              </p>
            ) : null}

            <div className={styles.actions}>
              <Button
                variant="ghostLight"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={
                  isSubmitting ||
                  status !== "idle" ||
                  (!creating && selectedId == null && !pendingCreatedCollection)
                }
              >
                {isSubmitting
                  ? "Guardando..."
                  : pendingCreatedCollection
                    ? "Reintentar agregado"
                    : creating
                      ? "Crear y agregar"
                      : "Agregar"}
              </Button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
