import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { listFavoriteActivities, saveFavoriteActivity } from "@/lib/api";
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
      user: { id: 1, email: "test@example.com", name: "Test User", role: "usuario", status: "activo" },
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    vi.mocked(listFavoriteActivities).mockResolvedValueOnce({
      data: [
        { id: 10, idFavoriteList: 1, idActivity: 42, createdAt: "", updatedAt: "" },
        { id: 11, idFavoriteList: 1, idActivity: 99, createdAt: "", updatedAt: "" },
      ],
      total: 2,
      page: 1,
      limit: 100,
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
      user: { id: 1, email: "test@example.com", name: "Test User", role: "usuario", status: "activo" },
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    vi.mocked(listFavoriteActivities).mockResolvedValueOnce({
      data: [],
      total: 0,
      page: 1,
      limit: 100,
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

  it("redirects unauthenticated users to login on toggle", async () => {
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
      success = await result.current.toggleSaveActivity(42);
    });

    expect(success).toBe(false);
    expect(mockPush).toHaveBeenCalledWith("/login?redirect=%2Fexplore");
  });
});
