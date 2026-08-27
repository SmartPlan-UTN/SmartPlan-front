"use client";

import { useRef } from "react";

import { PlanComposer, type PlanComposerHandle } from "@/components/home";
import type { PlanRequestContext } from "@/types";

import { Reveal } from "./Reveal";
import { CLOSING } from "./landingContent";
import styles from "./closing.module.css";

export interface FinalSearchProps {
  sessionLoading: boolean;
  onSubmit: (query: string, context: PlanRequestContext) => void;
}

export const CLOSING_COMPOSER_ID = "closing-composer";

/**
 * The end of the page returns to its beginning — but not identically.
 *
 * The hero is the simple door: write a sentence, or let "Sorpréndeme"
 * decide. Someone who has read the whole page down to here is past that:
 * they know what the product does and are ready to be specific. So this
 * composer is the one that carries the optional context chips (momento,
 * personas, presupuesto) — the precise version, for the visitor who wants
 * to dial it in. The hero never shows them, keeping its promise to be a
 * place to write, not a form.
 *
 * It submits through the same lifted polling state as the hero, so a
 * generation started here shows the same states in the same place.
 */
export function FinalSearch({ sessionLoading, onSubmit }: FinalSearchProps) {
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
              onSubmit={onSubmit}
            />
          </div>

          <p className={styles.hint}>{CLOSING.hint}</p>
        </Reveal>
      </div>
    </section>
  );
}
