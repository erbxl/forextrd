import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { seedDatabase } from "../prisma/seed-data";
import { firstLesson } from "@/modules/academy/content";
import { completeLesson, getProgress, madridDate, recordStudy, saveAttempt, updateSettings } from "@/modules/progress/service";

let directory: string;
let databaseUrl: string;
let client: PrismaClient;
const instant = new Date("2026-10-11T10:00:00.000Z");
const secondsAfter = (seconds: number) => new Date(instant.getTime() + seconds * 1000);
const correctAnswers = () => Object.fromEntries(firstLesson.questions.map((question) => [question.id, question.answer]));

beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), "forex-academy-test-"));
  databaseUrl = `file:${join(directory, "isolated.db").replaceAll("\\", "/")}`;
  client = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  const sql = await readFile(join(process.cwd(), "prisma/migrations/20261011120000_initial/migration.sql"), "utf8");
  // This fixed, repository-owned migration contains no SQL string semicolons.
  for (const statement of sql.split(";").map((part) => part.trim()).filter(Boolean)) {
    await client.$executeRawUnsafe(statement);
  }
});

beforeEach(async () => {
  await client.user.deleteMany();
  await seedDatabase(client);
});

afterAll(async () => {
  if (client) await client.$disconnect();
  // Only the exact directory returned by mkdtemp is removed.
  if (directory) await rm(directory, { recursive: true, force: true });
});

describe("progreso persistente en SQLite aislado", () => {
  it("empieza en cero y solo cuenta la lección realmente publicada", async () => {
    const snapshot = await getProgress(client, instant);
    expect(snapshot.stats).toEqual({
      completedLessons: 0, publishedLessons: 1, totalAttempts: 0, answeredQuestions: 0,
      correctAnswers: 0, accuracy: null, studySeconds: 0, streak: 0, weeklyStudyDays: 0,
    });
    expect(snapshot.activity).toHaveLength(7);
    expect(snapshot.activity[0].date).toBe("2026-10-05");
    expect(snapshot.lessons[0]).toMatchObject({ passed: false, completedAt: null, attemptsCount: 0 });
    expect(await client.academyModule.count()).toBe(13);
  });

  it("no completa sin aprobar y exige el reconocimiento de lectura", async () => {
    await expect(completeLesson(firstLesson.slug, true, client, instant)).rejects.toMatchObject({ status: 409 });
    await saveAttempt(firstLesson.slug, correctAnswers(), client, instant);
    await expect(completeLesson(firstLesson.slug, false, client, instant)).rejects.toMatchObject({ status: 400 });
    expect((await getProgress(client, instant)).stats.completedLessons).toBe(0);
  });

  it("guarda respuestas, errores y totales calculados en el servidor", async () => {
    const answers = correctAnswers();
    const numerical = firstLesson.questions.find((question) => question.type === "number")!;
    answers[numerical.id] = -1234;
    const result = await saveAttempt(firstLesson.slug, answers, client, instant);
    expect(result.passed).toBe(false);
    const outcomes = await client.questionOutcome.findMany({ where: { attemptId: result.id } });
    expect(outcomes).toHaveLength(firstLesson.questions.length);
    expect(outcomes.find((outcome) => outcome.questionId.endsWith(`:${numerical.id}`)))
      .toMatchObject({ submitted: "-1234", correct: false, concept: numerical.concept });
    const snapshot = await getProgress(client, instant);
    expect(snapshot.stats.answeredQuestions).toBe(firstLesson.questions.length);
    expect(snapshot.stats.correctAnswers).toBe(firstLesson.questions.length - 1);
    expect(snapshot.weaknesses).toContainEqual({ concept: numerical.concept, incorrectCount: 1 });
    expect(snapshot.activity[6].attempts).toBe(1);
    await expect(completeLesson(firstLesson.slug, true, client, instant)).rejects.toMatchObject({ status: 409 });
  });

  it("rechaza lecciones desconocidas y respuestas incompletas sin crear intentos", async () => {
    await expect(saveAttempt("inexistente", correctAnswers(), client)).rejects.toMatchObject({ status: 404 });
    await expect(saveAttempt(firstLesson.slug, {}, client)).rejects.toMatchObject({ status: 400 });
    expect(await client.attempt.count()).toBe(0);
  });

  it("completar es idempotente y una repetición fallida conserva la competencia aprobada", async () => {
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

  it("la semilla conserva ajustes y progreso y una conexión nueva recupera ambos", async () => {
    await updateSettings({ name: "Ana", weeklyGoal: 5 }, client);
    await saveAttempt(firstLesson.slug, correctAnswers(), client, instant);
    await completeLesson(firstLesson.slug, true, client, instant);
    await seedDatabase(client);
    await seedDatabase(client);
    const reopened = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    try {
      const snapshot = await getProgress(reopened, instant);
      expect(snapshot.user).toEqual({ name: "Ana", weeklyGoal: 5 });
      expect(snapshot.stats).toMatchObject({ completedLessons: 1, totalAttempts: 1 });
      expect(await reopened.question.count()).toBe(firstLesson.questions.length);
    } finally { await reopened.$disconnect(); }
  });

  it("calcula actividad y rachas con días locales, también al cambiar el horario", async () => {
    expect(madridDate(new Date("2026-10-10T22:30:00.000Z"))).toBe("2026-10-11");
    expect(madridDate(new Date("2026-10-25T23:30:00.000Z"))).toBe("2026-10-26");
    await client.dailyActivity.createMany({ data: [
      { userId: "local-student", date: "2026-10-09", attempts: 1 },
      { userId: "local-student", date: "2026-10-10", studySeconds: 30 },
    ] });
    expect((await getProgress(client, instant)).stats).toMatchObject({ streak: 2, weeklyStudyDays: 2 });
    expect((await getProgress(client, new Date("2026-10-12T10:00:00Z"))).stats)
      .toMatchObject({ streak: 0, weeklyStudyDays: 0 });
  });

  it("cuenta tiempo del servidor con tope, descarta pausas y evita duplicados", async () => {
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

  it("dos pestañas no duplican el tiempo y una nueva sesión no cuenta la pausa previa", async () => {
    const first = await recordStudy(undefined, client, instant);
    const second = await recordStudy(undefined, client, instant);
    await recordStudy(first.sessionId, client, secondsAfter(30));
    expect((await recordStudy(second.sessionId, client, secondsAfter(30))).creditedSeconds).toBe(0);
    const resumed = await recordStudy(undefined, client, secondsAfter(3600));
    expect((await recordStudy(resumed.sessionId, client, secondsAfter(3630))).creditedSeconds).toBe(30);
    expect((await getProgress(client, instant)).stats.studySeconds).toBe(60);
  });
});
