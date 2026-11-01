"use client";

import { useEffect, useRef, useState } from "react";
import { Select } from "@/components/ui";
import { getOuting } from "@/lib/api";
import { stopLabel } from "@/lib/plans/stops";
import type {
  OutingDetail,
  StopFeedbackPayload,
  StopFeedbackReport,
  StopFeedbackTag,
} from "@/types";
import { parseCostAmount } from "./ActivityCostsField";
import styles from "./stop-feedback.module.css";

const TAGS: Array<[StopFeedbackTag, string]> = [
  ["romantic", "Romántico"],
  ["quiet", "Tranquilo"],
  ["lively", "Animado"],
  ["good_for_groups", "Ideal con amigos"],
  ["good_value", "Buena relación precio/calidad"],
  ["premium", "Premium"],
  ["family_friendly", "Ideal en familia"],
  ["view", "Buena vista"],
];
type Draft = {
  status: "" | "DONE" | "SKIPPED";
  report: "" | StopFeedbackReport;
  amount: string;
  tags: StopFeedbackTag[];
};
const empty = (): Draft => ({ status: "", report: "", amount: "", tags: [] });

export function StopFeedbackFields({
  outingId,
  disabled,
  onChange,
  onInvalidChange,
  revealInvalid = 0,
}: {
  outingId: number;
  disabled: boolean;
  onChange: (value: StopFeedbackPayload[]) => void;
  onInvalidChange: (invalid: boolean) => void;
  /** Bumped by the parent when a submit was blocked by an invalid amount. */
  revealInvalid?: number;
}) {
  const panel = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(false);
  const [outing, setOuting] = useState<OutingDetail | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  // A blocked submit must show the problem even when the section is closed.
  useEffect(() => {
    if (revealInvalid === 0 || !panel.current) return;
    panel.current.open = true;
    const frame = requestAnimationFrame(() => {
      panel.current
        ?.querySelector<HTMLInputElement>('[aria-invalid="true"]')
        ?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [revealInvalid]);
  useEffect(() => {
    if (!open || outing) return;
    let active = true;
    void getOuting(outingId)
      .then((value) => {
        if (active) setOuting(value);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [open, outingId, outing, attempt]);

  function update(detailId: number, patch: Partial<Draft>) {
    const next = {
      ...drafts,
      [detailId]: { ...(drafts[detailId] ?? empty()), ...patch },
    };
    setDrafts(next);
    onInvalidChange(
      Object.values(next).some(
        (value) =>
          value.amount.trim() !== "" && parseCostAmount(value.amount) === null,
      ),
    );
    onChange(
      Object.entries(next).flatMap(([id, value]) => {
        const amount = parseCostAmount(value.amount);
        if (
          !value.status &&
          !value.report &&
          !value.tags.length &&
          amount === null
        )
          return [];
        return [
          {
            detailId: Number(id),
            ...(value.status ? { status: value.status } : {}),
            ...(value.report ? { report: value.report } : {}),
            ...(value.tags.length ? { tags: value.tags } : {}),
            ...(amount === null ? {} : { amount }),
          },
        ];
      }),
    );
  }

  return (
    <details
      ref={panel}
      className={styles.panel}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>Cómo salió cada parada (opcional)</summary>
      <p>Marcá solo lo que quieras contarnos.</p>
      {open && !outing && !failed ? (
        <p role="status">Cargando paradas…</p>
      ) : null}
      {failed && !outing ? (
        <div role="status">
          <p>
            No pudimos cargar las paradas. Podés enviar el resto de tu opinión.
          </p>
          <button
            type="button"
            onClick={() => {
              setFailed(false);
              setAttempt((value) => value + 1);
            }}
          >
            Reintentar
          </button>
        </div>
      ) : null}
      {outing
        ? [...outing.details]
            .sort((a, b) => a.order - b.order)
            .map((detail) => {
              const value = drafts[detail.id] ?? empty();
              const label = stopLabel(detail);
              const amountError =
                value.amount.trim() !== "" &&
                parseCostAmount(value.amount) === null;
              return (
                <fieldset
                  key={detail.id}
                  disabled={disabled}
                  className={styles.stop}
                >
                  <legend>{label}</legend>
                  <Select
                    aria-label={`Cómo salió ${label}`}
                    value={value.status}
                    onChange={(status) => update(detail.id, { status })}
                    options={[
                      { value: "", label: "Sin indicar" },
                      { value: "DONE", label: "La hicimos" },
                      { value: "SKIPPED", label: "La salteamos" },
                    ]}
                    disabled={disabled}
                  />
                  {!detail.activity ? (
                    <label>
                      Gasto del grupo en esta parada
                      <input
                        inputMode="decimal"
                        value={value.amount}
                        maxLength={16}
                        aria-invalid={amountError}
                        onChange={(event) =>
                          update(detail.id, { amount: event.target.value })
                        }
                        placeholder="Opcional"
                      />
                      {amountError ? (
                        <span role="alert">
                          Ingresá un importe válido mayor a cero.
                        </span>
                      ) : null}
                    </label>
                  ) : null}
                  <div
                    className={styles.tags}
                    role="group"
                    aria-label={`Qué destacó en ${label}`}
                  >
                    {TAGS.map(([tag, text]) => (
                      <button
                        type="button"
                        key={tag}
                        aria-pressed={value.tags.includes(tag)}
                        disabled={
                          disabled ||
                          (!value.tags.includes(tag) && value.tags.length >= 4)
                        }
                        onClick={() =>
                          update(detail.id, {
                            tags: value.tags.includes(tag)
                              ? value.tags.filter((item) => item !== tag)
                              : [...value.tags, tag],
                          })
                        }
                      >
                        {text}
                      </button>
                    ))}
                  </div>
                  <Select
                    aria-label={`Reportar un dato de ${label}`}
                    value={value.report}
                    onChange={(report) => update(detail.id, { report })}
                    disabled={disabled}
                    options={[
                      { value: "", label: "¿Hubo un dato incorrecto?" },
                      { value: "CLOSED", label: "El lugar estaba cerrado" },
                      {
                        value: "WRONG_HOURS",
                        label: "El horario era incorrecto",
                      },
                      {
                        value: "WRONG_PRICE",
                        label: "El precio era incorrecto",
                      },
                      {
                        value: "NO_LONGER_OFFERED",
                        label: "Ya no ofrecen esto",
                      },
                    ]}
                  />
                </fieldset>
              );
            })
        : null}
    </details>
  );
}
