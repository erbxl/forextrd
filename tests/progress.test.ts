import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { firstLesson, lessons } from "@/modules/academy/content";
import { AcademyDatabase, initializeDatabase } from "@/modules/storage/db";
import { completeLesson, getProgress, madridDate, recordStudy, saveAttempt, updateSettings } from "@/modules/progress/service";

let client: AcademyDatabase;
const instant = new Date("2026-10-11T10:00:00.000Z");
const secondsAfter = (seconds: number) => new Date(instant.getTime() + seconds * 1000);
const correctAnswers = () => Object.fromEntries(firstLesson.questions.map((question) => [question.id, question.answer]));

beforeEach(async () => {
  client = new AcademyDatabase(`forex-progress-test-${crypto.randomUUID()}`);
  await initializeDatabase(client, instant);
});
afterEach(async () => { vi.restoreAllMocks(); await client.delete(); });

describe("progreso persistente en IndexedDB", () => {
  it("empieza en cero y cuenta todo el programa publicado", async () => {
    const snapshot = await getProgress(client, instant);
    expect(snapshot.stats).toEqual({
      completedLessons: 0, publishedLessons: lessons.length, completedModules: 0, totalAttempts: 0, answeredQuestions: 0,
      correctAnswers: 0, accuracy: null, studySeconds: 0, streak: 0, weeklyStudyDays: 0,
    });
    expect(snapshot.activity).toHaveLength(7);
    expect(snapshot.activity[0].date).toBe("2026-10-05");
    expect(snapshot.lessons[0]).toMatchObject({ passed: false, completedAt: null, attemptsCount: 0 });
  });

  it("no completa sin aprobar y exige el reconocimiento de lectura", async () => {
    await expect(completeLesson(firstLesson.slug, true, client, instant)).rejects.toThrow("Aprueba");
    await saveAttempt(firstLesson.slug, correctAnswers(), client, instant);
    await expect(completeLesson(firstLesson.slug, false, client, instant)).rejects.toThrow("Confirma");
    expect((await getProgress(client, instant)).stats.completedLessons).toBe(0);
  });

  it("guarda respuestas, explicaciones, errores y totales calculados por el motor", async () => {
    const answers = correctAnswers();
    const numerical = firstLesson.questions.find((question) => question.type === "number")!;
    answers[numerical.id] = -1234;
    const result = await saveAttempt(firstLesson.slug, answers, client, instant);
    expect(result.passed).toBe(false);
    const saved = await client.attempts.get(result.id);
    expect(saved?.answers).toEqual(answers);
    expect(saved?.feedback).toHaveLength(firstLesson.questions.length);
    expect(saved?.feedback.find((outcome) => outcome.questionId === numerical.id))
      .toMatchObject({ correct: false, concept: numerical.concept, explanation: numerical.explanation });
    const snapshot = await getProgress(client, instant);
    expect(snapshot.stats.answeredQuestions).toBe(firstLesson.questions.length);
    expect(snapshot.stats.correctAnswers).toBe(firstLesson.questions.length - 1);
    expect(snapshot.weaknesses).toContainEqual({ concept: numerical.concept, incorrectCount: 1 });
    expect(snapshot.activity[6].attempts).toBe(1);
    await expect(completeLesson(firstLesson.slug, true, client, instant)).rejects.toThrow("Aprueba");
  });

  it("rechaza lecciones desconocidas y respuestas incompletas sin crear intentos", async () => {
    await expect(saveAttempt("inexistente", correctAnswers(), client)).rejects.toThrow("disponible");
    await expect(saveAttempt(firstLesson.slug, {}, client)).rejects.toThrow("preguntas");
    expect(await client.attempts.count()).toBe(0);
  });

  it("completar es idempotente y repasar después de aprobar conserva la competencia", async () => {
    await saveAttempt(firstLesson.slug, correctAnswers(), client, instant);
    const first = await completeLesson(firstLesson.slug, true, client, instant);
    const second = await completeLesson(firstLesson.slug, true, client, secondsAfter(60));
    expect(second).toEqual(first);
    const answers = correctAnswers();
    const numerical = firstLesson.questions.find((question) => question.type === "number")!;
    answers[numerical.id] = -1234;
    await saveAttempt(firstLesson.slug, answers, client, secondsAfter(90));
    const snapshot = await getProgress(client, instant);
    expect(snapshot.stats.completedLessons).toBe(1);
    expect(snapshot.lessons[0]).toMatchObject({ passed: true, bestScore: 100, attemptsCount: 2 });
    expect(snapshot.activity[6]).toMatchObject({ attempts: 2, completions: 1 });
  });

  it("inicializar de nuevo conserva ajustes y progreso; otra conexión los recupera", async () => {
    await updateSettings({ name: "Ana", weeklyGoal: 5 }, client);
    await saveAttempt(firstLesson.slug, correctAnswers(), client, instant);
    await completeLesson(firstLesson.slug, true, client, instant);
    await initializeDatabase(client, secondsAfter(120));
    client.close();
    const reopened = new AcademyDatabase(client.name);
    try {
      const snapshot = await getProgress(reopened, instant);
      expect(snapshot.user).toEqual({ name: "Ana", weeklyGoal: 5 });
      expect(snapshot.stats).toMatchObject({ completedLessons: 1, totalAttempts: 1 });
    } finally { reopened.close(); }
  });

  it("calcula días Madrid, racha y objetivo semanal de lunes a domingo", async () => {
    expect(madridDate(new Date("2026-10-10T22:30:00.000Z"))).toBe("2026-10-11");
    expect(madridDate(new Date("2026-10-25T23:30:00.000Z"))).toBe("2026-10-26");
    await client.dailyActivity.bulkPut([
      { date: "2026-10-09", attempts: 1, studySeconds: 0, completions: 0 },
      { date: "2026-10-10", studySeconds: 30, attempts: 0, completions: 0 },
    ]);
    expect((await getProgress(client, instant)).stats).toMatchObject({ streak: 2, weeklyStudyDays: 2 });
    expect((await getProgress(client, new Date("2026-10-12T10:00:00Z"))).stats)
      .toMatchObject({ streak: 0, weeklyStudyDays: 0 });
  });

  it("cuenta tiempo aproximado con tope, descarta pausas y evita duplicados", async () => {
    const session = await recordStudy(undefined, client, instant);
    expect(session.creditedSeconds).toBe(0);
    expect((await recordStudy(session.sessionId, client, secondsAfter(30))).creditedSeconds).toBe(30);
    expect((await recordStudy(session.sessionId, client, secondsAfter(30))).creditedSeconds).toBe(0);
    expect((await recordStudy(session.sessionId, client, secondsAfter(35))).creditedSeconds).toBe(5);
    expect((await recordStudy(session.sessionId, client, secondsAfter(90))).creditedSeconds).toBe(30);
    expect((await recordStudy(session.sessionId, client, secondsAfter(200))).creditedSeconds).toBe(0);
    expect((await recordStudy(session.sessionId, client, secondsAfter(230))).creditedSeconds).toBe(30);
    expect((await getProgress(client, instant)).stats.studySeconds).toBe(95);
  });

  it("las transacciones de dos pestañas simultáneas no duplican el tiempo", async () => {
    const first = await recordStudy(undefined, client, instant);
    const second = await recordStudy(undefined, client, instant);
    const anotherTab = new AcademyDatabase(client.name);
    try {
      const pulses = await Promise.all([
        recordStudy(first.sessionId, client, secondsAfter(30)),
        recordStudy(second.sessionId, anotherTab, secondsAfter(30)),
      ]);
      expect(pulses.reduce((sum, pulse) => sum + pulse.creditedSeconds, 0)).toBe(30);
      const resumed = await recordStudy(undefined, client, secondsAfter(3600));
      expect((await recordStudy(resumed.sessionId, client, secondsAfter(3630))).creditedSeconds).toBe(30);
      expect((await getProgress(client, instant)).stats.studySeconds).toBe(60);
    } finally { anotherTab.close(); }
  });

  it("un fallo durante el guardado revierte intento, repaso y actividad juntos", async () => {
    vi.spyOn(client.dailyActivity, "put").mockRejectedValueOnce(new Error("Sin espacio"));
    const answers = correctAnswers();
    answers[firstLesson.questions.find((question) => question.type === "number")!.id] = -1234;
    await expect(saveAttempt(firstLesson.slug, answers, client, instant)).rejects.toThrow("Sin espacio");
    expect(await client.attempts.count()).toBe(0);
    expect(await client.reviewConcepts.count()).toBe(0);
    expect(await client.dailyActivity.count()).toBe(0);
  });

  it("valida los ajustes locales sin aceptar propiedades desconocidas", async () => {
    await expect(updateSettings({ name: "Ana", weeklyGoal: 8 }, client)).rejects.toThrow("1 a 7");
    await expect(updateSettings({ name: "<script>", weeklyGoal: 3 }, client)).rejects.toThrow("nombre");
    expect((await getProgress(client, instant)).user).toEqual({ name: "Estudiante", weeklyGoal: 3 });
  });
});
