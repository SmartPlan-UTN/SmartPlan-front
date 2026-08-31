"use client";

import Image from "next/image";

import { Icon } from "@/components/ui";

import { Reveal } from "./Reveal";
import { SHOWCASE, type ShowcasePlan } from "./landingContent";
import { MEDIA } from "./landingMedia";
import styles from "./showcase.module.css";

/**
 * What an answer looks like.
 *
 * The brief for this section asked for "what people are discovering".
 * That is not something this product can honestly show: there is no live
 * catalogue behind the landing and no verifiable activity to draw on, and
 * `PRODUCT.md` rules out inventing testimonials, counts or user activity
 * outright.
 *
 * So the section keeps the job — return to something visual, show the
 * range of what comes back, make it browsable — and drops the false
 * claim. These are example recorridos, labelled as examples on every
 * card, describing kinds of moment rather than named venues. Nothing here
 * is attributed to a person, priced, or rated.
 *
 * Budget is glyphs rather than a number for the same reason: "$$" is an
 * honest statement about relative cost, and "$14.000" would be a made-up
 * fact.
 */
export function PlanShowcase() {
  return (
    <section className={styles.section} aria-labelledby="showcase-title">
      <div className={styles.shell}>
        <Reveal className={styles.header}>
          <div>
            <h2 id="showcase-title" className={styles.title}>
              {SHOWCASE.title[0]}
              <span className={styles.titleSoft}> {SHOWCASE.title[1]}</span>
            </h2>
          </div>
          <p className={styles.lead}>{SHOWCASE.lead}</p>
        </Reveal>
      </div>

      <Reveal className={styles.railWrap}>
        <ul className={styles.rail} tabIndex={0} aria-label="Ejemplos de recorridos">
          {SHOWCASE.plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </ul>
      </Reveal>
    </section>
  );
}

function PlanCard({ plan }: { plan: ShowcasePlan }) {
  const image = MEDIA[plan.media];

  return (
    <li className={styles.card} data-tone={plan.tone}>
      <article className={styles.cardInner}>
        <div className={styles.media}>
          <div className={styles.mediaField} aria-hidden="true" />

          <Image
            src={image.src}
            alt={image.alt}
            fill
            sizes="(max-width: 760px) 82vw, 340px"
            className={styles.mediaPhoto}
            style={image.focus ? { objectPosition: image.focus } : undefined}
          />

          <p className={styles.badge}>{SHOWCASE.badge}</p>
        </div>

        <div className={styles.body}>
          <h3 className={styles.cardTitle}>{plan.title}</h3>

          <p className={styles.meta}>
            <span className={styles.metaItem}>
              <Icon name="clock" size={13} stroke={2} aria-hidden="true" />
              {plan.duration}
            </span>
            <span className={styles.metaDot} aria-hidden="true" />
            <span className={styles.metaItem}>
              <span className={styles.budget} aria-hidden="true">
                {[1, 2, 3].map((level) => (
                  <span
                    key={level}
                    className={styles.budgetMark}
                    data-on={level <= plan.budget ? "true" : undefined}
                  >
                    $
                  </span>
                ))}
              </span>
              <span className="sp-sr-only">
                Nivel de gasto {plan.budget} de 3
              </span>
            </span>
          </p>

          <ol className={styles.moments}>
            {plan.moments.map((moment) => (
              <li key={moment.time} className={styles.moment}>
                <span className={styles.momentTime}>{moment.time}</span>
                <span className={styles.momentLabel}>{moment.label}</span>
              </li>
            ))}
          </ol>

          <ul className={styles.tags}>
            {plan.tags.map((tag) => (
              <li key={tag} className={styles.tag}>
                {tag}
              </li>
            ))}
          </ul>
        </div>
      </article>
    </li>
  );
}
