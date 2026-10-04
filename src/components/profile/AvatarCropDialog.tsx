"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent,
} from "react";
import { createPortal } from "react-dom";

import { Button, Icon } from "@/components/ui";

import styles from "./avatar-crop.module.css";

const OUTPUT_SIZE = 512;
const MAX_ZOOM = 3;

interface AvatarCropDialogProps {
  file: File;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: (file: File) => Promise<void>;
}

interface Point {
  x: number;
  y: number;
}

function clampPan(
  pan: Point,
  imageWidth: number,
  imageHeight: number,
  viewportSize: number,
): Point {
  const maxX = Math.max(0, (imageWidth - viewportSize) / 2);
  const maxY = Math.max(0, (imageHeight - viewportSize) / 2);

  return {
    x: Math.min(maxX, Math.max(-maxX, pan.x)),
    y: Math.min(maxY, Math.max(-maxY, pan.y)),
  };
}

/** Lets someone position and zoom a square avatar crop before it is saved. */
export function AvatarCropDialog({
  file,
  busy,
  error,
  onCancel,
  onConfirm,
}: AvatarCropDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const viewportRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef(onCancel);
  const busyRef = useRef(busy);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    panX: number;
    panY: number;
  } | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<Point | null>(null);
  const [viewportSize, setViewportSize] = useState(320);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [cropError, setCropError] = useState<string | null>(null);
  const [cropping, setCropping] = useState(false);

  closeRef.current = onCancel;
  const working = busy || cropping;
  busyRef.current = working;

  const baseScale = imageSize
    ? Math.max(viewportSize / imageSize.x, viewportSize / imageSize.y)
    : 1;
  const imageWidth = (imageSize?.x ?? viewportSize) * baseScale * zoom;
  const imageHeight = (imageSize?.y ?? viewportSize) * baseScale * zoom;

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSource(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const measure = () => {
      const size = viewport.getBoundingClientRect().width;
      if (size > 0) setViewportSize(size);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setPan((current) => clampPan(current, imageWidth, imageHeight, viewportSize));
  }, [imageHeight, imageWidth, viewportSize]);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cancelRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busyRef.current) {
        closeRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      const dialog = viewportRef.current?.closest("[role='dialog']");
      const stops = dialog?.querySelectorAll<HTMLElement>(
        "button:not(:disabled), input:not(:disabled)",
      );
      const first = stops?.[0];
      const last = stops?.[stops.length - 1];
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
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!imageSize || working) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    setPan(clampPan(
      {
        x: drag.panX + event.clientX - drag.startX,
        y: drag.panY + event.clientY - drag.startY,
      },
      imageWidth,
      imageHeight,
      viewportSize,
    ));
  }

  function onPointerEnd() {
    dragRef.current = null;
  }

  function moveCropWithKeyboard(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (!imageSize) return;
    const distance = event.shiftKey ? 24 : 8;
    const offsets: Record<string, Point> = {
      ArrowLeft: { x: distance, y: 0 },
      ArrowRight: { x: -distance, y: 0 },
      ArrowUp: { x: 0, y: distance },
      ArrowDown: { x: 0, y: -distance },
    };
    const offset = offsets[event.key];
    if (!offset) return;
    event.preventDefault();
    setPan((current) => clampPan(
      { x: current.x + offset.x, y: current.y + offset.y },
      imageWidth,
      imageHeight,
      viewportSize,
    ));
  }

  function changeZoom(nextZoom: number) {
    setZoom(nextZoom);
    setPan((current) => clampPan(
      current,
      (imageSize?.x ?? viewportSize) * baseScale * nextZoom,
      (imageSize?.y ?? viewportSize) * baseScale * nextZoom,
      viewportSize,
    ));
  }

  async function saveCrop() {
    const image = imageRef.current;
    if (!image || !imageSize || working) return;

    setCropping(true);
    setCropError(null);
    const left = (viewportSize - imageWidth) / 2 + pan.x;
    const top = (viewportSize - imageHeight) / 2 + pan.y;
    const sourceX = Math.max(0, -left / imageWidth * imageSize.x);
    const sourceY = Math.max(0, -top / imageHeight * imageSize.y);
    const sourceWidth = viewportSize / imageWidth * imageSize.x;
    const sourceHeight = viewportSize / imageHeight * imageSize.y;
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;

    const context = canvas.getContext("2d");
    if (!context) {
      setCropError("No pudimos preparar la imagen. Probá con otra foto.");
      setCropping(false);
      return;
    }

    try {
      context.drawImage(
        image,
        sourceX,
        sourceY,
        Math.min(sourceWidth, imageSize.x - sourceX),
        Math.min(sourceHeight, imageSize.y - sourceY),
        0,
        0,
        OUTPUT_SIZE,
        OUTPUT_SIZE,
      );

      const outputType = file.type === "image/jpeg" ? "image/jpeg" : "image/png";
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, outputType, 0.9);
      });
      if (!blob) {
        setCropError("No pudimos preparar la imagen. Probá con otra foto.");
        setCropping(false);
        return;
      }

      const baseName = file.name.replace(/\.[^.]+$/, "") || "foto-perfil";
      const extension = outputType === "image/jpeg" ? "jpg" : "png";
      const croppedFile = new File([blob], `${baseName}.${extension}`, {
        type: outputType,
        lastModified: Date.now(),
      });
      setCropping(false);
      await onConfirm(croppedFile);
    } catch {
      setCropError("No pudimos preparar la imagen. Probá con otra foto.");
      setCropping(false);
    }
  }

  return createPortal(
    <div
      className={styles.overlay}
      onClick={() => {
        if (!working) onCancel();
      }}
    >
      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Foto de perfil</p>
            <h2 id={titleId}>Ajustá tu foto</h2>
            <p id={descriptionId} className={styles.description}>
              Arrastrá para encuadrar, ajustá el zoom o movela con las flechas.
            </p>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            aria-label="Cerrar recorte"
            disabled={working}
            onClick={onCancel}
          >
            <Icon name="x" size={18} aria-hidden="true" />
          </button>
        </header>

        <div className={styles.cropArea}>
          <div
            ref={viewportRef}
            className={styles.viewport}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
            onKeyDown={moveCropWithKeyboard}
            tabIndex={imageSize ? 0 : -1}
            role="group"
            aria-label="Vista previa del recorte. Arrastrá para mover la foto."
          >
            {source ? (
              <img
                ref={imageRef}
                src={source}
                alt=""
                className={styles.cropImage}
                draggable={false}
                onLoad={(event) => {
                  setImageSize({
                    x: event.currentTarget.naturalWidth,
                    y: event.currentTarget.naturalHeight,
                  });
                  setPan({ x: 0, y: 0 });
                }}
                onError={() => setCropError("No pudimos abrir esa imagen. Elegí otra foto.")}
                style={{
                  width: imageWidth,
                  height: imageHeight,
                  transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px)`,
                }}
              />
            ) : null}
            {!imageSize ? (
              <span className={styles.loading} role="status">
                Preparando vista previa…
              </span>
            ) : null}
            <span className={styles.cropGuide} aria-hidden="true" />
          </div>
          <p className={styles.cropHint}>La parte dentro del círculo se va a ver en tu perfil.</p>
        </div>

        <label className={styles.zoomControl}>
          <span>
            <Icon name="sliders-horizontal" size={16} aria-hidden="true" />
            Zoom
          </span>
          <input
            type="range"
            min="1"
            max={MAX_ZOOM}
            step="0.01"
            value={zoom}
            aria-label="Zoom de la foto"
            disabled={!imageSize || working}
            onChange={(event) => changeZoom(Number(event.target.value))}
          />
          <output>{zoom.toFixed(1)}×</output>
        </label>

        {cropError || error ? (
          <p className={styles.error} role="alert">
            <Icon name="circle-alert" size={16} aria-hidden="true" />
            {cropError ?? error}
          </p>
        ) : null}

        <div className={styles.actions}>
          <Button
            ref={cancelRef}
            variant="ghostLight"
            disabled={working}
            onClick={onCancel}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            disabled={!imageSize || working}
            onClick={() => void saveCrop()}
          >
            {working ? (
              <>
                <Icon name="loader-circle" size={16} className={styles.spinner} aria-hidden="true" />
                Guardando…
              </>
            ) : (
              "Usar esta foto"
            )}
          </Button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
