import { expect, test, type Page } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { firstLesson } from "../../src/modules/academy/content";

const lessonPath = `academia/${firstLesson.slug}/`;
let runtimeProblems: string[] = [];

test.beforeEach(async ({ page }) => {
  runtimeProblems = [];
  page.on("pageerror", error => runtimeProblems.push(error.message));
  page.on("console", message => { if (message.type() === "error") runtimeProblems.push(message.text()); });
  page.on("request", request => {
    if (/\/api\//.test(new URL(request.url()).pathname)) runtimeProblems.push(`API retirada: ${request.url()}`);
  });
  page.on("response", response => {
    if (response.status() >= 400) runtimeProblems.push(`Recurso ${response.status()}: ${response.url()}`);
  });
});
test.afterEach(() => { expect(runtimeProblems, "Sin errores de consola, APIs ni recursos fallidos").toEqual([]); });

async function answerAssessment(page: Page, correctNumerical: boolean) {
  for (const [index, question] of firstLesson.questions.entries()) {
    const group = page.locator("fieldset").nth(index);
    if (question.type === "number") {
      const answer = correctNumerical ? String(question.answer).replace(".", ",") : "950";
      await group.getByRole("textbox").fill(answer);
    } else {
      const optionIndex = question.options!.indexOf(String(question.answer));
      await group.getByRole("radio").nth(optionIndex).check();
    }
  }
  await page.getByRole("button", { name: "Corregir y guardar respuestas" }).click();
}

async function completeFirstLesson(page: Page) {
  await page.goto(lessonPath);
  await expect(page.getByRole("heading", { name: firstLesson.title, exact: true })).toBeVisible();
  await answerAssessment(page, true);
  await expect(page.getByRole("heading", { name: "Evaluación superada" })).toBeVisible();
  await page.getByRole("checkbox", { name: "He estudiado la explicación y revisado mis respuestas." }).check();
  await page.getByRole("button", { name: "Completar lección" }).click();
  await expect(page.getByRole("heading", { name: "Lección completada" })).toBeVisible();
}

async function saveSettings(page: Page, name = "Ana de prueba", goal = "5") {
  await page.goto("ajustes/");
  await page.getByRole("textbox", { name: /¿Cómo te llamas\?/ }).fill(name);
  await page.getByRole("radio", { name: goal, exact: true }).check();
  await page.getByRole("button", { name: "Guardar mi plan" }).click();
  await expect(page.getByText("Tu plan de estudio se ha guardado.", { exact: true })).toBeVisible();
}

test("carga el export estático y navega por rutas reales bajo /forextrd/", async ({ page, request }) => {
  await page.goto("./");
  await expect(page.getByRole("heading", { name: "Cada paso cuenta." })).toBeVisible();
  await expect(page.getByText("0/1 lección publicada", { exact: true })).toBeVisible();
  await expect(page.getByText("0 evaluaciones realizadas", { exact: true })).toBeVisible();
  expect(await page.evaluate(async () => (await indexedDB.databases()).some(database => database.name === "forex-academy-pro"))).toBe(true);
  await mkdir(join(process.cwd(), "artifacts"), { recursive: true });
  await page.screenshot({ path: "artifacts/dashboard.png", fullPage: true, animations: "disabled" });

  await page.getByRole("link", { name: "Academia", exact: true }).click();
  await expect(page).toHaveURL(/\/forextrd\/academia\/$/);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.goto(lessonPath);
  await page.reload();
  await expect(page.getByRole("heading", { name: firstLesson.title, exact: true })).toBeVisible();

  const redirect = await request.get("academia", { maxRedirects: 0 });
  expect([301, 308]).toContain(redirect.status());
  expect(new URL(redirect.headers().location, page.url()).pathname).toBe("/forextrd/academia/");
  expect((await request.get("ruta-inexistente/")).status()).toBe(404);
  expect((await request.get("%2e%2e/package.json")).status()).toBe(404);
});

test("corrige, exige el cálculo y conserva intentos y finalización en IndexedDB", async ({ page }) => {
  await page.goto(lessonPath);
  await expect(page.getByRole("heading", { name: firstLesson.title, exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Completar lección" })).toBeDisabled();
  await answerAssessment(page, false);
  await expect(page.getByRole("heading", { name: "Cada intento también enseña" })).toBeVisible();
  await expect(page.getByText("Revisa este concepto", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Completar lección" })).toBeDisabled();

  await page.goto("progreso/");
  await expect(page.getByText("4 de 5 respuestas correctas.", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Cálculo del poder adquisitivo/ })).toBeVisible();
  await page.goto(lessonPath);
  await page.reload();
  await expect(page.getByRole("button", { name: "Completar lección" })).toBeDisabled();
  await answerAssessment(page, true);
  await expect(page.getByRole("heading", { name: "Evaluación superada" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Completar lección" })).toBeDisabled();
  await page.getByRole("checkbox", { name: "He estudiado la explicación y revisado mis respuestas." }).check();
  await page.getByRole("button", { name: "Completar lección" }).click();
  await expect(page.getByRole("heading", { name: "Lección completada" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Lección completada" })).toBeVisible();

  await page.getByRole("link", { name: "Ver mi progreso", exact: true }).click();
  await expect(page).toHaveURL(/\/forextrd\/progreso\/$/);
  await expect(page.getByText("DEMOSTRADA", { exact: true })).toBeVisible();
  await expect(page.getByText("9 de 10 respuestas correctas.", { exact: true })).toBeVisible();
  await page.goto("./");
  await expect(page.getByText("1/1 lección publicada", { exact: true })).toBeVisible();
  await expect(page.getByText("Primera lección superada", { exact: true })).toBeVisible();
});

test("guarda ajustes y tema y conserva navegación móvil", async ({ page }) => {
  await saveSettings(page);
  await page.getByRole("button", { name: "Activar modo claro" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.getByRole("textbox", { name: /¿Cómo te llamas\?/ })).toHaveValue("Ana de prueba");
  await expect(page.getByRole("radio", { name: "5", exact: true })).toBeChecked();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./");
  await expect(page.getByRole("heading", { name: "Hola, Ana de prueba." })).toBeVisible();
  const openMenu = page.getByRole("button", { name: "Abrir menú" });
  await openMenu.click();
  await expect(openMenu).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("link", { name: "Academia", exact: true }).click();
  await expect(page).toHaveURL(/\/forextrd\/academia\/$/);
  await expect(openMenu).toHaveAttribute("aria-expanded", "false");
  await page.getByRole("button", { name: "Activar modo oscuro" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.goto("./");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("heading", { name: "Hola, Ana de prueba." })).toBeVisible();
  await mkdir(join(process.cwd(), "artifacts"), { recursive: true });
  await page.screenshot({ path: "artifacts/mobile.png", fullPage: true, animations: "disabled" });
});

test("exporta, restablece y restaura una copia solo después de previsualizar y confirmar", async ({ page }, testInfo) => {
  await completeFirstLesson(page);
  await saveSettings(page, "Perfil de copia", "4");
  await page.getByRole("button", { name: "Activar modo claro" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar copia JSON" }).click();
  const download = await downloadEvent;
  const backupPath = testInfo.outputPath("academy-backup.json");
  await download.saveAs(backupPath);
  const backup = JSON.parse(await readFile(backupPath, "utf8"));
  expect(backup).toMatchObject({ format: "forex-academy-pro", version: 1 });
  expect(backup.tables.profile[0].name).toBe("Perfil de copia");
  expect(backup.tables.attempts).toHaveLength(1);

  await page.getByRole("button", { name: "Restablecer datos", exact: true }).click();
  await expect(page.getByRole("button", { name: "Confirmar restablecimiento" })).toBeDisabled();
  await page.getByRole("checkbox", { name: "Confirmo que quiero borrar todos mis datos locales." }).check();
  await page.getByRole("button", { name: "Confirmar restablecimiento" }).click();
  await expect(page.getByRole("textbox", { name: /¿Cómo te llamas\?/ })).toHaveValue("Estudiante");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.goto("./");
  await expect(page.getByText("0/1 lección publicada", { exact: true })).toBeVisible();
  await expect(page.getByText("0 evaluaciones realizadas", { exact: true })).toBeVisible();

  await page.goto("ajustes/");
  await page.getByLabel("Seleccionar copia JSON", { exact: true }).setInputFiles(backupPath);
  await expect(page.getByRole("heading", { name: "Previsualización de la copia" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Restaurar copia" })).toBeDisabled();
  await expect(page.getByRole("textbox", { name: /¿Cómo te llamas\?/ })).toHaveValue("Estudiante");
  await page.getByRole("checkbox", { name: "Confirmo que quiero sustituir mis datos por esta copia." }).check();
  await page.getByRole("button", { name: "Restaurar copia" }).click();
  await expect(page.getByText("Copia restaurada. Tu progreso y tus preferencias ya están disponibles.", { exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: /¿Cómo te llamas\?/ })).toHaveValue("Perfil de copia");
  await expect(page.getByRole("radio", { name: "4", exact: true })).toBeChecked();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.getByRole("textbox", { name: /¿Cómo te llamas\?/ })).toHaveValue("Perfil de copia");
  await page.goto("./");
  await expect(page.getByText("1/1 lección publicada", { exact: true })).toBeVisible();
  await page.goto(lessonPath);
  await expect(page.getByRole("heading", { name: "Lección completada" })).toBeVisible();
});

test("rechaza JSON corrupto y versiones incompatibles sin cambiar los datos", async ({ page }) => {
  await saveSettings(page, "Conservar este perfil", "6");
  const upload = page.getByLabel("Seleccionar copia JSON", { exact: true });
  for (const [name, text] of [
    ["corrupto.json", "{ este archivo no es JSON"],
    ["version-futura.json", JSON.stringify({ format: "forex-academy-pro", version: 999, tables: {} })],
  ]) {
    await upload.setInputFiles({ name, mimeType: "application/json", buffer: Buffer.from(text) });
    // Next also has an ARIA route announcer. Assert this feature's error,
    // not any unrelated alert in the application shell.
    await expect(page.getByRole("region", { name: "Tus datos, contigo" }).getByRole("alert")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Previsualización de la copia" })).toHaveCount(0);
    await expect(page.getByRole("textbox", { name: /¿Cómo te llamas\?/ })).toHaveValue("Conservar este perfil");
    await expect(page.getByRole("radio", { name: "6", exact: true })).toBeChecked();
  }
  await page.reload();
  await expect(page.getByRole("textbox", { name: /¿Cómo te llamas\?/ })).toHaveValue("Conservar este perfil");
  await expect(page.getByRole("radio", { name: "6", exact: true })).toBeChecked();
});
