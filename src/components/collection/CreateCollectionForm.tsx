"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button, ConfirmationDialog, Icon } from "@/components/ui";
import { ApiError, createCollection } from "@/lib/api";
import { ROUTES } from "@/lib/routes";
import type { CollectionDetail } from "@/types";

import {
  MAX_COLLECTION_DESCRIPTION_LENGTH,
  MAX_COLLECTION_NAME_LENGTH,
  type CollectionFormErrors,
  validateCollection,
} from "./collection-validation";
import styles from "./collection.module.css";

export function CreateCollectionForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<CollectionFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDiscardPrompt, setShowDiscardPrompt] = useState(false);
  const [createdCollection, setCreatedCollection] =
    useState<CollectionDetail | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const isDirty = name.length > 0 || description.length > 0;

  useEffect(() => {
    if (errors.name) nameRef.current?.focus();
  }, [errors.name]);

  async function submit() {
    const nextErrors = validateCollection(name, description);
    setErrors(nextErrors);
    setFormError(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      const trimmedDescription = description.trim();
      const collection = await createCollection({
        nameCollection: name.trim(),
        ...(trimmedDescription ? { description: trimmedDescription } : {}),
      });
      setCreatedCollection(collection);
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.code === "COLLECTION_NAME_ALREADY_EXISTS"
      ) {
        setErrors({ name: "Ya tenés una colección con ese nombre" });
      } else {
        setFormError("No pudimos crear la colección. Intentá nuevamente");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit();
  }

  function resetForm() {
    setName("");
    setDescription("");
    setErrors({});
    setFormError(null);
    setCreatedCollection(null);
  }

  function handleCancel() {
    if (isDirty) {
      setShowDiscardPrompt(true);
      return;
    }
    router.push(ROUTES.favorites);
  }

  if (createdCollection) {
    return (
      <section className={styles.success} aria-labelledby="collection-success-title">
        <span className={styles.successIcon} aria-hidden="true">
          <Icon name="circle-check" size={32} />
        </span>
        <p className={`sp-label ${styles.eyebrow}`}>CU32 · Colecciones</p>
        <h1 id="collection-success-title" className="sp-h2">
          Colección creada correctamente
        </h1>
        <p className={`sp-body-lg ${styles.successCopy}`}>
          <strong>{createdCollection.nameCollection}</strong> ya está lista para
          que agregues actividades cuando quieras.
        </p>
        <div className={styles.actions}>
          <Button variant="ghostLight" size="lg" onClick={resetForm}>
            Crear otra
          </Button>
          <Button
            size="lg"
            onClick={() => router.push(ROUTES.favorites)}
          >
            Ir a mis colecciones
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.screen} aria-labelledby="create-collection-title">
      <header className={styles.header}>
        <div className={styles.iconTile} aria-hidden="true">
          <Icon name="folder-plus" size={28} />
        </div>
        <div>
          <p className={`sp-label ${styles.eyebrow}`}>CU32 · Colecciones</p>
          <h1 id="create-collection-title" className="sp-h2">
            Creá una colección
          </h1>
          <p className={`sp-body-lg ${styles.intro}`}>
            Agrupá actividades por tema, momento o idea. Los planes y tus
            favoritos se guardan por separado.
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
              if (errors.name) setErrors((current) => ({ ...current, name: undefined }));
            }}
            maxLength={MAX_COLLECTION_NAME_LENGTH}
            placeholder="Ej. Bodegas para visitar"
            autoComplete="off"
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? "collection-name-error" : "collection-name-help"}
            disabled={isSubmitting}
          />
          {errors.name ? (
            <p id="collection-name-error" className={styles.fieldError} role="alert">
              {errors.name}
            </p>
          ) : (
            <p id="collection-name-help" className={styles.help}>
              Elegí un nombre único dentro de tus colecciones.
            </p>
          )}
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
              if (errors.description) {
                setErrors((current) => ({ ...current, description: undefined }));
              }
            }}
            maxLength={MAX_COLLECTION_DESCRIPTION_LENGTH}
            rows={5}
            placeholder="Contá qué tipo de actividades querés reunir"
            aria-invalid={errors.description ? true : undefined}
            aria-describedby={errors.description ? "collection-description-error" : undefined}
            disabled={isSubmitting}
          />
          {errors.description ? (
            <p id="collection-description-error" className={styles.fieldError} role="alert">
              {errors.description}
            </p>
          ) : null}
        </div>

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
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Icon name="loader-circle" className="sp-spin" /> Creando...
              </>
            ) : (
              <>
                <Icon name="folder-plus" /> Crear colección
              </>
            )}
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
          La colección todavía no fue creada y vas a perder los datos ingresados.
        </ConfirmationDialog>
      ) : null}
    </section>
  );
}
