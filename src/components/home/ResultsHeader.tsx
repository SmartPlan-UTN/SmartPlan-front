"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import { Icon } from "@/components/ui";
import type {
  MissingContext,
  PlanRequestContext,
  PlanUnderstanding,
  UnderstandingChip,
} from "@/types";

import styles from "./results-header.module.css";

export interface ResultsHeaderProps {
  query: string;
  understanding: PlanUnderstanding | null;
  /** The plan is still being built: chips are shown as they resolve. */
  thinking?: boolean;
  /** Where the context offered so far came from: shown as already set. */
  onBack: () => void;
  /** Run the (edited) idea again. */
  onSearch: (query: string) => void;
  /** Add one piece of optional context and run the same idea again. */
  onAddContext: (context: Partial<PlanRequestContext>) => void;
}

const MISSING_LABEL: Record<MissingContext, string> = {
  when: "Cuándo",
  budget: "Presupuesto",
  party: "Con quién",
};

const WHEN_OPTIONS = [
  { value: "morning", label: "Por la mañana" },
  { value: "afternoon", label: "A la tarde" },
  { value: "evening", label: "A la noche" },
  { value: "night", label: "De madrugada" },
] as const;

const BUDGET_OPTIONS = [20000, 40000, 80000, 150000];

const PARTY_OPTIONS = [
  { value: 1, label: "Solo" },
  { value: 2, label: "Dos" },
  { value: 3, label: "Tres" },
  { value: 4, label: "Cuatro" },
  { value: 6, label: "Seis" },
] as const;

const arsFormat = new Intl.NumberFormat("es-AR");

function chipTitle(chip: UnderstandingChip): string | undefined {
  if (chip.source === "profile") return "Tomado de tu perfil";
  if (chip.source === "inferred") return "Lo deduje de lo que escribiste";
  if (chip.source === "model") return "Lo entendí de tus palabras";
  return undefined;
}

function Chip({ chip, index }: { chip: UnderstandingChip; index: number }) {
  return (
    <li
      className={[
        styles.chip,
        chip.polarity === "avoid" ? styles.chipAvoid : "",
        chip.source === "inferred" ? styles.chipInferred : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ ["--i" as string]: index }}
      title={chipTitle(chip)}
    >
      {chip.icon ? (
        <span className={styles.chipIcon} aria-hidden="true">
          {chip.icon}
        </span>
      ) : null}
      <span>{chip.label}</span>
      {chip.source === "profile" ? (
        <span className={styles.chipSource}>de tu perfil</span>
      ) : null}
      {chip.source === "inferred" ? (
        <span className={styles.chipSource}>deducido</span>
      ) : null}
    </li>
  );
}

/** A small panel to give one optional piece of context. */
function ContextAction({
  kind,
  index,
  onAddContext,
}: {
  kind: MissingContext;
  index: number;
  onAddContext: ResultsHeaderProps["onAddContext"];
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const rootRef = useRef<HTMLLIElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | globalThis.KeyboardEvent) => {
      if (event instanceof globalThis.KeyboardEvent) {
        if (event.key === "Escape") setOpen(false);
        return;
      }
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  function choose(context: Partial<PlanRequestContext>) {
    setOpen(false);
    onAddContext(context);
  }

  function submitAmount(event: FormEvent) {
    event.preventDefault();
    const value = Number(amount.replace(/\D/g, ""));
    if (value >= 1000) choose({ budget: value });
  }

  return (
    <li
      ref={rootRef}
      className={styles.missingItem}
      style={{ ["--i" as string]: index }}
    >
      <button
        type="button"
        className={styles.missing}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name="plus" size={13} aria-hidden="true" />
        {MISSING_LABEL[kind]}
      </button>
      {open ? (
        <div id={panelId} className={styles.panel} role="group" aria-label={MISSING_LABEL[kind]}>
          {kind === "when"
            ? WHEN_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={styles.option}
                  onClick={() => choose({ timeOfDay: option.value })}
                >
                  {option.label}
                </button>
              ))
            : null}
          {kind === "party"
            ? PARTY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={styles.option}
                  onClick={() => choose({ partySize: option.value })}
                >
                  {option.label}
                </button>
              ))
            : null}
          {kind === "budget" ? (
            <>
              {BUDGET_OPTIONS.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={styles.option}
                  onClick={() => choose({ budget: value })}
                >
                  Hasta ${arsFormat.format(value)}
                </button>
              ))}
              <form className={styles.amount} onSubmit={submitAmount}>
                <label className="sp-sr-only" htmlFor={`${panelId}-amount`}>
                  Otro monto en pesos
                </label>
                <input
                  id={`${panelId}-amount`}
                  inputMode="numeric"
                  placeholder="Otro monto"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
                <button type="submit" disabled={Number(amount.replace(/\D/g, "")) < 1000}>
                  Listo
                </button>
              </form>
            </>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

/** The chips of what was understood, plus the context still unknown. */
export function UnderstandingChips({
  chips,
  missing,
  onAddContext,
}: {
  chips: UnderstandingChip[];
  missing: MissingContext[];
  onAddContext: ResultsHeaderProps["onAddContext"];
}) {
  return (
    <ul className={styles.chips}>
      {chips.map((chip, index) => (
        <Chip
          key={`${chip.key}-${chip.id ?? chip.label}`}
          chip={chip}
          index={index}
        />
      ))}
      {missing.map((kind, index) => (
        <ContextAction
          key={kind}
          kind={kind}
          index={chips.length + index}
          onAddContext={onAddContext}
        />
      ))}
    </ul>
  );
}

/**
 * The top of the results: the person's own sentence, big and editable, and
 * under it what SmartPlan understood from it — as chips that name the
 * person's words ("Fachero", "Tranqui"), say when something was deduced or
 * taken from their profile, and never show a default as if they had said
 * it. What is still unknown is offered as optional context, not faked.
 */
export function ResultsHeader({
  query,
  understanding,
  thinking = false,
  onBack,
  onSearch,
  onAddContext,
}: ResultsHeaderProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const value = draft ?? query;
  const dirty = draft !== null && draft.trim() !== query.trim() && draft.trim() !== "";
  const chips = understanding?.chips ?? [];
  const missing = understanding?.missing ?? [];

  // The sentence is a headline: it grows with its content.
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.style.height = "auto";
    input.style.height = `${input.scrollHeight}px`;
  }, [value]);

  function submit(event?: FormEvent) {
    event?.preventDefault();
    if (!dirty) return;
    onSearch(value.trim());
    setDraft(null);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <header className={styles.header}>
      <button type="button" className={styles.back} onClick={onBack}>
        <Icon name="arrow-left" size={16} aria-hidden="true" />
        Inicio
      </button>

      <form className={styles.request} onSubmit={submit}>
        <label className="sp-sr-only" htmlFor="results-request">
          Tu idea
        </label>
        <textarea
          id="results-request"
          ref={inputRef}
          rows={1}
          value={value}
          maxLength={500}
          spellCheck
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          className={styles.requestInput}
        />
        <button
          type="submit"
          className={styles.searchAgain}
          data-visible={dirty}
          tabIndex={dirty ? 0 : -1}
          aria-hidden={!dirty}
        >
          <Icon name="sparkles" size={15} aria-hidden="true" />
          Buscar de nuevo
        </button>
      </form>

      {!thinking && understanding?.unmapped?.length ? (
        <p className={styles.unmapped} role="status">
          <Icon name="info" size={15} aria-hidden="true" />
          <span>
            No supe ubicar{" "}
            {understanding.unmapped.map((word) => `«${word}»`).join(" ")}
            . Te muestro ideas generales: contame de otra forma y lo afino.
          </span>
        </p>
      ) : null}

      {chips.length || thinking ? (
        <section className={styles.understanding} aria-label="Lo que entendí">
          <p className={styles.eyebrow}>
            {chips.length ? "Entendí la idea" : "Leyendo tu idea…"}
          </p>
          {chips.length ? (
            <UnderstandingChips
              chips={chips}
              missing={missing}
              onAddContext={onAddContext}
            />
          ) : (
            <span className={styles.reading} aria-hidden="true" />
          )}
        </section>
      ) : null}
    </header>
  );
}
