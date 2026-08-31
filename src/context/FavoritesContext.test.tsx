import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  listFavoriteActivities,
  listFavoritePlans,
  saveFavoriteActivity,
  saveFavoritePlan,
} from "@/lib/api";
import { useSession } from "@/lib/auth";
import { FavoritesProvider, useFavorites } from "./FavoritesContext";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => "/explore",
}));

vi.mock("@/lib/auth", () => ({
  useSession: vi.fn(),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    listFavoriteActivities: vi.fn(),
    saveFavoriteActivity: vi.fn(),
    removeFavoriteActivity: vi.fn(),
    listFavoritePlans: vi.fn(),
    saveFavoritePlan: vi.fn(),
    removeFavoritePlan: vi.fn(),
  };
});

describe("FavoritesContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads saved activity ids on mount when authenticated", async () => {
    vi.mocked(useSession).mockReturnValue({
      authenticated: true,
      status: "authenticated",
      user: {
        id: 1,
        email: "test@example.com",
        name: "Test User",
        role: { id: 1, key: "usuario", name: "Usuario" } as never,
        status: { id: 1, key: "activo", name: "Activo" } as never,
      } as never,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    vi.mocked(listFavoriteActivities).mockResolvedValueOnce({
      data: [
        { id: 10, idFavoriteList: 1, idActivity: 42, createdAt: "", updatedAt: "", deletedAt: null },
        { id: 11, idFavoriteList: 1, idActivity: 99, createdAt: "", updatedAt: "", deletedAt: null },
      ],
      pagination: { total: 2, page: 1, limit: 100, totalPages: 1 },
    });

    const { result } = renderHook(() => useFavorites(), {
      wrapper: ({ children }) => <FavoritesProvider>{children}</FavoritesProvider>,
    });

    await waitFor(() => {
      expect(result.current.isActivitySaved(42)).toBe(true);
    });

    expect(result.current.isActivitySaved(99)).toBe(true);
    expect(result.current.isActivitySaved(123)).toBe(false);
  });

  it("optimistically adds a favorite and reverts on API failure", async () => {
    vi.mocked(useSession).mockReturnValue({
      authenticated: true,
      status: "authenticated",
      user: {
        id: 1,
        email: "test@example.com",
        name: "Test User",
        role: { id: 1, key: "usuario", name: "Usuario" } as never,
        status: { id: 1, key: "activo", name: "Activo" } as never,
      } as never,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    vi.mocked(listFavoriteActivities).mockResolvedValueOnce({
      data: [],
      pagination: { total: 0, page: 1, limit: 100, totalPages: 1 },
    });

    vi.mocked(saveFavoriteActivity).mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useFavorites(), {
      wrapper: ({ children }) => <FavoritesProvider>{children}</FavoritesProvider>,
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isActivitySaved(42)).toBe(false);

    await act(async () => {
      await expect(result.current.toggleSaveActivity(42)).rejects.toThrow("Network error");
    });

    // Rollback: state reverts to false
    expect(result.current.isActivitySaved(42)).toBe(false);
  });

  it("loads saved plan ids on mount when authenticated (CU40)", async () => {
    vi.mocked(useSession).mockReturnValue({
      authenticated: true,
      status: "authenticated",
      user: {
        id: 1,
        email: "test@example.com",
        name: "Test User",
        role: { id: 1, key: "usuario", name: "Usuario" } as never,
        status: { id: 1, key: "activo", name: "Activo" } as never,
      } as never,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    vi.mocked(listFavoriteActivities).mockResolvedValueOnce({
      data: [],
      pagination: { page: 1, limit: 100, total: 0, totalPages: 1 },
    });

    vi.mocked(listFavoritePlans).mockResolvedValueOnce({
      data: [
        { id: 20, idFavoriteList: 1, idPlan: 7, createdAt: "", updatedAt: "", deletedAt: null },
        { id: 21, idFavoriteList: 1, idPlan: 15, createdAt: "", updatedAt: "", deletedAt: null },
      ],
      pagination: { page: 1, limit: 100, total: 2, totalPages: 1 },
    });

    const { result } = renderHook(() => useFavorites(), {
      wrapper: ({ children }) => <FavoritesProvider>{children}</FavoritesProvider>,
    });

    await waitFor(() => {
      expect(result.current.isPlanSaved(7)).toBe(true);
    });

    expect(result.current.isPlanSaved(15)).toBe(true);
    expect(result.current.isPlanSaved(99)).toBe(false);
  });

  it("optimistically adds a favorite plan and reverts on API failure (CU43)", async () => {
    vi.mocked(useSession).mockReturnValue({
      authenticated: true,
      status: "authenticated",
      user: {
        id: 1,
        email: "test@example.com",
        name: "Test User",
        role: { id: 1, key: "usuario", name: "Usuario" } as never,
        status: { id: 1, key: "activo", name: "Activo" } as never,
      } as never,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    vi.mocked(listFavoriteActivities).mockResolvedValueOnce({
      data: [],
      pagination: { page: 1, limit: 100, total: 0, totalPages: 1 },
    });
    vi.mocked(listFavoritePlans).mockResolvedValueOnce({
      data: [],
      pagination: { page: 1, limit: 100, total: 0, totalPages: 1 },
    });

    vi.mocked(saveFavoritePlan).mockRejectedValueOnce(new Error("Plan save failed"));

    const { result } = renderHook(() => useFavorites(), {
      wrapper: ({ children }) => <FavoritesProvider>{children}</FavoritesProvider>,
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isPlanSaved(7)).toBe(false);

    await act(async () => {
      await expect(result.current.toggleSavePlan(7)).rejects.toThrow("Plan save failed");
    });

    // Rollback: state reverts to false
    expect(result.current.isPlanSaved(7)).toBe(false);
  });

  it("redirects unauthenticated users to login on toggle plan", async () => {
    vi.mocked(useSession).mockReturnValue({
      authenticated: false,
      status: "anonymous",
      user: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    const { result } = renderHook(() => useFavorites(), {
      wrapper: ({ children }) => <FavoritesProvider>{children}</FavoritesProvider>,
    });

    let success = false;
    await act(async () => {
      success = await result.current.toggleSavePlan(7);
    });

    expect(success).toBe(false);
    expect(mockPush).toHaveBeenCalledWith("/login?redirect=%2Fexplore");
  });
});
