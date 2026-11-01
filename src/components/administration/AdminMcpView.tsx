"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

import { Button, ConfirmationDialog, Field, Icon } from "@/components/ui";
import {
  ApiError,
  createMcpKey,
  getApiBaseUrl,
  listMcpKeys,
  listMcpTools,
  revokeMcpKey,
} from "@/lib/api";
import { formatAbsoluteDateTime } from "@/lib/utils";
import type { CreatedMcpKey, McpJsonSchema, McpKey, McpTool } from "@/types";

import shared from "./AdminManagement.module.css";
import styles from "./AdminMcp.module.css";

const NAME_MAX = 100;

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.isForbidden) return "No tenés permisos para administrar el servidor MCP.";
    if (error.status === 404) return "La clave ya no existe. Actualizá el listado.";
    if (error.message) return error.message;
  }
  return fallback;
}

function mcpEndpoint(): string {
  try {
    return `${getApiBaseUrl()}/mcp`;
  } catch {
    return "/api/mcp";
  }
}

/** Human-readable type of a JSON Schema property. */
export function schemaType(schema: McpJsonSchema): string {
  if (Array.isArray(schema.enum)) {
    return schema.enum.map((value) => JSON.stringify(value)).join(" | ");
  }
  const variants = schema.anyOf ?? schema.oneOf;
  if (variants) return variants.map(schemaType).join(" | ");
  const type = Array.isArray(schema.type) ? schema.type.join(" | ") : schema.type;
  if (type === "array" && schema.items) return `${schemaType(schema.items)}[]`;
  if (type && schema.format) return `${type} (${schema.format})`;
  return type ?? "any";
}

function ToolParameters({ schema }: { schema: McpJsonSchema }) {
  const properties = Object.entries(schema.properties ?? {});
  if (properties.length === 0) {
    return <p className={styles.muted}>Sin parámetros.</p>;
  }
  const required = new Set(schema.required ?? []);
  return (
    <table className={styles.paramsTable}>
      <thead>
        <tr>
          <th scope="col">Parámetro</th>
          <th scope="col">Tipo</th>
          <th scope="col">Requerido</th>
          <th scope="col">Descripción</th>
        </tr>
      </thead>
      <tbody>
        {properties.map(([name, property]) => (
          <tr key={name}>
            <td><code>{name}</code></td>
            <td><code>{schemaType(property)}</code></td>
            <td>{required.has(name) ? "Sí" : "No"}</td>
            <td>
              {property.description ?? "—"}
              {property.type === "object" && property.properties ? (
                <div className={styles.nested}>
                  <ToolParameters schema={property} />
                </div>
              ) : null}
              {property.type === "array" && property.items?.properties ? (
                <div className={styles.nested}>
                  <ToolParameters schema={property.items} />
                </div>
              ) : null}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CreatedKeyNotice({ created, onDismiss }: { created: CreatedMcpKey; onDismiss: () => void }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(created.key);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className={styles.createdKey} role="status">
      <p className={styles.createdTitle}>
        <Icon name="triangle-alert" size={16} />
        Clave generada para «{created.name}». Copiala ahora: no se vuelve a mostrar.
      </p>
      <div className={styles.keyRow}>
        <code className={styles.keyValue} aria-label="Clave generada">{created.key}</code>
        <Button type="button" variant="secondary" size="sm" onClick={() => void copy()}>
          <Icon name={copied ? "check" : "list"} size={16} />
          {copied ? "Copiada" : "Copiar"}
        </Button>
      </div>
      <Button type="button" variant="ghost" size="sm" onClick={onDismiss}>
        Ya la guardé, ocultar
      </Button>
    </div>
  );
}

export function AdminMcpView() {
  const [keys, setKeys] = useState<McpKey[] | null>(null);
  const [keysError, setKeysError] = useState<string | null>(null);
  const [tools, setTools] = useState<McpTool[] | null>(null);
  const [toolsError, setToolsError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  // Kept only in component state: never persisted to any storage.
  const [created, setCreated] = useState<CreatedMcpKey | null>(null);

  const [revoking, setRevoking] = useState<McpKey | null>(null);
  const [revokeBusy, setRevokeBusy] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  const loadKeys = useCallback(async () => {
    try {
      setKeys(await listMcpKeys());
      setKeysError(null);
    } catch (error) {
      setKeysError(errorMessage(error, "No pudimos cargar las claves."));
    }
  }, []);

  useEffect(() => {
    void loadKeys();
    listMcpTools()
      .then((result) => setTools(result))
      .catch((error: unknown) => setToolsError(errorMessage(error, "No pudimos cargar las herramientas.")));
  }, [loadKeys]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 1 || trimmed.length > NAME_MAX) {
      setNameError(`Ingresá un nombre de 1 a ${NAME_MAX} caracteres.`);
      return;
    }
    setNameError(null);
    setCreating(true);
    try {
      const result = await createMcpKey(trimmed);
      setCreated(result);
      setName("");
      await loadKeys();
    } catch (error) {
      setNameError(errorMessage(error, "No pudimos generar la clave."));
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke() {
    if (!revoking) return;
    setRevokeBusy(true);
    setRevokeError(null);
    try {
      await revokeMcpKey(revoking.id);
      if (created?.id === revoking.id) setCreated(null);
      setRevoking(null);
      await loadKeys();
    } catch (error) {
      setRevokeError(errorMessage(error, "No pudimos revocar la clave."));
    } finally {
      setRevokeBusy(false);
    }
  }

  const endpoint = mcpEndpoint();

  return (
    <section className={shared.screen} aria-labelledby="mcp-title">
      <div className={shared.headerRow}>
        <div>
          <p className={shared.eyebrow}><Icon name="settings" size={14} />Integraciones</p>
          <h1 id="mcp-title" className={shared.title}>Servidor MCP</h1>
          <p className={shared.subtitle}>
            Claves para que los bots carguen actividades, planes y fotos, y las herramientas que pueden usar.
          </p>
        </div>
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Conexión</h2>
        <dl className={styles.connection}>
          <dt>Endpoint</dt>
          <dd><code>POST {endpoint}</code></dd>
          <dt>Autenticación</dt>
          <dd><code>X-MCP-Key: &lt;clave&gt;</code></dd>
        </dl>
        <p className={styles.muted}>
          Pasá la clave a cada bot por un canal privado y guardala como variable de entorno. Nunca en chats ni repositorios.
        </p>
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Generar clave</h2>
        <form className={styles.createForm} onSubmit={(event) => void handleCreate(event)} noValidate>
          <div className={styles.nameField}>
            <Field
              label="Nombre del bot"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ej.: bot-actividades"
              error={nameError}
              required
              disabled={creating}
              autoComplete="off"
            />
          </div>
          <Button type="submit" disabled={creating}>
            <Icon name="plus" size={16} />
            {creating ? "Generando…" : "Generar clave"}
          </Button>
        </form>
        {created ? <CreatedKeyNotice created={created} onDismiss={() => setCreated(null)} /> : null}
      </div>

      <div className={shared.tableCard}>
        <h2 className={`${styles.cardTitle} ${styles.tableTitle}`}>Claves</h2>
        {keysError ? (
          <div className={shared.state} role="alert">
            <p>{keysError}</p>
            <Button type="button" variant="secondary" size="sm" onClick={() => void loadKeys()}>Reintentar</Button>
          </div>
        ) : keys === null ? (
          <div className={shared.state}>Cargando claves…</div>
        ) : keys.length === 0 ? (
          <div className={shared.state}>Todavía no hay claves generadas.</div>
        ) : (
          <div className={shared.tableScroll}>
            <table className={shared.table}>
              <thead>
                <tr>
                  <th scope="col">Nombre</th>
                  <th scope="col">Prefijo</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Creada</th>
                  <th scope="col">Último uso</th>
                  <th scope="col">Revocada</th>
                  <th scope="col" className={shared.actionsHeading}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((key) => (
                  <tr key={key.id}>
                    <td className={shared.entityName}>{key.name}</td>
                    <td><code>{key.prefix}…</code></td>
                    <td>
                      <span className={key.active ? styles.statusActive : styles.statusRevoked}>
                        {key.active ? "Activa" : "Revocada"}
                      </span>
                    </td>
                    <td>{formatAbsoluteDateTime(key.createdAt)}</td>
                    <td>{key.lastUsedAt ? formatAbsoluteDateTime(key.lastUsedAt) : "Nunca"}</td>
                    <td>{key.revokedAt ? formatAbsoluteDateTime(key.revokedAt) : "—"}</td>
                    <td className={shared.actionsColumn}>
                      {key.active ? (
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          aria-label={`Revocar ${key.name}`}
                          onClick={() => { setRevokeError(null); setRevoking(key); }}
                        >
                          <Icon name="ban" size={16} />
                          Revocar
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Herramientas expuestas</h2>
        {toolsError ? (
          <p role="alert" className={styles.muted}>{toolsError}</p>
        ) : tools === null ? (
          <p className={styles.muted}>Cargando herramientas…</p>
        ) : tools.length === 0 ? (
          <p className={styles.muted}>El servidor no expone herramientas.</p>
        ) : (
          <ul className={styles.toolList}>
            {tools.map((tool) => (
              <li key={tool.name} className={styles.tool}>
                <details>
                  <summary>
                    <code className={styles.toolName}>{tool.name}</code>
                    <span className={styles.toolDescription}>{tool.description ?? "Sin descripción."}</span>
                  </summary>
                  <ToolParameters schema={tool.inputSchema} />
                </details>
              </li>
            ))}
          </ul>
        )}
      </div>

      {revoking ? (
        <ConfirmationDialog
          title="Revocar clave"
          confirmLabel="Revocar"
          confirmingLabel="Revocando…"
          confirmVariant="danger"
          isConfirming={revokeBusy}
          error={revokeError}
          onCancel={() => setRevoking(null)}
          onConfirm={() => void handleRevoke()}
        >
          <p>
            El bot que use «{revoking.name}» ({revoking.prefix}…) va a dejar de poder conectarse al MCP. Esta acción no se puede deshacer.
          </p>
        </ConfirmationDialog>
      ) : null}
    </section>
  );
}
