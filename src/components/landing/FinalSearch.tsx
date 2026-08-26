"use client";

import { useRef } from "react";

import { PlanComposer, SurpriseAction, type PlanComposerHandle } from "@/components/home";
import type { PlanRequestContext } from "@/types";

import { IntentChips } from "./IntentChips";
import { Reveal } from "./Reveal";
import { CLOSING } from "./landingContent";
import styles from "./closing.module.css";

export interface FinalSearchProps {
  sessionLoading: boolean;
  onSubmit: (query: string, context: PlanRequestContext) => void;
  onSurprise: (latitude: number, longitude: number) => void;
}

export const CLOSING_COMPOSER_ID = "closing-composer";

/**
 * The end of the page returns to its beginning.
 *
 * This is a real composer, not a button dressed as one. The previous
 * Home closed with a `<button>` styled like an input that scrolled back
 * to the hero — which works, but asks someone who has just finished
 * reading the whole page to go back to the top before they can act.
 *
 * Because it submits through the same lifted polling state as the hero,
 * generating from here shows the same states in the same place. The two
 * fields are two doors into one interaction, never two competing ones.
 */
export function FinalSearch({ sessionLoading, onSubmit, onSurprise }: FinalSearchProps) {
  const composer = useRef<PlanComposerHandle>(null);

  return (
    <section className={styles.section} aria-labelledby="closing-title">
      <div className={styles.glowTop} aria-hidden="true" />

      <div className={styles.shell}>
        <Reveal className={styles.inner}>
          <p className={`sp-label ${styles.kicker}`}>{CLOSING.kicker}</p>

          <h2 id="closing-title" className={styles.title}>
            {CLOSING.title[0]}
            <span className={styles.titleAccent}> {CLOSING.title[1]}</span>
          </h2>

          <p className={styles.lead}>{CLOSING.lead}</p>

          <div className={styles.composerSlot}>
            <PlanComposer
              ref={composer}
              id={CLOSING_COMPOSER_ID}
              variant="compact"
              submitting={sessionLoading}
              trailing={
                <SurpriseAction submitting={sessionLoading} onSubmit={onSurprise} />
              }
              onSubmit={onSubmit}
            />
          </div>

          <div className={styles.intentsSlot}>
            <IntentChips
              disabled={sessionLoading}
              onPick={(query) => composer.current?.fill(query)}
            />
          </div>

          <p className={styles.hint}>{CLOSING.hint}</p>
        </Reveal>
      </div>
    </section>
  );
}
