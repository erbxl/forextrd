import { z } from "zod";
import { firstLesson, getLesson } from "@/modules/academy/content";
import { evaluateAnswers } from "@/modules/exercises/evaluate";
import { getDatabase, initializeDatabase, type AcademyDatabase } from "@/modules/storage/db";
import { madridDate, shiftDate } from "@/modules/storage/dates";
import type { DailyActivity, StoredAttempt } from "@/modules/storage/types";
import type { ProgressSnapshot } from "./types";

export { madridDate } from "@/modules/storage/dates";

async function incrementActivity(client: AcademyDatabase, date: string, field: "attempts" | "completions" | "studySeconds", increment: number) {
  const day: DailyActivity = await client.dailyActivity.get(date) ?? { date, studySeconds: 0, attempts: 0, completions: 0 };
  day[field] += increment;
  await client.dailyActivity.put(day);
}

export async function getProgress(client = getDatabase(), now = new Date()): Promise<ProgressSnapshot> {
  // Keep this query read-only so Dexie liveQuery can observe it. Initialization
  // belongs to the application startup, before registering subscriptions.
  return client.transaction("r", [client.profile, client.lessonProgress, client.attempts, client.dailyActivity, client.reviewConcepts], async () => {
    const [user, progress, storedAttempts, activity, incorrect] = await Promise.all([
      client.profile.get("local-student"), client.lessonProgress.toArray(), client.attempts.toArray(),
      client.dailyActivity.toArray(), client.reviewConcepts.toArray(),
    ]);
    if (!user) throw new Error("Inicializa el espacio local antes de consultar el progreso.");
    const attempts = storedAttempts.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
    const today = madridDate(now);
    const daysSinceMonday = (new Date(`${today}T12:00:00.000Z`).getUTCDay() + 6) % 7;
    const monday = shiftDate(today, -daysSinceMonday);
    const activityMap = new Map(activity.map((day) => [day.date, day]));
    const activeDays = new Set(activity.filter((day) => day.studySeconds > 0 || day.attempts > 0 || day.completions > 0).map((day) => day.date));
    const week = Array.from({ length: 7 }, (_, index) => {
      const date = shiftDate(today, index - 6);
      return activityMap.get(date) ?? { date, studySeconds: 0, attempts: 0, completions: 0 };
    });
    let cursor = activeDays.has(today) ? today : shiftDate(today, -1);
    let streak = 0;
    while (activeDays.has(cursor)) { streak += 1; cursor = shiftDate(cursor, -1); }
    const answeredQuestions = attempts.reduce((sum, attempt) => sum + attempt.totalCount, 0);
    const correctAnswers = attempts.reduce((sum, attempt) => sum + attempt.correctCount, 0);
    const views = [firstLesson].map((lesson) => {
      const history = attempts.filter((attempt) => attempt.lessonSlug === lesson.slug);
      const stored = progress.find((entry) => entry.lessonSlug === lesson.slug);
      return {
        slug: lesson.slug, readAt: stored?.readAt ?? null, completedAt: stored?.completedAt ?? null,
        bestScore: history.reduce((best, attempt) => Math.max(best, attempt.score), 0),
        passed: history.some((attempt) => attempt.passed), attemptsCount: history.length,
      };
    });
    return {
      user: { name: user.name, weeklyGoal: user.weeklyGoal }, lessons: views,
      stats: {
        completedLessons: views.filter((lesson) => lesson.completedAt).length,
        publishedLessons: views.length, totalAttempts: attempts.length, answeredQuestions, correctAnswers,
        accuracy: answeredQuestions === 0 ? null : Math.round(correctAnswers / answeredQuestions * 100),
        studySeconds: activity.reduce((sum, day) => sum + day.studySeconds, 0), streak,
        weeklyStudyDays: week.filter((day) => day.date >= monday && activeDays.has(day.date)).length,
      }, activity: week,
      weaknesses: incorrect.map(({ concept, incorrectCount }) => ({ concept, incorrectCount }))
        .sort((a, b) => b.incorrectCount - a.incorrectCount || a.concept.localeCompare(b.concept, "es")).slice(0, 5),
      recentAttempts: attempts.slice(0, 5).map(({ id, lessonSlug, score, passed, createdAt }) => ({ id, lessonSlug, score, passed, createdAt })),
    };
  });
}

const answersSchema = z.record(z.string().min(1).max(80), z.union([
  z.string().min(1).max(200), z.number().finite().min(-1e12).max(1e12),
])).refine((answers) => Object.keys(answers).length > 0 && Object.keys(answers).length <= 100);

export async function saveAttempt(slug: string, answers: Record<string, string | number>, client = getDatabase(), now = new Date()) {
  const lesson = getLesson(slug);
  if (!lesson) throw new Error("La lección no está disponible.");
  const parsed = answersSchema.safeParse(answers);
  if (!parsed.success) throw new Error("Responde todas las preguntas con valores válidos antes de corregir.");
  const result = evaluateAnswers(lesson, parsed.data);
  await initializeDatabase(client, now);
  const id = crypto.randomUUID();
  const attempt: StoredAttempt = { ...result, id, lessonSlug: slug, answers: parsed.data, createdAt: now.toISOString() };
  await client.transaction("rw", [client.attempts, client.lessonProgress, client.dailyActivity, client.reviewConcepts], async () => {
    if (!await client.lessonProgress.get(slug)) await client.lessonProgress.add({ lessonSlug: slug, readAt: null, completedAt: null });
    await client.attempts.add(attempt);
    for (const feedback of result.feedback) if (!feedback.correct) {
      const previous = await client.reviewConcepts.get(feedback.concept);
      await client.reviewConcepts.put({
        concept: feedback.concept, incorrectCount: (previous?.incorrectCount ?? 0) + 1,
        lastAttemptAt: previous && previous.lastAttemptAt > attempt.createdAt ? previous.lastAttemptAt : attempt.createdAt,
      });
    }
    await incrementActivity(client, madridDate(now), "attempts", 1);
  });
  return { ...result, id };
}

export async function completeLesson(slug: string, read: boolean, client = getDatabase(), now = new Date()) {
  if (!getLesson(slug)) throw new Error("La lección no está disponible.");
  if (read !== true) throw new Error("Confirma que has estudiado la lección.");
  await initializeDatabase(client, now);
  return client.transaction("rw", [client.attempts, client.lessonProgress, client.dailyActivity], async () => {
    const attempts = await client.attempts.where("lessonSlug").equals(slug).toArray();
    if (!attempts.some((attempt) => attempt.passed)) throw new Error("Aprueba la evaluación antes de completar la lección.");
    const existing = await client.lessonProgress.get(slug);
    if (existing?.completedAt) return { completedAt: existing.completedAt, readAt: existing.readAt };
    const progress = { lessonSlug: slug, readAt: existing?.readAt ?? now.toISOString(), completedAt: now.toISOString() };
    await client.lessonProgress.put(progress);
    await incrementActivity(client, madridDate(now), "completions", 1);
    return { completedAt: progress.completedAt, readAt: progress.readAt };
  });
}

export async function updateSettings(settings: { name: string; weeklyGoal: number }, client = getDatabase()) {
  const parsed = z.object({
    name: z.string().trim().min(1).max(50).regex(/^[^\u0000-\u001f\u007f<>]+$/u),
    weeklyGoal: z.number().int().min(1).max(7),
  }).strict().safeParse(settings);
  if (!parsed.success) throw new Error("Revisa el nombre y selecciona una meta de 1 a 7 días.");
  await initializeDatabase(client);
  await client.profile.update("local-student", parsed.data);
  return parsed.data;
}

export async function recordStudy(sessionId?: string, client = getDatabase(), now = new Date()) {
  await initializeDatabase(client, now);
  return client.transaction("rw", [client.profile, client.studySessions, client.dailyActivity], async () => {
    if (!sessionId) {
      await client.studySessions.where("lastHeartbeatAt").below(new Date(now.getTime() - 86_400_000).toISOString()).delete();
      const id = crypto.randomUUID();
      await client.studySessions.add({ id, startedAt: now.toISOString(), lastHeartbeatAt: now.toISOString() });
      return { sessionId: id, creditedSeconds: 0 };
    }
    const session = await client.studySessions.get(sessionId);
    if (!session) throw new Error("La sesión de estudio ha caducado. Vuelve a abrir la lección.");
    const profile = await client.profile.get("local-student");
    const from = Math.max(Date.parse(session.lastHeartbeatAt), profile?.lastStudyAt ? Date.parse(profile.lastStudyAt) : 0);
    const elapsed = Math.max(0, Math.floor((now.getTime() - from) / 1000));
    // This is approximate browser study time, not a trusted server clock.
    // Transactions and a shared cursor avoid double counting between tabs.
    const paused = now.getTime() - Date.parse(session.lastHeartbeatAt) > 90_000;
    const creditedSeconds = paused ? 0 : Math.min(30, elapsed);
    const nextTimestamp = new Date(Math.max(now.getTime(), from)).toISOString();
    await client.studySessions.update(sessionId, { lastHeartbeatAt: nextTimestamp });
    await client.profile.update("local-student", { lastStudyAt: nextTimestamp });
    if (creditedSeconds > 0) await incrementActivity(client, madridDate(now), "studySeconds", creditedSeconds);
    return { sessionId, creditedSeconds };
  });
}
