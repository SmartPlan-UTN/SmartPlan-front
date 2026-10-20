"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import { GoogleUiKitMedia } from "@/components/media/GoogleUiKitMedia";
import { PLAN_SELECTION } from "@/components/plan/planSelectionContent";
import { Button, Icon } from "@/components/ui";
import { outingDetailRoute, planDetailRoute, ROUTES } from "@/lib/routes";
import { hasMoneyToShow, planMoneyLine } from "@/lib/plans/planMoney";
import {
  anchorOf,
  compactHours,
  itineraryOf,
  planHeadline,
  planNote,
  reasonsOf,
} from "@/lib/plans/story";
import { stopClock, stopLabel, stopPlace } from "@/lib/plans/stops";
import { formatArs, observedWhen } from "@/lib/utils";
import type { PlanDetailResult, PlanFunnel, StopInsight } from "@/types";

import { PlaceVisual } from "./PlaceVisual";
import styles from "./hero-recommendation.module.css";

export interface HeroRecommendationProps {
  plan: PlanDetailResult;
  returnTo?: string;
  mode: "auto" | "surprise";
  funnel: PlanFunnel | null;
  accentColor: string;
  active: boolean;
  intended: boolean;
  busy: boolean;
  selectionWorking: boolean;
  onActivate: (id: number) => void;
  onDeactivate: (id: number) => void;
  onViewRoute: (id: number) => void;
  onIntend: (plan: PlanDetailResult) => void;
  registerRef: (id: number, el: HTMLElement | null) => void;
  /** "Más tranqui · Más moderno…" and per-stop changes. */
  refinement?: ReactNode;
}

const KICKER: Record<NonNullable<PlanDetailResult["insight"]>["role"], string> = {
  BEST: "Este es el que elegiría",
  VALUE: "Lo mejor para tu bolsillo",
  DIFFERENT: "Una apuesta distinta",
  ALTERNATIVE: "Mi recomendación",
};

/** A representative order from the official menu, expandable. */
function OrderSuggestion({ order }: { order: NonNullable<StopInsight["order"]> }) {
  const [open, setOpen] = useState(false);
  const [now] = useState(() => new Date());
  const when = observedWhen(order.observedAt, now);
  return (
    <div className={styles.order}>
      <button
        type="button"
        className={styles.orderToggle}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name="utensils" size={14} aria-hidden="true" />
        Qué podrían pedir
        <span className={styles.orderTotal}>≈ {formatArs(order.total)}</span>
        <Icon
          name="chevron-down"
          size={14}
          className={open ? styles.chevronOpen : undefined}
          aria-hidden="true"
        />
      </button>
      {open ? (
        <div className={styles.orderBody}>
          <ul>
            {order.lines.map((line) => (
              <li key={`${line.item}-${line.quantity}`}>
                <span>
                  {line.quantity} × {line.item}
                </span>
                <span>{formatArs(line.unitPrice * line.quantity)}</span>
              </li>
            ))}
          </ul>
          <p>
            Un ejemplo con precios de la{" "}
            <a href={order.sourceUrl} target="_blank" rel="noreferrer">
              carta oficial
            </a>
            {when ? `, revisada ${when}` : ""}
            . Extras y propina aparte.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function Row({
  label,
  children,
  muted = false,
}: {
  label: string;
  children: ReactNode;
  muted?: boolean;
}) {
  return (
    <div className={[styles.row, muted ? styles.rowMuted : ""].filter(Boolean).join(" ")}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

/**
 * The one recommendation smartplan stands behind. Not one of three equal
 * cards: a large picture of the place, its name, what it is, the facts a
 * person needs to decide (open until when, what it costs, how fresh the
 * menu is), why it fits what they asked, and the decision. Everything shown
 * is evidence the planner holds; nothing here is a warning.
 */
export function HeroRecommendation({
  plan,
  returnTo,
  mode,
  funnel,
  accentColor,
  active,
  intended,
  busy,
  selectionWorking,
  onActivate,
  onDeactivate,
  onViewRoute,
  onIntend,
  registerRef,
  refinement,
}: HeroRecommendationProps) {
  const insight = plan.insight ?? null;
  const anchor = anchorOf(plan);
  const itinerary = itineraryOf(plan);
  const multi = itinerary.length > 1;
  const place = anchor?.place ?? null;
  const stopInsight = anchor?.insight ?? null;
  const headline = planHeadline(plan);
  const reasons = reasonsOf(insight?.why);
  const money = planMoneyLine(plan);
  const prep = (plan.readiness?.tasks ?? []).filter(
    (task) => task.required && task.status === "PENDING",
  );
  const hours = compactHours(stopInsight?.hours ?? null);
  const note = planNote(plan);
  const googlePlaceId =
    place?.googlePlaceId ??
    (typeof anchor?.item.stop?.estimateBasis?.googlePlaceId === "string"
      ? anchor.item.stop.estimateBasis.googlePlaceId
      : null);
  const kicker =
    mode === "surprise"
      ? "Te sorprendo con este"
      : KICKER[insight?.role ?? "BEST"];

  return (
    <article
      ref={(el) => registerRef(plan.id, el)}
      data-testid="hero-recommendation"
      onMouseEnter={() => onActivate(plan.id)}
      onMouseLeave={() => onDeactivate(plan.id)}
      onFocus={() => onActivate(plan.id)}
      onBlur={() => onDeactivate(plan.id)}
      className={[styles.hero, active ? styles.heroActive : "", intended ? styles.heroChosen : ""]
        .filter(Boolean)
        .join(" ")}
      style={{ ["--accent" as string]: accentColor }}
      aria-labelledby={`hero-${plan.id}`}
    >
      <div className={styles.visual}>
        <PlaceVisual
          name={place?.name ?? headline}
          kind={place?.kind ?? null}
          kindLabel={place?.kindLabel ?? null}
          googlePlaceId={googlePlaceId}
        />
        <span className={styles.badge}>
          <span className={styles.badgeDot} aria-hidden="true" />
          {kicker}
        </span>
        {hours ? (
          <span className={styles.hours}>
            <Icon name="clock" size={14} aria-hidden="true" />
            {hours}
          </span>
        ) : null}
      </div>

      <div className={styles.story}>
        <p className={styles.kickerLine}>
          {place?.kindLabel ? <span>{place.kindLabel}</span> : null}
          {place?.departmentName ? <span>{place.departmentName}</span> : null}
          {insight?.decisionGrade ? (
            <span className={styles.seal}>
              <Icon name="circle-check" size={13} aria-hidden="true" />
              Datos verificados
            </span>
          ) : null}
        </p>

        <h2 id={`hero-${plan.id}`} className={styles.name}>
          <Link href={planDetailRoute(plan.id, returnTo)} className={styles.nameLink}>
            {headline}
          </Link>
        </h2>
        {insight?.tagline ? (
          <p className={styles.tagline}>{insight.tagline}</p>
        ) : null}

        <dl className={styles.ledger}>
          <Row
            label="Precio"
            muted={!stopInsight?.price && !stopInsight?.priceLive && !(multi && money.note === "total estimado")}
          >
            {multi && money.note === "total estimado" ? (
              <>
                {money.value}
                <small>Total de las {itinerary.length} paradas</small>
              </>
            ) : stopInsight?.price ? (
              <>
                {stopInsight.price}
                {stopInsight.priceSource ? (
                  <small>{stopInsight.priceSource}</small>
                ) : null}
              </>
            ) : stopInsight?.priceLive && googlePlaceId ? (
              <GoogleUiKitMedia
                googlePlaceId={googlePlaceId}
                screen="plan-result"
                content={["rating", "price"]}
                orientation="horizontal"
              />
            ) : (multi || hasMoneyToShow(plan)) && money.value ? (
              <>
                {money.value}
                {money.note ? <small>{money.note}</small> : null}
              </>
            ) : (
              <>
                Sin precio publicado
                <small>Preguntalo al llegar</small>
              </>
            )}
          </Row>
          <Row label="Horario" muted={!stopInsight?.hours}>
            {stopInsight?.hours ? (
              <>
                {stopInsight.hours}
                {stopInsight.hoursSource ? (
                  <small>{stopInsight.hoursSource}</small>
                ) : null}
              </>
            ) : (
              <>
                Todavía sin confirmar
                <small>Revisalo antes de salir</small>
              </>
            )}
          </Row>
          {place?.address ? (
            <Row label="Dónde">
              {place.address}
            </Row>
          ) : null}
        </dl>

        {stopInsight?.order ? <OrderSuggestion order={stopInsight.order} /> : null}

        <section className={styles.why} aria-label="Por qué encaja">
          <p className={styles.whyLabel}>Por qué encaja</p>
          {insight?.echo ? <p className={styles.echo}>{insight.echo}</p> : null}
          {reasons.length ? (
            <ul className={styles.reasons}>
              {reasons.slice(0, 4).map((reason) => (
                <li key={reason}>
                  <Icon name="check" size={14} aria-hidden="true" />
                  {reason}
                </li>
              ))}
            </ul>
          ) : null}
          {funnel && funnel.places > 1 ? (
            <p className={styles.chosenFrom}>
              Lo elegí entre {funnel.places} lugares que revisé
              {funnel.character && funnel.fitsCharacter
                ? `; ${funnel.fitsCharacter} encajan con «${funnel.character.toLowerCase()}»`
                : ""}
              .
            </p>
          ) : null}
        </section>

        {multi ? (
          <ol className={styles.route} aria-label="Itinerario del plan">
            {itinerary.map((item) => (
              <li key={item.id}>
                {stopClock(item) ? <time>{stopClock(item)}</time> : null}
                <span>
                  {stopPlace(item)?.name ?? stopLabel(item)}
                  <small>{stopLabel(item)}</small>
                </span>
              </li>
            ))}
          </ol>
        ) : null}

        {prep.length ? (
          <p className={styles.note}>
            <Icon name="calendar-check" size={13} aria-hidden="true" />
            Antes de salir: {prep.map((task) => task.label).join(", ")}.
            Vas a poder confirmarlo en tu salida.
          </p>
        ) : null}

        {note ? (
          <p className={styles.note}>
            <Icon name="info" size={13} aria-hidden="true" />
            {note}
          </p>
        ) : null}

        <div className={styles.actions}>
          {intended ? (
            <span className={styles.chosen}>
              <Icon name="circle-check" size={16} aria-hidden="true" />
              {PLAN_SELECTION.added}
              <Link
                href={
                  plan.activeOutingId != null
                    ? outingDetailRoute(plan.activeOutingId)
                    : ROUTES.outings
                }
              >
                {PLAN_SELECTION.viewOuting}
              </Link>
            </span>
          ) : (
            <Button
              variant="primary"
              size="lg"
              className={styles.primary}
              disabled={selectionWorking}
              aria-busy={busy}
              onClick={() => onIntend(plan)}
            >
              {busy ? (
                <Icon
                  name="loader-circle"
                  size={16}
                  className={styles.spinner}
                  aria-hidden="true"
                />
              ) : null}
              {PLAN_SELECTION.intend}
            </Button>
          )}
          <Button
            variant="ghostEmber"
            size="lg"
            className={styles.secondary}
            onClick={() => onViewRoute(plan.id)}
          >
            <Icon name="map-pin" size={16} aria-hidden="true" />
            {multi ? "Ver recorrido" : "Ver en el mapa"}
          </Button>
        </div>

        {refinement ? (
          <div className={styles.refine}>
            <p className={styles.refineLabel}>¿Lo ajustamos?</p>
            {refinement}
          </div>
        ) : null}
      </div>
    </article>
  );
}
