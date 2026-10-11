import "fake-indexeddb/auto";
import Dexie, { liveQuery } from "dexie";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { firstLesson } from "@/modules/academy/content";
import { evaluateAnswers } from "@/modules/exercises/evaluate";
import { AcademyDatabase, defaultPreferences, defaultProfile, getDatabase, getPreferences,
  initializeDatabase, SCHEMA_V1, updatePreferences } from "@/modules/storage/db";
import type { StoredAttempt } from "@/modules/storage/types";
import { getProgress, updateSettings } from "@/modules/progress/service";

let database: AcademyDatabase;
const instant = new Date("2026-10-11T10:00:00.000Z");

beforeEach(() => { database = new AcademyDatabase(`forex-storage-test-${crypto.randomUUID()}`); });
afterEach(async () => { vi.restoreAllMocks(); vi.unstubAllGlobals(); await database.delete(); });

describe("almacenamiento local versionado", () => {
  it("observa progreso y preferencias juntos como el proveedor del navegador", async () => {
    await initializeDatabase(database, instant);
    const observed = await new Promise<{ progress: Awaited<ReturnType<typeof getProgress>>; preferences: { theme: "dark" | "light" } }>((resolve, reject) => {
      const subscription = liveQuery(async () => ({ progress: await getProgress(database, instant), preferences: await getPreferences(database) }))
        .subscribe({ next: (value) => { subscription.unsubscribe(); resolve(value); }, error: reject });
    });
    expect(observed.progress.user.name).toBe("Estudiante");
    expect(observed.preferences.theme).toBe("dark");
  });

  it("la consulta observable reacciona a cambios reales de perfil y tema", async () => {
    await initializeDatabase(database, instant);
    let initialized!: () => void;
    let updated!: () => void;
    let failed!: (error: unknown) => void;
    const initial = new Promise<void>((resolve) => { initialized = resolve; });
    const changed = new Promise<void>((resolve, reject) => { updated = resolve; failed = reject; });
    const subscription = liveQuery(async () => ({ progress: await getProgress(database, instant), preferences: await getPreferences(database) }))
      .subscribe({
        next: (value) => {
          initialized();
          if (value.progress.user.name === "Cambio observable" && value.preferences.theme === "light") updated();
        }, error: failed,
      });
    try {
      await initial;
      await updateSettings({ name: "Cambio observable", weeklyGoal: 4 }, database);
      await updatePreferences({ theme: "light" }, database);
      await changed;
    } finally { subscription.unsubscribe(); }
  });

  it("las consultas no inicializan ni inventan un perfil dentro de liveQuery", async () => {
    await expect(getProgress(database, instant)).rejects.toThrow("Inicializa");
    await expect(getPreferences(database)).rejects.toThrow("Inicializa");
    expect(await database.profile.count()).toBe(0);
    expect(await database.preferences.count()).toBe(0);
  });
  it("inicializa una sola vez sin sobrescribir preferencias ni perfil", async () => {
    await initializeDatabase(database, instant);
    await database.profile.update("local-student", { name: "María", weeklyGoal: 6 });
    await updatePreferences({ theme: "light" }, database);
    await initializeDatabase(database, new Date("2026-11-01T10:00:00Z"));
    expect(await database.profile.count()).toBe(1);
    expect(await database.profile.get("local-student")).toMatchObject({ name: "María", weeklyGoal: 6, createdAt: instant.toISOString() });
    expect(await getPreferences(database)).toEqual({ theme: "light" });
    expect(await database.lessonProgress.count()).toBe(1);
  });

  it("conserva el tema anterior de localStorage únicamente al inicializar", async () => {
    vi.stubGlobal("window", { localStorage: { getItem: () => "light" } });
    await initializeDatabase(database, instant);
    expect(await getPreferences(database)).toEqual({ theme: "light" });
    await updatePreferences({ theme: "dark" }, database);
    await initializeDatabase(database);
    expect(await getPreferences(database)).toEqual({ theme: "dark" });
  });

  it("migra v1 a v2 sin perder perfil, preferencias, progreso, intentos o datos reservados", async () => {
    database.close();
    const old = new Dexie(database.name);
    old.version(1).stores(SCHEMA_V1);
    const answers = Object.fromEntries(firstLesson.questions.map((question) => [question.id, question.answer]));
    answers[firstLesson.questions.find((question) => question.type === "number")!.id] = -1234;
    const attempt: StoredAttempt = {
      ...evaluateAnswers(firstLesson, answers), answers, id: "old-attempt", lessonSlug: firstLesson.slug, createdAt: instant.toISOString(),
    };
    await old.table("profile").add({ ...defaultProfile(instant), name: "Datos anteriores", weeklyGoal: 5 });
    await old.table("preferences").add(defaultPreferences(instant, "light"));
    await old.table("lessonProgress").add({ lessonSlug: firstLesson.slug, readAt: instant.toISOString(), completedAt: null });
    await old.table("attempts").add(attempt);
    await old.table("journalEntries").add({ id: "reserved", createdAt: instant.toISOString(), updatedAt: instant.toISOString(), metadata: { note: "Registro de migración" } });
    old.close();
    await database.open();
    await initializeDatabase(database);
    expect(database.verno).toBe(2);
    expect(await database.profile.get("local-student")).toMatchObject({ name: "Datos anteriores", weeklyGoal: 5 });
    expect(await getPreferences(database)).toEqual({ theme: "light" });
    expect(await database.attempts.get("old-attempt")).toEqual(attempt);
    expect(await database.lessonProgress.get(firstLesson.slug)).toMatchObject({ readAt: instant.toISOString() });
    expect(await database.reviewConcepts.count()).toBe(1);
    expect((await database.reviewConcepts.toArray())[0].incorrectCount).toBe(1);
    expect(await database.journalEntries.count()).toBe(1);
  });

  it("rechaza un tema inválido sin sustituir la preferencia guardada", async () => {
    await initializeDatabase(database, instant);
    await expect(updatePreferences({ theme: "invalid" as "dark" }, database)).rejects.toThrow("tema válido");
    expect(await getPreferences(database)).toEqual({ theme: "dark" });
  });

  it("permite importar el módulo sin IndexedDB pero informa al intentar abrirlo", () => {
    vi.stubGlobal("indexedDB", undefined);
    expect(() => getDatabase()).toThrow("IndexedDB habilitado");
  });

  it("explica un fallo de apertura sin inventar un estado de progreso", async () => {
    vi.spyOn(database, "open").mockRejectedValueOnce(new Error("SecurityError"));
    await expect(initializeDatabase(database)).rejects.toThrow("permisos del navegador");
  });
});
