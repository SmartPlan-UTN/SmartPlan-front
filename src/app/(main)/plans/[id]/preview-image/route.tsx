import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { fetchSharedPlan } from "@/lib/plans/sharedPlan";
import { stopLabel } from "@/lib/plans/stops";
import { formatDuration, formatPlanTotal, parsePositiveIntId } from "@/lib/utils";

/**
 * `GET /plans/:id/preview-image` — the card WhatsApp (and any other app
 * reading Open Graph) shows under a shared plan link: the plan's name, its stops, cost and time on the dark
 * hero of the plan detail. A private or missing plan gets the brand alone.
 * Colors are `tokens.css` values: an image has no CSS variables. The text
 * uses the generator's built-in font: it cannot read the brand's variable
 * Bricolage file.
 *
 * A route of its own rather than `opengraph-image.tsx`: Next builds that
 * file's URL on `localhost` in development, which no phone can reach through
 * a tunnel. The page points `og:image` here with the address it was opened on.
 */
const size = { width: 1200, height: 630 };

const CHAR = "#1A1109";
const EMBER = "#E85D20";
const CREAM = "#F5F0E8";
const MAX_STOPS = 4;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const planId = parsePositiveIntId(id);
  const [plan, logo] = await Promise.all([
    planId == null ? null : fetchSharedPlan(planId),
    readFile(join(process.cwd(), "public/brand/logo-full-white.png")),
  ]);
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  const stops = plan
    ? [...plan.details].sort((left, right) => left.order - right.order).map(stopLabel)
    : [];
  const hiddenStops = stops.length - MAX_STOPS;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 72px",
          background: CHAR,
          color: CREAM,
          fontWeight: 600,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders plain <img> */}
        <img src={logoSrc} width={234} height={54} alt="" />

        {plan ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            <div style={{ display: "flex", fontSize: 64, lineHeight: 1.05, maxWidth: 1050 }}>
              {plan.title}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14, fontSize: 28 }}>
              {stops.slice(0, MAX_STOPS).map((name, index) => (
                <div key={index} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  {index > 0 ? <span style={{ color: EMBER }}>→</span> : null}
                  <span>{name}</span>
                </div>
              ))}
              {hiddenStops > 0 ? <span style={{ opacity: 0.7 }}>+{hiddenStops} más</span> : null}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", fontSize: 60, lineHeight: 1.1, maxWidth: 950 }}>
            Armá tu plan según tu presupuesto, tu tiempo y tus ganas.
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 30 }}>
          {plan ? (
            <>
              <span style={{ background: EMBER, color: CHAR, padding: "10px 22px", borderRadius: 999, marginRight: 8 }}>
                {formatPlanTotal(plan)}
              </span>
              <span style={{ display: "flex", gap: 14 }}>
                <span>{formatDuration(plan.estimatedTotalDuration)}</span>
                <span style={{ opacity: 0.7 }}>·</span>
                <span style={{ opacity: 0.7 }}>
                  {`${stops.length} ${stops.length === 1 ? "parada" : "paradas"}`}
                </span>
              </span>
            </>
          ) : (
            <span style={{ color: EMBER }}>Recomendaciones de salidas en Mendoza</span>
          )}
        </div>
      </div>
    ),
    size,
  );
}
