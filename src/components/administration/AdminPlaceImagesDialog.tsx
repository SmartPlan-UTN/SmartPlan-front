"use client";

import { useEffect, useId, useRef } from "react";

import { MediaGalleryManager } from "@/components/media";
import { Icon } from "@/components/ui";
import type { PlaceOption } from "@/types";

import styles from "./AdminManagement.module.css";

interface AdminPlaceImagesDialogProps {
  place: PlaceOption;
  onClose: () => void;
}

export function AdminPlaceImagesDialog({ place, onClose }: AdminPlaceImagesDialogProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCloseRef.current();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, []);

  return (
    <div className={styles.dialogOverlay}>
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className={styles.dialogHeader}>
          <div>
            <h2 id={titleId} className="sp-h4">Imágenes del lugar</h2>
            <p className="sp-small">{place.name} · {place.address}</p>
          </div>
          <button ref={closeRef} type="button" className={styles.iconButton} aria-label="Cerrar imágenes" onClick={onClose}>
            <Icon name="x" size={18} />
          </button>
        </header>
        <div className={styles.gallerySection}>
          <MediaGalleryManager target="place" resourceId={place.id} resourceName={place.name} />
        </div>
      </div>
    </div>
  );
}
