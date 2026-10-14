import { expect, test } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";

let errors: string[];
test.beforeEach(({ page }) => {
  errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
});
test.afterEach(() => expect(errors).toEqual([]));

test("las variantes elevan dificultad y conservan intentos al recargar", async ({ page }) => {
  await page.goto("practica/");
  await page.getByRole("button", { name: "Generar ejercicio", exact: true }).click();
  for (let i = 0; i < 3; i++) {
    const prompt = await page.locator("form .tool-explanation").innerText();
    const [initial, final, pip] = prompt.match(/-?\d+(?:,\d+)?/g)!.map(value => Number(value.replace(",", ".")));
    await page.getByLabel("Tu respuesta (pips)").fill(String(Math.round((final - initial) / pip)));
    await page.getByRole("button", { name: "Corregir respuesta", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Respuesta correcta");
    if (i < 2) await page.getByRole("button", { name: "Generar otro ejercicio" }).click();
  }
  await expect(page.getByText("DIFICULTAD 2 / 3")).toBeVisible();
  await page.reload();
  await expect(page.getByText("DIFICULTAD 2 / 3")).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(3);
});

test("simula una operación, la cierra, guarda la sesión y la envía al diario", async ({ page }) => {
  await page.goto("simulador/");
  await page.getByRole("button", { name: "Iniciar simulación" }).click();
  await page.getByLabel("Stop loss (opcional)").fill("1");
  await page.getByLabel("Take profit (opcional)").fill("1.2");
  await page.getByRole("button", { name: "Enviar orden de práctica" }).click();
  await expect(page.getByRole("heading", { name: "Órdenes pendientes · 1", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Posiciones abiertas · 0", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Siguiente vela", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Posiciones abiertas · 1", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Cerrar en próxima apertura" }).click();
  await page.getByRole("button", { name: "Siguiente vela", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Posiciones abiertas · 0", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Cierre manual", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Enviar al diario" }).click();
  await expect(page.getByRole("status")).toContainText("Operación enviada al diario");
  await page.getByRole("button", { name: "Guardar sesión", exact: true }).click();
  await expect(page.getByRole("button", { name: "Abrir sesión", exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Abrir sesión", exact: true }).click();
  await expect(page.getByRole("cell", { name: "Cierre manual", exact: true })).toBeVisible();
  await mkdir("artifacts", { recursive: true });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path: "artifacts/simulator.png", fullPage: true, animations: "disabled" });
  await page.goto("diario/");
  await expect(page.getByRole("cell", { name: /Práctica en simulador/ })).toBeVisible();
  await page.goto("ajustes/");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar copia JSON", exact: true }).click();
  const file = await downloadPromise;
  const backup = JSON.parse(await readFile((await file.path())!, "utf8"));
  expect(backup.tables.demoTrades).toHaveLength(1);
  expect(backup.tables.journalEntries).toHaveLength(1);
});

test("replay importa CSV y revela solo las velas alcanzadas", async ({ page }) => {
  await page.goto("replay/");
  await page.locator(".data-panel summary").click();
  await page.getByLabel("Fuente y permiso de uso del CSV").fill("Serie sintética propia para E2E");
  const csv = "time,open,high,low,close\n" + Array.from({ length: 5 }, (_, i) => `2024-01-01T0${i}:00:00Z,1.1,1.101,1.099,1.1`).join("\n");
  await page.getByLabel("Importar datos CSV").setInputFiles({ name: "prueba.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await expect(page.locator(".data-panel summary")).toContainText("prueba.csv");
  await page.getByLabel("Primera decisión (fecha y hora UTC)").fill("2024-01-01T00:00");
  await page.getByRole("button", { name: "Iniciar replay" }).click();
  const chart = page.getByRole("img", { name: "Solo velas reveladas; precios medios" });
  await expect(chart.locator("title")).toHaveCount(1);
  await page.getByRole("button", { name: "Siguiente vela", exact: true }).click();
  await expect(chart.locator("title")).toHaveCount(2);
  await expect(chart.locator("title").last()).toContainText("2024-01-01T01:00");
  await page.getByText("Marcar soportes y resistencias", { exact: true }).click();
  await page.getByLabel("Precio de la línea", { exact: true }).fill("1.099");
  await page.getByRole("button", { name: "Añadir línea", exact: true }).click();
  await page.getByRole("button", { name: "Guardar sesión", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "Abrir sesión", exact: true }).click();
  await expect(chart.locator("title")).toHaveCount(2);
  await expect(chart.getByText("Soporte", { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path: "artifacts/replay-mobile.png", fullPage: true, animations: "disabled" });
});

test("backtesting calcula, guarda y reproduce un experimento", async ({ page }) => {
  await page.goto("backtesting/");
  await page.getByRole("button", { name: "Ejecutar backtest", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Resultados del experimento", exact: true })).toBeVisible();
  const netRow = page.getByRole("row").filter({ has: page.getByRole("rowheader", { name: "Resultado neto (USD)", exact: true }) });
  const results = await netRow.innerText();
  await page.getByRole("button", { name: "Guardar experimento", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Experimento guardado");
  await page.reload();
  await page.getByRole("button", { name: "Recuperar parámetros y datos", exact: true }).click();
  await page.getByRole("button", { name: "Ejecutar backtest", exact: true }).click();
  await expect(netRow).toHaveText(results, { useInnerText: true });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path: "artifacts/backtesting.png", fullPage: true, animations: "disabled" });
});
