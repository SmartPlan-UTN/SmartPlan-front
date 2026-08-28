"use client";

import { useEffect, useState } from "react";

import { Badge, Button, Icon, type IconName } from "@/components/ui";
import { useSession } from "@/lib/auth";
import { getDashboardMetrics } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils";
import type {
  AuditAction,
  DashboardDistributionEntry,
  DashboardMetrics,
  DashboardPopularActivity,
  DashboardRange,
  DashboardRecentEntry,
} from "@/types";

import styles from "./AdminDashboard.module.css";

type LoadStatus = "loading" | "idle" | "error";

const RANGE_OPTIONS: Array<{ id: DashboardRange; label: string }> = [
  { id: "today", label: "Hoy" },
  { id: "7d", label: "7 días" },
  { id: "30d", label: "30 días" },
  { id: "month", label: "Este mes" },
];

/**
 * Categorical palette for distribution bars whose keys come from an
 * admin-managed catalog (outing types), so they can't be mapped one-to-one
 * the way the fixed group-size buckets below are. Cycled by position.
 */
const DISTRIBUTION_PALETTE = [
  "#3E8BDE",
  "#E85D20",
  "#E8568A",
  "#2CB67D",
  "#9B6BE8",
];

/**
 * `groupSizeDistribution()` in SmartPlan-back always returns these three
 * keys, but its `name` field is hardcoded in English ("Couple", "Small
 * group", "Large group"). Translated here so the panel reads in Spanish
 * like the rest of the product; `sub` mirrors the exact bucket boundaries
 * from that same backend query (`peopleCount <= 2`, `<= 5`, else).
 */
const GROUP_SIZE_LABELS: Record<string, { name: string; sub: string }> = {
  couple: { name: "En pareja", sub: "1–2 personas" },
  "small-group": { name: "Grupo chico", sub: "3–5 personas" },
  "large-group": { name: "Grupo grande", sub: "6+ personas" },
};

const GROUP_SIZE_COLORS: Record<string, string> = {
  couple: "#E85D20",
  "small-group": "#E8A820",
  "large-group": "#9B6BE8",
};

const ENTITY_LABELS: Record<string, string> = {
  user: "Usuario",
  activity: "Actividad",
  plan: "Plan",
  rating: "Valoración",
};

const ENTITY_ICONS: Record<string, IconName> = {
  user: "user",
  activity: "sparkles",
  plan: "map",
  rating: "star",
};

const ENTITY_ACCENTS: Record<string, string> = {
  user: "#2CB67D",
  activity: "#2B5BFF",
  plan: "#E85D20",
  rating: "#C98A00",
};

const ACTION_LABELS: Record<AuditAction, string> = {
  create: "creado",
  update: "actualizado",
  delete: "eliminado",
  start_session: "inició sesión",
  end_session: "cerró sesión",
};

const integerFormatter = new Intl.NumberFormat("es-AR");

function greeting(now: Date): string {
  const hour = now.getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 20) return "Buenas tardes";
  return "Buenas noches";
}

function entryTitle(entry: DashboardRecentEntry): string {
  if (entry.label) return entry.label;
  const entityLabel = ENTITY_LABELS[entry.affectedEntity] ?? entry.affectedEntity;
  return `${entityLabel} #${entry.affectedEntityId}`;
}

function entryMeta(entry: DashboardRecentEntry): string {
  if (entry.action === "start_session") return "Inicio de sesión";
  if (entry.action === "end_session") return "Cierre de sesión";

  const entityLabel = ENTITY_LABELS[entry.affectedEntity] ?? entry.affectedEntity;
  return `${entityLabel} ${ACTION_LABELS[entry.action]}`;
}

function BarRow({
  label,
  sub,
  entry,
  max,
  color,
}: {
  label: string;
  sub?: string;
  entry: DashboardDistributionEntry;
  max: number;
  color: string;
}) {
  const pct = max === 0 ? 0 : Math.round((entry.count / max) * 100);
  return (
    <div className={styles.barRow}>
      <div className={styles.barHead}>
        <span className={styles.barLabel}>
          {label}
          {sub ? <span className={styles.barSub}>{sub}</span> : null}
        </span>
        <span className={styles.barValue} style={{ color }}>
          {entry.percentage}%
        </span>
      </div>
      <div className={styles.barTrack}>
        <div
          className={styles.barFill}
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

interface KpiCardProps {
  icon: IconName;
  accent: string;
  label: string;
  value: string;
  isText?: boolean;
  note?: { text: string; tone: "neutral" | "warning" };
  /** Adds the accent-colored top border used for the range-sensitive row. */
  topBorder?: boolean;
}

function KpiCard({
  icon,
  accent,
  label,
  value,
  isText,
  note,
  topBorder,
}: KpiCardProps) {
  return (
    <div
      className={styles.kpiCard}
      style={topBorder ? { borderTop: `3px solid ${accent}` } : undefined}
    >
      <div className={styles.kpiTop}>
        <span
          className={styles.kpiIcon}
          style={{ background: `${accent}18` }}
        >
          <Icon name={icon} size={20} color={accent} />
        </span>
        {note ? (
          <span
            className={`${styles.kpiNote} ${note.tone === "warning" ? styles.kpiNoteWarning : ""}`}
          >
            {note.tone === "warning" ? (
              <Icon name="triangle-alert" size={13} color="currentColor" />
            ) : null}
            {note.text}
          </span>
        ) : null}
      </div>
      <div
        className={`${styles.kpiValue} ${isText ? styles.kpiValueText : ""}`}
      >
        {value}
      </div>
      <div className={styles.kpiLabel}>{label}</div>
    </div>
  );
}

export function AdminDashboard() {
  const { user } = useSession();
  const [range, setRange] = useState<DashboardRange>("30d");
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [reloadSequence, setReloadSequence] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setStatus("loading");
      try {
        const result = await getDashboardMetrics(range);
        if (ignore) return;
        setMetrics(result);
        setStatus("idle");
      } catch (_error) {
        if (!ignore) setStatus("error");
      }
    }

    void load();
    return () => {
      ignore = true;
    };
  }, [range, reloadSequence]);

  if (status === "loading" && !metrics) {
    return (
      <div className={styles.stateCard} role="status">
        <Icon name="loader-circle" className="sp-spin" size={28} />
        <p>Cargando métricas del panel...</p>
      </div>
    );
  }

  if (status === "error" && !metrics) {
    return (
      <div className={styles.stateCard} role="alert">
        <Icon name="triangle-alert" size={28} />
        <p>No pudimos cargar las métricas del panel.</p>
        <Button
          variant="ghostLight"
          size="sm"
          onClick={() => setReloadSequence((current) => current + 1)}
        >
          Reintentar
        </Button>
      </div>
    );
  }

  if (!metrics) return null;

  const moodMax = Math.max(1, ...metrics.distributions.moods.map((m) => m.count));
  const groupMax = Math.max(
    1,
    ...metrics.distributions.groupSizes.map((g) => g.count),
  );

  return (
    <section aria-busy={status === "loading"}>
      <header className={styles.header}>
        <div>
          <p className={`sp-label ${styles.eyebrow}`}>
            <Icon name="layout-dashboard" size={13} color="var(--fg-3)" />
            Panel de control
          </p>
          <h1 id="admin-dashboard-title" className={`sp-h2 ${styles.title}`}>
            {greeting(new Date())}
            {user ? `, ${user.name}` : ""} 👋
          </h1>
          <p className={`sp-body ${styles.subtitle}`}>
            Resumen general de SmartPlan al día de hoy.
          </p>
        </div>

        <div
          className={styles.rangeGroup}
          role="group"
          aria-label="Rango de fechas"
        >
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`${styles.rangeBtn} ${range === option.id ? styles.rangeBtnActive : ""}`}
              aria-pressed={range === option.id}
              onClick={() => setRange(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </header>

      <p className={`sp-label ${styles.sectionLabel}`}>Estado general</p>
      <div className={styles.kpiGrid}>
        <KpiCard
          icon="users"
          accent="#E85D20"
          value={integerFormatter.format(metrics.kpis.totalUsers)}
          label="Total de Usuarios"
        />
        <KpiCard
          icon="map"
          accent="#22C06B"
          value={integerFormatter.format(metrics.kpis.activePlans)}
          label="Planes Activos"
        />
        <KpiCard
          icon="sparkles"
          accent="#2B5BFF"
          value={integerFormatter.format(metrics.kpis.catalogActivities)}
          label="Actividades en Catálogo"
        />
        <KpiCard
          icon="star"
          accent="#C98A00"
          value={integerFormatter.format(metrics.kpis.pendingRatings)}
          label="Valoraciones Pendientes"
          note={
            metrics.kpis.pendingRatings > 0
              ? { text: "Requiere atención", tone: "warning" }
              : { text: "Al día", tone: "neutral" }
          }
        />
      </div>

      <p className={`sp-label ${styles.sectionLabel}`}>
        Rendimiento del período
      </p>
      <div className={styles.kpiGrid}>
        <KpiCard
          icon="target"
          accent="#2B5BFF"
          value={`${metrics.acceptanceRate}%`}
          label="Tasa de Aceptación"
          topBorder
        />
        <KpiCard
          icon="star"
          accent="#C98A00"
          value={`${metrics.averageRating} / 5`}
          label="Valoración Promedio"
          topBorder
        />
        <KpiCard
          icon="repeat"
          accent="#2CB67D"
          value={`${metrics.retentionRate}%`}
          label="Retención"
          topBorder
        />
      </div>

      <div className={styles.midGrid}>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <span className={styles.panelIcon}>
              <Icon name="heart" size={18} color="var(--ember)" />
            </span>
            <div>
              <h3 className={styles.panelTitle}>Estados de ánimo</h3>
              <p className={styles.panelSubtitle}>% de planes generados</p>
            </div>
          </div>
          {metrics.distributions.moods.length > 0 ? (
            metrics.distributions.moods.map((entry, index) => (
              <BarRow
                key={entry.key}
                label={entry.name}
                entry={entry}
                max={moodMax}
                color={DISTRIBUTION_PALETTE[index % DISTRIBUTION_PALETTE.length]}
              />
            ))
          ) : (
            <p className={styles.emptyRow}>Sin planes generados en el período.</p>
          )}
        </div>

        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <span className={styles.panelIcon}>
              <Icon name="users" size={18} color="var(--ember)" />
            </span>
            <div>
              <h3 className={styles.panelTitle}>Tamaño de grupo</h3>
              <p className={styles.panelSubtitle}>% de planes por personas</p>
            </div>
          </div>
          {metrics.distributions.groupSizes.length > 0 ? (
            <>
              {metrics.distributions.groupSizes.map((entry, index) => (
                <BarRow
                  key={entry.key}
                  label={GROUP_SIZE_LABELS[entry.key]?.name ?? entry.name}
                  sub={GROUP_SIZE_LABELS[entry.key]?.sub}
                  entry={entry}
                  max={groupMax}
                  color={
                    GROUP_SIZE_COLORS[entry.key] ??
                    DISTRIBUTION_PALETTE[index % DISTRIBUTION_PALETTE.length]
                  }
                />
              ))}
              <div className={styles.groupStack}>
                {metrics.distributions.groupSizes.map((entry, index) => (
                  <div
                    key={entry.key}
                    className={styles.groupStackSegment}
                    style={{
                      flex: entry.percentage || 0.001,
                      background:
                        GROUP_SIZE_COLORS[entry.key] ??
                        DISTRIBUTION_PALETTE[index % DISTRIBUTION_PALETTE.length],
                    }}
                    title={`${GROUP_SIZE_LABELS[entry.key]?.name ?? entry.name} ${entry.percentage}%`}
                  />
                ))}
              </div>
            </>
          ) : (
            <p className={styles.emptyRow}>Sin planes generados en el período.</p>
          )}
        </div>

        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <span className={styles.panelIcon} style={{ background: "var(--gold-22)" }}>
              <Icon name="trophy" size={18} color="var(--rating-ink)" />
            </span>
            <div>
              <h3 className={styles.panelTitle}>Actividades más populares</h3>
              <p className={styles.panelSubtitle}>Ranking por planes</p>
            </div>
          </div>
          {metrics.popularActivities.length > 0 ? (
            metrics.popularActivities
              .slice(0, 3)
              .map((activity: DashboardPopularActivity, index) => (
                <div className={styles.topRow} key={activity.id}>
                  <div
                    className={`${styles.rankBadge} ${index === 0 ? styles.rankBadgeFirst : ""}`}
                  >
                    {index + 1}
                  </div>
                  <div className={styles.topBody}>
                    <div className={styles.topName}>{activity.name}</div>
                  </div>
                  <div className={styles.topCount}>
                    <div className={styles.topCountValue}>
                      {activity.planCount}
                    </div>
                    <div className={styles.topCountLabel}>planes</div>
                  </div>
                </div>
              ))
          ) : (
            <p className={styles.emptyRow}>Sin actividades registradas en el período.</p>
          )}
        </div>
      </div>

      <div className={styles.panel}>
        <div className={styles.recentHeader}>
          <h3 className={styles.recentTitle}>Actividad reciente</h3>
          <span className={styles.recentCaption}>
            Últimos {metrics.recentActivity.length} registros
          </span>
        </div>
        {metrics.recentActivity.length > 0 ? (
          metrics.recentActivity.map((entry) => {
            const accent = ENTITY_ACCENTS[entry.affectedEntity] ?? "#5C5448";
            const icon = ENTITY_ICONS[entry.affectedEntity] ?? "info";
            return (
              <div className={styles.recentRow} key={entry.id}>
                <span
                  className={styles.recentIcon}
                  style={{ background: `${accent}18` }}
                >
                  <Icon name={icon} size={18} color={accent} />
                </span>
                <div className={styles.recentBody}>
                  <div className={styles.recentName}>{entryTitle(entry)}</div>
                  <div className={styles.recentMeta}>{entryMeta(entry)}</div>
                </div>
                <Badge variant="tag">
                  {ENTITY_LABELS[entry.affectedEntity] ?? entry.affectedEntity}
                </Badge>
                <span className={styles.recentDate}>
                  {formatRelativeTime(entry.createdAt)}
                </span>
              </div>
            );
          })
        ) : (
          <p className={styles.emptyRow}>Sin actividad reciente.</p>
        )}
      </div>
    </section>
  );
}
