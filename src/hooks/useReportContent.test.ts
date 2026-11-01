import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";

import { REPORT_THANKS, useReportContent } from "./useReportContent";

const reportContent = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/api")>()),
  reportContent,
}));

beforeEach(() => vi.clearAllMocks());

describe("useReportContent (#156)", () => {
  it("sends the report with a trimmed detail, only when there is one", async () => {
    reportContent.mockResolvedValue(undefined);
    const { result } = renderHook(() => useReportContent("experience_photo", 9));

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.submit("spam", "   ");
    });
    expect(reportContent).toHaveBeenCalledWith({
      contentType: "experience_photo",
      contentId: 9,
      reason: "spam",
    });
    expect(outcome).toEqual({ done: true, message: REPORT_THANKS });

    await act(async () => {
      await result.current.submit("other", "  Es publicidad. ");
    });
    expect(reportContent).toHaveBeenLastCalledWith({
      contentType: "experience_photo",
      contentId: 9,
      reason: "other",
      detail: "Es publicidad.",
    });
  });

  it("treats content that is gone as done, so it leaves the view", async () => {
    reportContent.mockRejectedValue(
      new ApiError({ message: "gone", type: "HTTP", status: 404, code: "CONTENT_NOT_FOUND" }),
    );
    const { result } = renderHook(() => useReportContent("rating", 1));

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.submit("spam", "");
    });
    expect(outcome).toEqual({ done: true, message: "Este contenido ya no está disponible." });
    expect(result.current.error).toBeNull();
  });

  it("keeps a failure that can be retried", async () => {
    reportContent.mockRejectedValue(
      new ApiError({
        message: "own",
        type: "HTTP",
        status: 403,
        code: "CONTENT_REPORT_OWN_CONTENT",
      }),
    );
    const { result } = renderHook(() => useReportContent("rating", 1));

    await act(async () => {
      await result.current.submit("spam", "");
    });
    expect(result.current.error).toMatchObject({ kind: "own-content" });
    expect(result.current.submitting).toBe(false);
  });
});
