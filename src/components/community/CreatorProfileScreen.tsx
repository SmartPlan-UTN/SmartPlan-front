"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import { Button, Icon } from "@/components/ui";
import {
  getCommunityCreator,
  getCreatorExperiences,
  getCreatorInspired,
  getCreatorPlans,
} from "@/lib/api";
import { ROUTES } from "@/lib/routes";
import { categoryLabel } from "@/lib/utils/catalogLabels";
import type {
  CommunityCreator,
  CommunityExperience,
  CommunityPlan,
} from "@/types";

import { PlanCard, StoryCard } from "./cards";
import { formatMonthYear, pluralize } from "./format";
import { PersonAvatar } from "./Person";
import { useOwnUsername } from "./useOwnUsername";
import { useCommunityReturnPath } from "./useCommunityReturnPath";
import styles from "./community.module.css";

type TabId = "experiences" | "plans" | "inspired";

export function CreatorProfileScreen({ username }: { username: string }) {
  const returnTo = useCommunityReturnPath();
  const [creator, setCreator] = useState<CommunityCreator | null>(null);
  const [stories, setStories] = useState<CommunityExperience[]>([]);
  const [plans, setPlans] = useState<CommunityPlan[]>([]);
  const [inspired, setInspired] = useState<CommunityPlan[]>([]);
  const [tab, setTab] = useState<TabId>("experiences");
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const tabRefs = useRef<Partial<Record<TabId, HTMLButtonElement | null>>>({});
  const ownUsername = useOwnUsername();
  const [pages, setPages] = useState<
    Record<TabId, { page: number; totalPages: number }>
  >({
    experiences: { page: 1, totalPages: 0 },
    plans: { page: 1, totalPages: 0 },
    inspired: { page: 1, totalPages: 0 },
  });
  const [errors, setErrors] = useState<Partial<Record<TabId, boolean>>>({});
  const [busyTab, setBusyTab] = useState<TabId | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    let active = true;
    requestId.current += 1;
    Promise.all([
      getCommunityCreator(username),
      getCreatorExperiences(username, { limit: 12 }).catch(() => null),
      getCreatorPlans(username, { limit: 12 }).catch(() => null),
      // A person's profile does not depend on who adapted their plans.
      getCreatorInspired(username, { limit: 12 }).catch(() => null),
    ])
      .then(([profile, experiences, plans, derived]) => {
        if (!active) return;
        setCreator(profile);
        setStories(experiences?.data ?? []);
        setPlans(plans?.data ?? []);
        setInspired(derived?.data ?? []);
        setPages({
          experiences: experiences?.pagination ?? { page: 1, totalPages: 0 },
          plans: plans?.pagination ?? { page: 1, totalPages: 0 },
          inspired: derived?.pagination ?? { page: 1, totalPages: 0 },
        });
        setErrors({
          experiences: !experiences,
          plans: !plans,
          inspired: !derived,
        });
        // Open on whatever this person actually has.
        setTab(
          experiences?.data.length
            ? "experiences"
            : plans?.data.length
              ? "plans"
              : derived?.data.length
                ? "inspired"
                : "experiences",
        );
        setState("ready");
      })
      .catch(() => {
        if (active) setState("error");
      });
    return () => {
      active = false;
      requestId.current += 1;
    };
  }, [username]);

  async function loadTab(target: TabId, more = false) {
    const current = requestId.current;
    setBusyTab(target);
    const next = more ? pages[target].page + 1 : 1;
    try {
      const params = { page: next, limit: 12 };
      if (target === "experiences") {
        const result = await getCreatorExperiences(username, params);
        if (current !== requestId.current) return;
        setStories((previous) =>
          more
            ? [
                ...new Map(
                  [...previous, ...result.data].map((item) => [item.id, item]),
                ).values(),
              ]
            : result.data,
        );
        setPages((previous) => ({ ...previous, [target]: result.pagination }));
      } else {
        const result = await (target === "plans"
          ? getCreatorPlans(username, params)
          : getCreatorInspired(username, params));
        if (current !== requestId.current) return;
        const update = target === "plans" ? setPlans : setInspired;
        update((previous) =>
          more
            ? [
                ...new Map(
                  [...previous, ...result.data].map((item) => [item.id, item]),
                ).values(),
              ]
            : result.data,
        );
        setPages((previous) => ({ ...previous, [target]: result.pagination }));
      }
      setErrors((previous) => ({ ...previous, [target]: false }));
    } catch {
      if (current === requestId.current)
        setErrors((previous) => ({ ...previous, [target]: true }));
    } finally {
      if (current === requestId.current) setBusyTab(null);
    }
  }

  if (state === "loading") {
    return (
      <div className={styles.page}>
        <div
          className={styles.profileSkeleton}
          role="status"
          aria-label="Abriendo perfil"
        >
          <span />
          <span />
        </div>
      </div>
    );
  }
  if (state === "error" || !creator) {
    return (
      <div className={styles.page}>
        <div className={styles.state}>
          <h1 className={styles.stateTitle}>No encontramos este perfil</h1>
          <Link className={styles.textButton} href={ROUTES.community}>
            Volver a la comunidad
          </Link>
        </div>
      </div>
    );
  }

  const isOwn =
    ownUsername !== null && ownUsername === creator.username.toLowerCase();
  const tabs: Array<{ id: TabId; label: string; count: number }> = [
    { id: "experiences", label: "Experiencias", count: creator.experienceCount },
    { id: "plans", label: "Planes", count: creator.planCount },
    ...(inspired.length > 0 || (creator.adaptationsReceived ?? 0) > 0
      ? [
          {
            id: "inspired" as const,
            label: "Inspiró",
            count: creator.adaptationsReceived ?? inspired.length,
          },
        ]
      : []),
  ];

  function handleTabKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    const last = tabs.length - 1;
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? last
          : event.key === "ArrowRight"
            ? (index + 1) % tabs.length
            : event.key === "ArrowLeft"
              ? (index - 1 + tabs.length) % tabs.length
              : null;
    if (next === null) return;
    event.preventDefault();
    const target = tabs[next].id;
    setTab(target);
    tabRefs.current[target]?.focus();
  }

  const adapted = creator.adaptationsReceived ?? 0;
  const facts = [
    creator.planCount > 0
      ? pluralize(creator.planCount, "plan publicado", "planes publicados")
      : null,
    creator.experienceCount > 0
      ? pluralize(creator.experienceCount, "experiencia", "experiencias")
      : null,
    (creator.likeCount ?? 0) > 0
      ? `${new Intl.NumberFormat("es-AR").format(creator.likeCount ?? 0)} me gusta en sus experiencias`
      : null,
    adapted > 0
      ? `Inspiró ${adapted} ${adapted === 1 ? "plan" : "planes"}`
      : null,
    creator.memberSince
      ? `En SmartPlan desde ${formatMonthYear(creator.memberSince)}`
      : null,
  ].filter((fact): fact is string => fact !== null);

  return (
    <div className={styles.page}>
      <Link href={returnTo} className={styles.backLink}>
        ← Comunidad
      </Link>
      <header className={styles.profileHead}>
        <PersonAvatar
          username={creator.username}
          avatarUrl={creator.avatarUrl}
          size={112}
        />
        <div className={styles.profileMain}>
          {isOwn ? (
            <p className={styles.ownBadge}>Así te ve la comunidad</p>
          ) : null}
          <h1 className={styles.profileName}>@{creator.username}</h1>
          {creator.bio ? <p className={styles.bio}>{creator.bio}</p> : null}
          {facts.length > 0 ? (
            <ul className={styles.profileFacts}>
              {facts.map((fact) => (
                <li key={fact}>{fact}</li>
              ))}
            </ul>
          ) : null}
          {creator.tasteTags && creator.tasteTags.length > 0 ? (
            <div className={styles.taste} aria-label="Lo que suele elegir">
              {creator.tasteTags.map((tag) => (
                <span className={styles.tasteTag} key={tag}>
                  {categoryLabel(tag)}
                </span>
              ))}
            </div>
          ) : null}
          {isOwn ? (
            <div className={styles.ownActions}>
              <Link href={ROUTES.profile} className={styles.ownPrimary}>
                <Icon name="pencil" size={16} aria-hidden="true" />
                {creator.bio ? "Editar mi perfil" : "Sumar mi bio y mi foto"}
              </Link>
            </div>
          ) : null}
        </div>
      </header>

      <div
        className={styles.tabbar}
        role="tablist"
        aria-label={`Publicaciones de @${creator.username}`}
      >
        {tabs.map((item, index) => (
          <button
            key={item.id}
            ref={(element) => {
              tabRefs.current[item.id] = element;
            }}
            id={`community-profile-tab-${item.id}`}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            aria-controls={`community-profile-panel-${item.id}`}
            tabIndex={tab === item.id ? 0 : -1}
            onClick={() => setTab(item.id)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
          >
            {item.label}
            <span>{item.count}</span>
          </button>
        ))}
      </div>

      <div
        id={`community-profile-panel-${tab}`}
        className={styles.panel}
        role="tabpanel"
        aria-labelledby={`community-profile-tab-${tab}`}
        tabIndex={0}
      >
        {errors[tab] ? (
          <div className={styles.state} role="alert">
            <p>No pudimos cargar estas publicaciones.</p>
            <Button
              variant="ghostLight"
              disabled={busyTab === tab}
              onClick={() => void loadTab(tab)}
            >
              Reintentar
            </Button>
          </div>
        ) : null}
        {tab === "experiences" ? (
          stories.length > 0 ? (
            <>
              <h2 className="sp-sr-only">Experiencias de @{creator.username}</h2>
              <div
                className={`${styles.stories} ${stories.length === 1 ? styles.storiesSingle : ""}`}
              >
                {stories.map((story) => (
                  <StoryCard
                    key={story.id}
                    story={story}
                    layout={stories.length === 1 ? "wide" : "card"}
                  />
                ))}
              </div>
            </>
          ) : !errors.experiences ? (
            <div className={styles.state}>
              <p>
                {isOwn
                  ? "Todavía no compartiste ninguna experiencia. Cuando completes una salida, podés contar cómo te fue desde Mis salidas y aparece acá con sus fotos."
                  : `@${creator.username} todavía no compartió ninguna experiencia.`}
              </p>
              {isOwn ? (
                <Link className={styles.textButton} href={ROUTES.outings}>
                  Ir a Mis salidas
                </Link>
              ) : null}
            </div>
          ) : null
        ) : null}

        {tab === "plans" ? (
          plans.length > 0 ? (
            <>
              <h2 className="sp-sr-only">Planes de @{creator.username}</h2>
              <div className={styles.grid}>
                {plans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={{
                      ...plan,
                      authorUsername: plan.authorUsername ?? creator.username,
                    }}
                    layout={plans.length === 1 ? "wide" : "card"}
                  />
                ))}
              </div>
            </>
          ) : !errors.plans ? (
            <div className={styles.state}>
              <p>
                {isOwn
                  ? "Todavía no publicaste ningún plan. Podés hacerlo público desde su pantalla para que otras personas lo descubran."
                  : `@${creator.username} todavía no publicó ningún plan.`}
              </p>
              {isOwn ? (
                <Link className={styles.textButton} href={ROUTES.plans}>
                  Ir a Mis planes
                </Link>
              ) : null}
            </div>
          ) : null
        ) : null}

        {tab === "inspired" ? (
          <>
            <div className={styles.panelIntro}>
              <h2>Versiones creadas a partir de sus planes</h2>
              <p>
                Otras personas los adaptaron a su manera a partir de los planes de
                @{creator.username}, y siguen dándole el crédito.
              </p>
            </div>
            {inspired.length > 0 ? (
              <div className={styles.grid}>
                {inspired.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    layout={inspired.length === 1 ? "wide" : "card"}
                  />
                ))}
              </div>
            ) : !errors.inspired ? (
              <div className={styles.state}>
                <p>Todavía no hay planes inspirados públicos para mostrar.</p>
              </div>
            ) : null}
          </>
        ) : null}
        {pages[tab].page < pages[tab].totalPages ? (
          <div className={styles.loadMore}>
            <Button
              variant="ghostLight"
              disabled={busyTab === tab}
              onClick={() => void loadTab(tab, true)}
            >
              {busyTab === tab ? "Cargando…" : "Ver más publicaciones"}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
