"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button, Icon } from "@/components/ui";
import { useDetailFetch } from "@/hooks";
import { ApiError, getCollection, updateCollection } from "@/lib/api";
import { ROUTES } from "@/lib/routes";
import type { CollectionDetail } from "@/types";

import { ConfirmationDialog } from "./ConfirmationDialog";
import {
  MAX_COLLECTION_DESCRIPTION_LENGTH,
  MAX_COLLECTION_NAME_LENGTH,
  type CollectionFormErrors,
  validateCollection,
} from "./collection-validation";
import styles from "./collection.module.css";

const LOAD_ERROR = "No pudimos cargar la colección. Intentá nuevamente";

export interface EditCollectionFormProps {
  collectionId: number;
}

export function EditCollectionForm({ collectionId }: EditCollectionFormProps) {
  const result = useDetailFetch(getCollection, collectionId, LOAD_ERROR);

  if (result.status === "loading") {
    return (
      <p className={styles.pageState} role="status">
        <Icon name="loader-circle" className="sp-spin" />
        Cargando la colección...
      </p>
    );
  }

  if (result.status === "not-found") {
    return <UnavailableCollection />;
  }

  if (result.status === "error" || !result.data) {
    return (
      <section className={styles.pageState} role="alert">
        <Icon name="triangle-alert" size={24} />
        <h1 className="sp-h3">No pudimos cargar la colección</h1>
        <p>{result.errorMessage ?? LOAD_ERROR}</p>
        <BackToCollectionsButton />
      </section>
    );
  }

  return <LoadedEditCollectionForm collection={result.data} />;
}

function UnavailableCollection() {
  return (
    <section className={styles.pageState} role="alert">
      <Icon name="folder-plus" size={28} />
      <h1 className="sp-h3">La colección no se encuentra disponible</h1>
      <p>Puede haber sido eliminada o no pertenecer a tu cuenta.</p>
      <BackToCollectionsButton />
    </section>
  );
}

function BackToCollectionsButton() {
  const router = useRouter();
  return (
    <Button onClick={() => router.push(ROUTES.favorites)}>
      Volver a colecciones
    </Button>
  );
}

function LoadedEditCollectionForm({ collection }: { collection: CollectionDetail }) {
  const router = useRouter();
  const [name, setName] = useState(collection.nameCollection);
  const [description, setDescription] = useState(collection.description ?? "");
  const [savedName, setSavedName] = useState(collection.nameCollection);
  const [savedDescription, setSavedDescription] = useState(
    collection.description ?? "",
  );
  const [errors, setErrors] = useState<CollectionFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDiscardPrompt, setShowDiscardPrompt] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const isDirty = name !== savedName || description !== savedDescription;

  useEffect(() => {
    if (errors.name) nameRef.current?.focus();
  }, [errors.name]);

  async function save() {
    const nextErrors = validateCollection(name, description);
    setErrors(nextErrors);
    setFormError(null);
    setFeedback(null);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const updated = await updateCollection(collection.id, {
        nameCollection: name.trim(),
        description: description.trim() || null,
      });
      const nextDescription = updated.description ?? "";
      setName(updated.nameCollection);
      setDescription(nextDescription);
      setSavedName(updated.nameCollection);
      setSavedDescription(nextDescription);
      setFeedback("Colección actualizada correctamente");
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.code === "COLLECTION_NAME_ALREADY_EXISTS"
      ) {
        setErrors({ name: "Ya tenés una colección con ese nombre" });
      } else if (error instanceof ApiError && error.status === 404) {
        setUnavailable(true);
      } else {
        setFormError("No pudimos actualizar la colección. Intentá nuevamente");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void save();
  }

  function handleCancel() {
    if (isDirty) {
      setShowDiscardPrompt(true);
      return;
    }
    router.push(ROUTES.favorites);
  }

  if (unavailable) return <UnavailableCollection />;

  return (
    <section className={styles.screen} aria-labelledby="edit-collection-title">
      <header className={styles.header}>
        <div className={styles.iconTile} aria-hidden="true">
          <Icon name="pencil" size={26} />
        </div>
        <div>
          <p className={`sp-label ${styles.eyebrow}`}>CU33 · Colecciones</p>
          <h1 id="edit-collection-title" className="sp-h2">
            Editá tu colección
          </h1>
          <p className={`sp-body-lg ${styles.intro}`}>
            Actualizá el nombre o la descripción de esta agrupación de actividades.
          </p>
        </div>
      </header>

      <form className={styles.card} onSubmit={handleSubmit} noValidate>
        <div className={styles.field}>
          <div className={styles.labelRow}>
            <label className="sp-label" htmlFor="collection-name">
              Nombre <span className={styles.required}>*</span>
            </label>
            <span className={styles.limit}>
              {name.length}/{MAX_COLLECTION_NAME_LENGTH}
            </span>
          </div>
          <input
            ref={nameRef}
            id="collection-name"
            className={`${styles.input} ${errors.name ? styles.invalid : ""}`}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setFeedback(null);
              if (errors.name) {
                setErrors((current) => ({ ...current, name: undefined }));
              }
            }}
            maxLength={MAX_COLLECTION_NAME_LENGTH}
            autoComplete="off"
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? "collection-name-error" : undefined}
            disabled={isSubmitting}
          />
          {errors.name ? (
            <p id="collection-name-error" className={styles.fieldError} role="alert">
              {errors.name}
            </p>
          ) : null}
        </div>

        <div className={styles.field}>
          <div className={styles.labelRow}>
            <label className="sp-label" htmlFor="collection-description">
              Descripción <span className={styles.optional}>Opcional</span>
            </label>
            <span className={styles.limit}>
              {description.length}/{MAX_COLLECTION_DESCRIPTION_LENGTH}
            </span>
          </div>
          <textarea
            id="collection-description"
            className={`${styles.input} ${styles.textarea} ${errors.description ? styles.invalid : ""}`}
            value={description}
            onChange={(event) => {
              setDescription(event.target.value);
              setFeedback(null);
              if (errors.description) {
                setErrors((current) => ({ ...current, description: undefined }));
              }
            }}
            maxLength={MAX_COLLECTION_DESCRIPTION_LENGTH}
            rows={5}
            aria-invalid={errors.description ? true : undefined}
            aria-describedby={
              errors.description ? "collection-description-error" : undefined
            }
            disabled={isSubmitting}
          />
          {errors.description ? (
            <p
              id="collection-description-error"
              className={styles.fieldError}
              role="alert"
            >
              {errors.description}
            </p>
          ) : null}
        </div>

        {feedback ? (
          <p className={styles.successFeedback} role="status">
            <Icon name="circle-check" size={18} />
            {feedback}
          </p>
        ) : null}
        {formError ? (
          <p className={styles.formError} role="alert">
            <Icon name="triangle-alert" size={18} />
            {formError}
          </p>
        ) : null}

        <div className={styles.actions}>
          <Button
            variant="ghostLight"
            size="lg"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button type="submit" size="lg" disabled={isSubmitting || !isDirty}>
            {isSubmitting ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </form>

      {showDiscardPrompt ? (
        <ConfirmationDialog
          title="¿Descartar los cambios?"
          cancelLabel="Seguir editando"
          confirmLabel="Descartar"
          onCancel={() => setShowDiscardPrompt(false)}
          onConfirm={() => router.push(ROUTES.favorites)}
        >
          La colección conservará el nombre y la descripción que tenía antes.
        </ConfirmationDialog>
      ) : null}
    </section>
  );
}
