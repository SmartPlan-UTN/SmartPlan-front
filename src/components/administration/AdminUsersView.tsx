"use client";

import { useEffect, useState } from "react";

import { Pagination } from "@/components/explore";
import { Button, Icon, Select, type IconName } from "@/components/ui";
import { useDebouncedValue } from "@/hooks";
import {
  ApiError,
  changeAdminUserStatus,
  getAdminUserMetrics,
  listAdminUsers,
  updateAdminUser,
} from "@/lib/api";
import type {
  AdminUser,
  AdminUserMetrics,
  AdminUsersQuery,
  AdminUsersResult,
  SortDirection,
  UserStatusKey,
} from "@/types";

import { UserActionsMenu } from "./UserActionsMenu";
import { UserAvatar } from "./UserAvatar";
import { UserReadDialog } from "./UserReadDialog";
import { UserStatusBadge } from "./UserStatusBadge";
import { UserStatusDialog } from "./UserStatusDialog";

import styles from "./administration.module.css";

type StatusFilter = "" | UserStatusKey;
type UserSortField = NonNullable<AdminUsersQuery["sortBy"]>;

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: "", label: "Estado: Todos" },
  { value: "active", label: "Activo" },
  { value: "suspended", label: "Suspendido" },
  { value: "banned", label: "Baneado" },
];

const integerFormatter = new Intl.NumberFormat("es-AR");
const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

interface PendingStatusChange {
  user: AdminUser;
  status: UserStatusKey;
}

function SortableHeading({
  field,
  label,
  activeField,
  direction,
  onSort,
}: {
  field: UserSortField;
  label: string;
  activeField: UserSortField;
  direction: SortDirection;
  onSort: (field: UserSortField) => void;
}) {
  const active = field === activeField;
  return (
    <th aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : "none"}>
      <button
        type="button"
        className={`${styles.sortButton} ${active ? styles.sortButtonActive : ""}`}
        aria-label={`Ordenar por ${label}`}
        onClick={() => onSort(field)}
      >
        {label}
        <Icon
          name="chevron-down"
          size={14}
          className={`${styles.sortIcon} ${active && direction === "asc" ? styles.sortIconAscending : ""}`}
        />
      </button>
    </th>
  );
}

function readableError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.code === "ADMIN_SELF_STATUS_CHANGE") {
      return "No podés suspender ni banear tu propia cuenta.";
    }
    if (error.code === "USER_NOT_FOUND") {
      return "El usuario ya no existe.";
    }
    if (error.isForbidden) {
      return "No tenés permisos para realizar esta acción.";
    }
    if (error.isNetworkError) {
      return "No pudimos conectarnos con el servidor. Reintentá en unos segundos.";
    }
  }
  return fallback;
}

function KpiCard({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: IconName;
  label: string;
  value?: number;
  detail: string;
  tone: "ember" | "success" | "electric";
}) {
  return (
    <article className={styles.kpiCard}>
      <span className={`${styles.kpiIcon} ${styles[`kpiIcon_${tone}`]}`} aria-hidden="true">
        <Icon name={icon} size={22} />
      </span>
      <div>
        <p className={styles.kpiLabel}>{label}</p>
        <p className={styles.kpiValue}>{value === undefined ? "—" : integerFormatter.format(value)}</p>
        <p className={`${styles.kpiDetail} ${styles[`kpiDetail_${tone}`]}`}>{detail}</p>
      </div>
    </article>
  );
}

export function AdminUsersView() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 400);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [sortBy, setSortBy] = useState<UserSortField>("createdAt");
  const [direction, setDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<AdminUsersResult | null>(null);
  const [metrics, setMetrics] = useState<AdminUserMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadSequence, setReloadSequence] = useState(0);
  const [metricsReloadSequence, setMetricsReloadSequence] = useState(0);
  const [pendingChange, setPendingChange] = useState<PendingStatusChange | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [viewingUser, setViewingUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadUsers() {
      setLoading(true);
      setLoadError(false);
      try {
        const users = await listAdminUsers({
          page,
          limit: 20,
          search: debouncedSearch || undefined,
          status: statusFilter || undefined,
          sortBy,
          direction,
        });
        if (!ignore) setResult(users);
      } catch (_error) {
        if (!ignore) setLoadError(true);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    void loadUsers();
    return () => {
      ignore = true;
    };
  }, [debouncedSearch, direction, page, reloadSequence, sortBy, statusFilter]);

  useEffect(() => {
    let ignore = false;

    async function loadMetrics() {
      try {
        const nextMetrics = await getAdminUserMetrics();
        if (!ignore) setMetrics(nextMetrics);
      } catch (_error) {
        if (!ignore) setMetrics(null);
      }
    }

    void loadMetrics();
    return () => {
      ignore = true;
    };
  }, [metricsReloadSequence]);

  function requestStatusChange(user: AdminUser, status: UserStatusKey) {
    setActionError(null);
    setPendingChange({ user, status });
  }

  function changeSort(field: UserSortField) {
    if (field === sortBy) {
      setDirection((current) => current === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setDirection(field === "createdAt" ? "desc" : "asc");
    }
    setPage(1);
  }

  async function confirmStatusChange() {
    if (!pendingChange) return;

    setSaving(true);
    setActionError(null);
    try {
      const updatedUser = await changeAdminUserStatus(
        pendingChange.user.id,
        pendingChange.status,
      );
      setResult((current) => {
        if (!current) return current;
        if (statusFilter && updatedUser.status.key !== statusFilter) {
          return {
            data: current.data.filter((user) => user.id !== updatedUser.id),
            pagination: {
              ...current.pagination,
              total: Math.max(0, current.pagination.total - 1),
            },
          };
        }
        return {
          ...current,
          data: current.data.map((user) =>
            user.id === updatedUser.id ? updatedUser : user,
          ),
        };
      });
      setPendingChange(null);
      setMetricsReloadSequence((current) => current + 1);
      if (statusFilter) setReloadSequence((current) => current + 1);
    } catch (error) {
      setActionError(readableError(error, "No pudimos cambiar el estado de la cuenta."));
    } finally {
      setSaving(false);
    }
  }

  async function saveUser(
    id: number,
    input: Parameters<typeof updateAdminUser>[1],
  ) {
    const updatedUser = await updateAdminUser(id, input);
    setViewingUser(updatedUser);
    setResult((current) => {
      if (!current) return current;
      const leavesFilter = statusFilter && updatedUser.status.key !== statusFilter;
      return {
        ...current,
        data: leavesFilter
          ? current.data.filter((user) => user.id !== updatedUser.id)
          : current.data.map((user) => user.id === updatedUser.id ? updatedUser : user),
        pagination: leavesFilter ? {
          ...current.pagination,
          total: Math.max(0, current.pagination.total - 1),
        } : current.pagination,
      };
    });
    setMetricsReloadSequence((current) => current + 1);
    setReloadSequence((current) => current + 1);
    return updatedUser;
  }

  const users = result?.data ?? [];
  const activePercentage = metrics?.totalUsers
    ? `${Math.round((metrics.activeUsers / metrics.totalUsers) * 100)}% del total`
    : "Cuentas habilitadas";
  const firstVisible = result && result.pagination.total > 0
    ? (result.pagination.page - 1) * result.pagination.limit + 1
    : 0;
  const lastVisible = result ? firstVisible + result.data.length - 1 : 0;

  return (
    <section className={styles.screen} aria-busy={loading}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>
          <Icon name="users" size={14} />
          Comunidad
        </p>
        <h1 className={`sp-h2 ${styles.title}`}>Administración de Usuarios</h1>
        <p className={`sp-body ${styles.subtitle}`}>
          Gestioná las cuentas registradas en la plataforma.
        </p>
      </header>

      <div className={styles.kpiGrid} aria-label="Métricas de usuarios">
        <KpiCard
          icon="users"
          tone="ember"
          label="Total de usuarios"
          value={metrics?.totalUsers}
          detail="Cuentas registradas"
        />
        <KpiCard
          icon="circle-check"
          tone="success"
          label="Usuarios activos"
          value={metrics?.activeUsers}
          detail={activePercentage}
        />
        <KpiCard
          icon="calendar"
          tone="electric"
          label="Nuevos registros (semana)"
          value={metrics?.newUsersThisWeek}
          detail="Últimos 7 días"
        />
      </div>

      <div className={styles.toolbar}>
        <label className={styles.searchField}>
          <span className="sp-sr-only">Buscar por nombre o correo</span>
          <Icon name="search" size={17} aria-hidden="true" />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Buscar por nombre o correo..."
          />
        </label>
        <div className={styles.statusFilter}>
          <Select
            aria-label="Filtrar por estado"
            value={statusFilter}
            options={STATUS_OPTIONS}
            onChange={(value) => {
              setStatusFilter(value);
              setPage(1);
            }}
          />
        </div>
      </div>

      <div className={styles.tableCard}>
        {loadError && !result ? (
          <div className={styles.state} role="alert">
            <span className={styles.stateIcon} aria-hidden="true">
              <Icon name="triangle-alert" size={24} />
            </span>
            <strong>No pudimos cargar los usuarios</strong>
            <p>Revisá tu conexión y volvé a intentar.</p>
            <Button
              variant="ghostLight"
              size="sm"
              onClick={() => setReloadSequence((current) => current + 1)}
            >
              Reintentar
            </Button>
          </div>
        ) : loading && !result ? (
          <div className={styles.state} role="status">
            <Icon name="loader-circle" className="sp-spin" size={28} />
            <p>Cargando usuarios...</p>
          </div>
        ) : users.length === 0 ? (
          <div className={styles.state}>
            <span className={styles.stateIcon} aria-hidden="true">
              <Icon name="search" size={24} />
            </span>
            <strong>Sin resultados</strong>
            <p>Probá ajustar la búsqueda o el filtro de estado.</p>
          </div>
        ) : (
          <>
            {loadError ? (
              <div className={styles.inlineError} role="alert">
                No pudimos actualizar los resultados. Se muestran los últimos datos disponibles.
              </div>
            ) : null}
            <div className={`${styles.tableScroll} ${loading ? styles.tableLoading : ""}`}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <SortableHeading field="name" label="Usuario" activeField={sortBy} direction={direction} onSort={changeSort} />
                    <SortableHeading field="email" label="Correo electrónico" activeField={sortBy} direction={direction} onSort={changeSort} />
                    <SortableHeading field="role" label="Rol" activeField={sortBy} direction={direction} onSort={changeSort} />
                    <SortableHeading field="createdAt" label="Fecha de registro" activeField={sortBy} direction={direction} onSort={changeSort} />
                    <SortableHeading field="status" label="Estado" activeField={sortBy} direction={direction} onSort={changeSort} />
                    <th className={styles.actionsHeading}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className={styles.userCellContainer}>
                        <button
                          type="button"
                          className={styles.userCell}
                          aria-label={`Ver detalle de ${user.name} ${user.lastName}`}
                          onClick={() => setViewingUser(user)}
                        >
                          <UserAvatar name={user.name} lastName={user.lastName} userId={user.id} />
                          <span>{user.name} {user.lastName}</span>
                        </button>
                      </td>
                      <td className={styles.secondaryCell}>{user.email}</td>
                      <td><span className={styles.roleBadge}>{user.role.name}</span></td>
                      <td className={styles.secondaryCell}>{dateFormatter.format(new Date(user.createdAt))}</td>
                      <td><UserStatusBadge status={user.status.key} /></td>
                      <td className={styles.actionsColumn}>
                        <span className={styles.actionsCell}>
                          <UserActionsMenu user={user} onSelect={requestStatusChange} />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {result && result.pagination.total > 0 ? (
        <div className={styles.paginationArea}>
          <p>
            Mostrando {firstVisible}–{lastVisible} de {integerFormatter.format(result.pagination.total)} usuarios
          </p>
          <Pagination
            page={result.pagination.page}
            totalPages={result.pagination.totalPages}
            disabled={loading}
            onPageChange={setPage}
          />
        </div>
      ) : null}

      {viewingUser ? (
        <UserReadDialog
          user={viewingUser}
          onClose={() => setViewingUser(null)}
          onSave={saveUser}
        />
      ) : null}

      {pendingChange ? (
        <UserStatusDialog
          user={pendingChange.user}
          status={pendingChange.status}
          saving={saving}
          error={actionError}
          onCancel={() => {
            if (!saving) setPendingChange(null);
          }}
          onConfirm={() => void confirmStatusChange()}
        />
      ) : null}
    </section>
  );
}
