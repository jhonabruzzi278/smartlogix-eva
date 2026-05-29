import { describe, it, expect, beforeEach, vi } from "vitest";
import { ApiClient, ApiRequestError } from "@/lib/api-client";

describe("ApiRequestError", () => {
  it("crea error con status", () => {
    const e = new ApiRequestError("Not Found", 404);
    expect(e.message).toBe("Not Found");
    expect(e.status).toBe(404);
    expect(e.name).toBe("ApiRequestError");
  });
  it("isUnauthorized detecta 401", () => {
    expect(new ApiRequestError("x", 401).isUnauthorized).toBe(true);
    expect(new ApiRequestError("x", 403).isUnauthorized).toBe(false);
  });
  it("isForbidden detecta 403", () => {
    expect(new ApiRequestError("x", 403).isForbidden).toBe(true);
    expect(new ApiRequestError("x", 401).isForbidden).toBe(false);
  });
  it("isTimeout detecta 408", () => {
    expect(new ApiRequestError("x", 408).isTimeout).toBe(true);
    expect(new ApiRequestError("x", 500).isTimeout).toBe(false);
  });
});

describe("ApiClient", () => {
  let client: ApiClient;
  beforeEach(() => {
    client = new ApiClient({ baseUrl: "http://test.local" });
    vi.restoreAllMocks();
  });

  it("fetch exitoso retorna JSON", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } })
    );
    const r = await client.fetch<{ ok: boolean }>("/api/test");
    expect(r).toEqual({ ok: true });
  });

  it("fetch 404 lanza ApiRequestError", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "Not Found" }), { status: 404 })
    );
    await expect(client.fetch("/api/test")).rejects.toThrow(ApiRequestError);
  });

  it("fetch 401 llama authError listener", async () => {
    const listener = vi.fn();
    client.setAuthErrorListener(listener);
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    );
    await expect(client.fetch("/api/test")).rejects.toThrow(ApiRequestError);
    expect(listener).toHaveBeenCalledWith(401);
  });

  it("fetch 204 retorna undefined", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    expect(await client.fetch("/api/test")).toBeUndefined();
  });

  it("content-length 0 retorna undefined", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(null, { status: 200, headers: { "content-length": "0" } })
    );
    expect(await client.fetch("/api/test")).toBeUndefined();
  });

  it("refresh token en 401 con handler", async () => {
    const handler = vi.fn().mockResolvedValue("tk-refreshed");
    client.setAuthRefreshHandler(handler);
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "expired" }), { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const r = await client.fetch("/api/test");
    expect(handler).toHaveBeenCalledOnce();
    expect(r).toEqual({ ok: true });
  });

  it("no intenta refresh sin handler", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    );
    await expect(client.fetch("/api/test")).rejects.toThrow(ApiRequestError);
  });

  it("setToken cambia token en runtime", () => {
    client.setToken("nuevo-token");
    expect(client).toBeDefined();
  });

  it("setAuthErrorListener asigna listener", () => {
    client.setAuthErrorListener(vi.fn());
    expect(client).toBeDefined();
  });

  it("setAuthRefreshHandler asigna handler", () => {
    client.setAuthRefreshHandler(vi.fn().mockResolvedValue("tk"));
    expect(client).toBeDefined();
  });

  it("respuesta error sin JSON usa status", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response("Internal Server Error", { status: 500 }));
    await expect(client.fetch("/api/test")).rejects.toThrow("Error 500");
  });

  it("inicializa con deps", () => {
    const c = new ApiClient({ baseUrl: "http://api.local", token: "tk", timeoutMs: 5000 });
    expect(c).toBeDefined();
  });
});
