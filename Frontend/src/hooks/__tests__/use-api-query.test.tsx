import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useApiQuery } from "@/hooks/use-api-query";
import { ApiRequestError } from "@/lib/api-client";
import type { ApiOrder } from "@/types/api";

const mockOrders: ApiOrder[] = [
  { id: 1, customerId: 10, sku: "COCA-2L", quantity: 5, status: "EN_PREPARACION",
    createdAt: "2026-05-01T10:00:00Z", assignedTo: null, cancelReason: null }
];

describe("useApiQuery", () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it("inicia en estado loading", () => {
    globalThis.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() =>
      useApiQuery({ path: "/api/orders", transform: (d: ApiOrder[]) => d })
    );
    expect(result.current.loading).toBe(true);
    expect(result.current.source).toBe("live");
  });

  it("carga datos éxitosamente", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockOrders), { status: 200, headers: { "Content-Type": "application/json" } })
    );
    const { result } = renderHook(() =>
      useApiQuery({ path: "/api/orders", transform: (d: ApiOrder[]) => d })
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(mockOrders);
    expect(result.current.source).toBe("live");
  });

  it("error de red", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new ApiRequestError("Not Found", 404));
    const { result } = renderHook(() =>
      useApiQuery({ path: "/api/orders", transform: (d: ApiOrder[]) => d })
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.source).toBe("error");
    expect(result.current.error).toBeTruthy();
  });

  it("error 401 muestra sesión expirada", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new ApiRequestError("x", 401));
    const { result } = renderHook(() =>
      useApiQuery({ path: "/api/orders", transform: (d: ApiOrder[]) => d })
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toContain("Sesion expirada");
  });

  it("error 403 muestra permisos", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new ApiRequestError("x", 403));
    const { result } = renderHook(() =>
      useApiQuery({ path: "/api/orders", transform: (d: ApiOrder[]) => d })
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toContain("permisos");
  });

  it("error 408 muestra timeout", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new ApiRequestError("x", 408));
    const { result } = renderHook(() =>
      useApiQuery({ path: "/api/orders", transform: (d: ApiOrder[]) => d })
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toContain("no respondio a tiempo");
  });

  it("no fetch si enabled=false", () => {
    globalThis.fetch = vi.fn();
    const { result } = renderHook(() =>
      useApiQuery({ path: "/api/orders", transform: (d: ApiOrder[]) => d, enabled: false })
    );
    expect(result.current.loading).toBe(false);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
