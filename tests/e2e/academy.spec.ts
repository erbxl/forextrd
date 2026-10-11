import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { firstLesson } from "../../src/modules/academy/content";
import type { ProgressSnapshot } from "../../src/modules/progress/types";

const lessonPath = `/academia/${firstLesson.slug}`;
const completePath = `/api/lessons/${firstLesson.slug}/complete`;
const origin = "http://127.0.0.1:3100";

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

test.describe.serial("academia local sobre SQLite aislado", () => {
  test("comienza sin actividad y protege la finalización y el origen", async ({ page, request }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Cada paso cuenta." })).toBeVisible();
    await expect(page.getByText("0/1 lección publicada", { exact: true })).toBeVisible();
    await expect(page.getByText("0 evaluaciones realizadas", { exact: true })).toBeVisible();

    const freshResponse = await request.get("/api/progress");
    expect(freshResponse.status()).toBe(200);
    const fresh: ProgressSnapshot = await freshResponse.json();
    expect(fresh.stats).toMatchObject({ completedLessons: 0, totalAttempts: 0, studySeconds: 0, accuracy: null });

    const early = await request.post(completePath, { headers: { Origin: origin }, data: { read: true } });
    expect(early.status()).toBe(409);
    const forged = await request.patch("/api/settings", {
      headers: { Origin: "https://another-origin.example" },
      data: { name: "Cambio rechazado", weeklyGoal: 7 },
    });
    expect(forged.status()).toBe(403);
    const unchanged: ProgressSnapshot = await (await request.get("/api/progress")).json();
    expect(unchanged.user.name).toBe("Estudiante");
    expect(unchanged.stats.completedLessons).toBe(0);

    await mkdir(join(process.cwd(), "artifacts"), { recursive: true });
    await page.screenshot({ path: "artifacts/dashboard.png", fullPage: true, animations: "disabled" });
  });

  test("guarda un intento fallido, exige el cálculo y conserva la lección completada", async ({ page, request }) => {
    await page.goto(lessonPath);
    await expect(page.getByRole("heading", { name: firstLesson.title, exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Completar lección" })).toBeDisabled();

    await answerAssessment(page, false);
    await expect(page.getByRole("heading", { name: "Cada intento también enseña" })).toBeVisible();
    await expect(page.getByText("Revisa este concepto", { exact: true })).toBeVisible();
    const failed: ProgressSnapshot = await (await request.get("/api/progress")).json();
    expect(failed.stats).toMatchObject({ totalAttempts: 1, answeredQuestions: 5, correctAnswers: 4, completedLessons: 0 });
    expect(failed.lessons[0]).toMatchObject({ passed: false, bestScore: 80 });
    expect(failed.weaknesses).toContainEqual({ concept: "Cálculo del poder adquisitivo", incorrectCount: 1 });

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

    const completed: ProgressSnapshot = await (await request.get("/api/progress")).json();
    expect(completed.stats).toMatchObject({ completedLessons: 1, totalAttempts: 2, answeredQuestions: 10, correctAnswers: 9 });
    expect(completed.lessons[0].completedAt).toBeTruthy();
    await page.getByRole("link", { name: "Ver mi progreso", exact: true }).click();
    await expect(page).toHaveURL(/\/progreso$/);
    await expect(page.getByRole("heading", { name: "Lo que sabes. Lo que sigue." })).toBeVisible();
    await expect(page.getByText("DEMOSTRADA", { exact: true })).toBeVisible();
    await expect(page.getByText("9 de 10 respuestas correctas.", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /Cálculo del poder adquisitivo/ })).toBeVisible();
    await page.goto("/");
    await expect(page.getByText("1/1 lección publicada", { exact: true })).toBeVisible();
    await expect(page.getByText("Primera lección superada", { exact: true })).toBeVisible();
  });

  test("conserva nombre y objetivo semanal desde los ajustes", async ({ page, request }) => {
    await page.goto("/ajustes");
    await page.getByRole("textbox", { name: /¿Cómo te llamas\?/ }).fill("Ana de prueba");
    await page.getByRole("radio", { name: "5", exact: true }).check();
    const savedResponse = page.waitForResponse(response => response.url().endsWith("/api/settings") && response.request().method() === "PATCH");
    await page.getByRole("button", { name: "Guardar mi plan" }).click();
    expect((await savedResponse).status()).toBe(200);
    await expect(page.getByRole("status")).toHaveText("Tu plan de estudio se ha guardado.");
    await page.reload();
    await expect(page.getByRole("textbox", { name: /¿Cómo te llamas\?/ })).toHaveValue("Ana de prueba");
    await expect(page.getByRole("radio", { name: "5", exact: true })).toBeChecked();
    const saved: ProgressSnapshot = await (await request.get("/api/progress")).json();
    expect(saved.user).toEqual({ name: "Ana de prueba", weeklyGoal: 5 });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Hola, Ana de prueba." })).toBeVisible();
  });

  test("permite navegar en móvil y conserva la selección del tema", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const openMenu = page.getByRole("button", { name: "Abrir menú" });
    await openMenu.click();
    await expect(openMenu).toHaveAttribute("aria-expanded", "true");
    await page.getByRole("link", { name: "Academia", exact: true }).click();
    await expect(page).toHaveURL(/\/academia$/);
    await expect(openMenu).toHaveAttribute("aria-expanded", "false");
    await page.getByRole("button", { name: "Activar modo claro" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.getByRole("button", { name: "Activar modo oscuro" }).click();
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await mkdir(join(process.cwd(), "artifacts"), { recursive: true });
    await page.screenshot({ path: "artifacts/mobile.png", fullPage: true, animations: "disabled" });
  });
});
