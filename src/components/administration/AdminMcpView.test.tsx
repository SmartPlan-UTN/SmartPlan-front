import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createMcpKey, listMcpKeys, listMcpTools, revokeMcpKey } from "@/lib/api";
import type { McpKey } from "@/types";

import { AdminMcpView, schemaType } from "./AdminMcpView";

vi.mock("@/lib/api", () => ({
  ApiError: class ApiError extends Error {},
  createMcpKey: vi.fn(),
  getApiBaseUrl: () => "https://api.example.com/api",
  listMcpKeys: vi.fn(),
  listMcpTools: vi.fn(),
  revokeMcpKey: vi.fn(),
}));

function mcpKey(overrides: Partial<McpKey> = {}): McpKey {
  return {
    id: 3,
    name: "bot-actividades",
    prefix: "smp_mcp_ab",
    active: true,
    createdAt: "2026-10-20T12:00:00.000Z",
    lastUsedAt: null,
    revokedAt: null,
    ...overrides,
  };
}

describe("AdminMcpView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listMcpKeys).mockResolvedValue([mcpKey()]);
    vi.mocked(listMcpTools).mockResolvedValue([
      {
        name: "upsert_activity",
        description: "Crea o actualiza una actividad.",
        inputSchema: {
          type: "object",
          properties: {
            placeId: { type: "string", description: "Google place_id" },
            tags: { type: "array", items: { type: "string" } },
          },
          required: ["placeId"],
        },
      },
    ]);
  });

  it("shows connection info, keys and tools with their parameters", async () => {
    render(<AdminMcpView />);
    expect(screen.getByText("POST https://api.example.com/api/mcp")).toBeInTheDocument();
    expect(await screen.findByText("bot-actividades")).toBeInTheDocument();
    expect(screen.getByText("Nunca")).toBeInTheDocument();
    expect(await screen.findByText("upsert_activity")).toBeInTheDocument();
    expect(screen.getByText("Google place_id")).toBeInTheDocument();
    expect(screen.getByText("string[]")).toBeInTheDocument();
  });

  it("generates a key, shows it once and copies it", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    vi.mocked(createMcpKey).mockResolvedValue({ ...mcpKey({ id: 9, name: "nuevo" }), key: "smp_mcp_secret" });
    render(<AdminMcpView />);

    await user.type(screen.getByLabelText(/Nombre del bot/), "  nuevo ");
    await user.click(screen.getByRole("button", { name: /Generar clave/ }));

    expect(createMcpKey).toHaveBeenCalledWith("nuevo");
    expect(await screen.findByLabelText("Clave generada")).toHaveTextContent("smp_mcp_secret");
    expect(screen.getByText(/no se vuelve a mostrar/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Copiar/ }));
    expect(writeText).toHaveBeenCalledWith("smp_mcp_secret");

    await user.click(screen.getByRole("button", { name: /ocultar/ }));
    expect(screen.queryByText("smp_mcp_secret")).not.toBeInTheDocument();
  });

  it("validates an empty name without calling the API", async () => {
    const user = userEvent.setup();
    render(<AdminMcpView />);
    await user.click(screen.getByRole("button", { name: /Generar clave/ }));
    expect(screen.getByText(/de 1 a 100 caracteres/)).toBeInTheDocument();
    expect(createMcpKey).not.toHaveBeenCalled();
  });

  it("revokes a key after confirmation", async () => {
    const user = userEvent.setup();
    vi.mocked(revokeMcpKey).mockResolvedValue();
    render(<AdminMcpView />);

    await user.click(await screen.findByRole("button", { name: "Revocar bot-actividades" }));
    const dialog = screen.getByRole("alertdialog");
    expect(revokeMcpKey).not.toHaveBeenCalled();
    vi.mocked(listMcpKeys).mockResolvedValue([mcpKey({ active: false, revokedAt: "2026-10-21T00:00:00.000Z" })]);
    await user.click(within(dialog).getByRole("button", { name: "Revocar" }));

    await waitFor(() => expect(revokeMcpKey).toHaveBeenCalledWith(3));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Revocar bot-actividades" })).not.toBeInTheDocument());
    expect(screen.getByText("Revocada", { selector: "span" })).toBeInTheDocument();
  });
});

describe("schemaType", () => {
  it("describes enums, unions and formats", () => {
    expect(schemaType({ enum: ["draft", "public"] })).toBe('"draft" | "public"');
    expect(schemaType({ anyOf: [{ type: "number" }, { type: "null" }] })).toBe("number | null");
    expect(schemaType({ type: "string", format: "uri" })).toBe("string (uri)");
    expect(schemaType({})).toBe("any");
  });
});
