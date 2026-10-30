"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFavorites } from "@/context";
import { Icon } from "@/components/ui";
import { useSession } from "@/lib/auth";
import { likeCommunityExperience, unlikeCommunityExperience } from "@/lib/api";
import { ROUTES } from "@/lib/routes";
import styles from "./cards.module.css";

export function SavePlanButton({ id, title }: { id: number; title: string }) {
  const { isPlanSaved, toggleSavePlan } = useFavorites();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const saved = isPlanSaved(id);
  async function save() {
    setBusy(true);
    setFailed(false);
    try {
      await toggleSavePlan(id);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <span className={styles.actionWrap}>
      <button
        type="button"
        className={styles.action}
        disabled={busy}
        aria-pressed={saved}
        aria-label={saved ? `Quitar ${title} de guardados` : `Guardar ${title}`}
        onClick={() => void save()}
      >
        <Icon
          name="bookmark"
          size={17}
          className={saved ? styles.saved : undefined}
        />
        {saved ? "Guardado" : "Guardar"}
      </button>
      {failed ? (
        <span role="alert" className={styles.actionError}>
          No pudimos guardarlo. Probá otra vez.
        </span>
      ) : null}
    </span>
  );
}

export function SharePublicationButton({
  path,
  title,
}: {
  path: string;
  title: string;
}) {
  const [state, setState] = useState<"idle" | "copied" | "manual">("idle");
  const [url, setUrl] = useState("");
  async function share() {
    const link = new URL(path, window.location.origin).href;
    setUrl(link);
    try {
      if (navigator.share) {
        await navigator.share({ title, url: link });
        return;
      }
      await navigator.clipboard.writeText(link);
      setState("copied");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setState("manual");
    }
  }
  return (
    <span className={styles.actionWrap}>
      <button
        className={styles.action}
        type="button"
        onClick={() => void share()}
      >
        <Icon name={state === "copied" ? "check" : "share-2"} size={17} />
        {state === "copied" ? "Enlace copiado" : "Compartir"}
      </button>
      {state === "copied" ? (
        <span className="sp-sr-only" role="status">
          Enlace copiado
        </span>
      ) : null}
      {state === "manual" ? (
        <label className={styles.copyLink}>
          Copiá el enlace
          <input
            aria-label="Enlace para compartir"
            readOnly
            value={url}
            onFocus={(event) => event.target.select()}
          />
        </label>
      ) : null}
    </span>
  );
}

export function LikeExperienceButton({
  id,
  title,
  initialCount,
  initiallyLiked,
  isOwn = false,
}: {
  id: number;
  title: string;
  initialCount: number;
  initiallyLiked: boolean;
  isOwn?: boolean;
}) {
  const router = useRouter();
  const { status } = useSession();
  const [liked, setLiked] = useState(initiallyLiked);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function toggleLike() {
    if (status === "loading" || busy) return;
    if (status === "anonymous") {
      const redirect = `${window.location.pathname}${window.location.search}`;
      router.push(`${ROUTES.login}?redirect=${encodeURIComponent(redirect)}`);
      return;
    }
    const nextLiked = !liked;
    setLiked(nextLiked);
    setCount((value) => Math.max(0, value + (nextLiked ? 1 : -1)));
    setBusy(true);
    setFailed(false);
    try {
      const result = nextLiked
        ? await likeCommunityExperience(id)
        : await unlikeCommunityExperience(id);
      setLiked(result.liked);
      setCount(result.likeCount);
    } catch {
      setLiked(!nextLiked);
      setCount((value) => Math.max(0, value + (nextLiked ? -1 : 1)));
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  if (isOwn) return null;
  return (
    <span className={styles.actionWrap}>
      <button
        className={`${styles.action} ${liked ? styles.liked : ""}`}
        type="button"
        aria-pressed={liked}
        aria-label={`${liked ? "Quitar me gusta" : "Me gusta"}: ${title}. ${count} ${count === 1 ? "me gusta" : "me gusta"}`}
        disabled={busy || status === "loading"}
        onClick={() => void toggleLike()}
      >
        <Icon name="heart" size={17} />
        <span>{count}</span>
      </button>
      {failed ? (
        <span role="alert" className={styles.actionError}>
          No pudimos guardar tu me gusta. Probá otra vez.
        </span>
      ) : null}
    </span>
  );
}
