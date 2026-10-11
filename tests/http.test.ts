import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { answersSchema, apiResponse, completionSchema, guardRequest, readJson, settingsSchema, studySchema } from "@/lib/http";
import { proxy } from "@/proxy";

function request(body: string, extraHeaders: Record<string, string> = {}) {
  return new Request("http://127.0.0.1:3000/api/settings", {
    method: "PATCH", body,
    headers: { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000", "content-type": "application/json", ...extraHeaders },
  });
}

describe("límites y protección de la API local", () => {
  it.each(["127.0.0.1:3000", "localhost:3000", "[::1]:3000"])("el proxy permite el Host local %s", (host) => {
    const incoming = new NextRequest(`http://${host}/academia`, { headers: { host } });
    expect(proxy(incoming).headers.get("x-middleware-next")).toBe("1");
  });

  it.each(["/", "/academia/dinero-y-poder-adquisitivo", "/api/progress", "/_next/static/app.js"])("el proxy bloquea Host remoto en %s", (path) => {
    const remote = new NextRequest(`http://attacker.example${path}`, { headers: { host: "attacker.example" } });
    const response = proxy(remote);
    expect(response.status).toBe(403);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("el proxy rechaza Host ausente, URL discordante y sufijos que imitan localhost", () => {
    for (const incoming of [
      new NextRequest("http://127.0.0.1:3000/"),
      new NextRequest("http://127.0.0.1:3000/", { headers: { host: "localhost:3000" } }),
      new NextRequest("http://localhost.attacker.example/", { headers: { host: "localhost.attacker.example" } }),
    ]) expect(proxy(incoming).status).toBe(403);
  });

  it("acepta loopback y origen idéntico", () => {
    expect(() => guardRequest(request("{}"), "test-local")).not.toThrow();
  });

  it("rechaza origen ajeno, ausente y discrepancias del Host", () => {
    expect(() => guardRequest(request("{}", { origin: "https://example.com" }), "test-origin")).toThrow("origen");
    const missingOrigin = request("{}");
    missingOrigin.headers.delete("origin");
    expect(() => guardRequest(missingOrigin, "test-missing-origin")).toThrow("origen");
    expect(() => guardRequest(request("{}", { host: "attacker.example" }), "test-host")).toThrow("locales");
    expect(() => guardRequest(request("{}", { "sec-fetch-site": "cross-site" }), "test-fetch-site")).toThrow("origen");
  });

  it("rechaza también un hostname remoto aunque sus cabeceras coincidan", () => {
    const remote = new Request("https://example.com/api/progress", { headers: { host: "example.com" } });
    expect(() => guardRequest(remote, "test-remote")).toThrow("locales");
  });

  it("aplica el límite por operación y reinicia la ventana", () => {
    guardRequest(request("{}"), "test-rate", 2, 0);
    guardRequest(request("{}"), "test-rate", 2, 0);
    expect(() => guardRequest(request("{}"), "test-rate", 2, 1000)).toThrow("Demasiadas");
    expect(() => guardRequest(request("{}"), "test-rate", 2, 60_000)).not.toThrow();
  });

  it("valida ajustes y rechaza campos inesperados y metas fuera de rango", async () => {
    expect(await readJson(request(JSON.stringify({ name: " Ana ", weeklyGoal: 4 })), settingsSchema))
      .toEqual({ name: "Ana", weeklyGoal: 4 });
    for (const body of [
      { name: "Ana", weeklyGoal: 8 }, { name: "", weeklyGoal: 3 },
      { name: "Ana", weeklyGoal: 3, userId: "otra-persona" },
      { name: "<script>alert(1)</script>", weeklyGoal: 3 },
    ]) {
      await expect(readJson(request(JSON.stringify(body)), settingsSchema)).rejects.toMatchObject({ status: 400 });
    }
  });

  it("no admite notas, aprobación ni tiempos de estudio calculados por el cliente", async () => {
    await expect(readJson(request('{"answers":{"a":"b"},"score":100}'), answersSchema)).rejects.toMatchObject({ status: 400 });
    await expect(readJson(request('{"read":true,"passed":true}'), completionSchema)).rejects.toMatchObject({ status: 400 });
    await expect(readJson(request('{"seconds":999999}'), studySchema)).rejects.toMatchObject({ status: 400 });
  });

  it("controla JSON malformado, tipos de contenido y tamaño real del cuerpo", async () => {
    await expect(readJson(request("{"), settingsSchema)).rejects.toMatchObject({ status: 400 });
    await expect(readJson(request("{}", { "content-type": "text/plain" }), settingsSchema)).rejects.toMatchObject({ status: 415 });
    await expect(readJson(request("x".repeat(16_385), { "content-length": "0" }), settingsSchema)).rejects.toMatchObject({ status: 413 });
    await expect(readJson(request("{}", { "content-length": "999999" }), settingsSchema)).rejects.toMatchObject({ status: 413 });
  });

  it("no filtra errores internos y desactiva el almacenamiento de respuestas", async () => {
    const logging = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const response = await apiResponse(async () => { throw new Error("secret-api-key=private"); });
      expect(response.status).toBe(500);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(await response.text()).not.toContain("private");
      expect(logging.mock.calls.flat().join(" ")).not.toContain("private");
    } finally { logging.mockRestore(); }
  });
});
