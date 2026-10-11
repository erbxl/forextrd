import type { Prisma, PrismaClient } from "@prisma/client";
import { db, resolveLocalUser } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { getLesson } from "@/modules/academy/content";
import { evaluateAnswers } from "@/modules/exercises/evaluate";
import type { ProgressSnapshot } from "./types";

type Database = PrismaClient;
type Transaction = Prisma.TransactionClient;

export function madridDate(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(date);
}

function shiftDate(date: string, days: number): string {
  const utcDate = new Date(`${date}T12:00:00.000Z`);
  utcDate.setUTCDate(utcDate.getUTCDate() + days);
  return utcDate.toISOString().slice(0, 10);
}

function activityUpdate(transaction: Transaction, userId: string, date: string, field: "attempts" | "completions" | "studySeconds", increment: number) {
  return transaction.dailyActivity.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date, [field]: increment },
    update: { [field]: { increment } },
  });
}

export async function getProgress(client: Database = db, now = new Date()): Promise<ProgressSnapshot> {
  const user = await resolveLocalUser(client);
  const [lessons, attempts, activity, incorrect] = await Promise.all([
    client.lesson.findMany({ where: { published: true }, include: { progress: { where: { userId: user.id } } }, orderBy: { moduleId: "asc" } }),
    client.attempt.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    client.dailyActivity.findMany({ where: { userId: user.id }, orderBy: { date: "asc" } }),
    client.questionOutcome.groupBy({
      by: ["concept"], where: { correct: false, attempt: { userId: user.id } }, _count: { _all: true },
    }),
  ]);
  const today = madridDate(now);
  const daysSinceMonday = (new Date(`${today}T12:00:00.000Z`).getUTCDay() + 6) % 7;
  const monday = shiftDate(today, -daysSinceMonday);
  const activityMap = new Map(activity.map((day) => [day.date, day]));
  const activeDays = new Set(activity.filter((day) => day.studySeconds > 0 || day.attempts > 0 || day.completions > 0).map((day) => day.date));
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = shiftDate(today, index - 6);
    const entry = activityMap.get(date);
    return { date, studySeconds: entry?.studySeconds ?? 0, attempts: entry?.attempts ?? 0, completions: entry?.completions ?? 0 };
  });
  let cursor = activeDays.has(today) ? today : shiftDate(today, -1);
  let streak = 0;
  while (activeDays.has(cursor)) { streak += 1; cursor = shiftDate(cursor, -1); }
  const answeredQuestions = attempts.reduce((sum, attempt) => sum + attempt.totalCount, 0);
  const correctAnswers = attempts.reduce((sum, attempt) => sum + attempt.correctCount, 0);
  const views = lessons.map((lesson) => {
    const history = attempts.filter((attempt) => attempt.lessonSlug === lesson.slug);
    const progress = lesson.progress[0];
    return {
      slug: lesson.slug, readAt: progress?.readAt?.toISOString() ?? null,
      completedAt: progress?.completedAt?.toISOString() ?? null,
      bestScore: history.reduce((best, attempt) => Math.max(best, attempt.score), 0),
      passed: history.some((attempt) => attempt.passed), attemptsCount: history.length,
    };
  });
  return {
    user: { name: user.name, weeklyGoal: user.weeklyGoal }, lessons: views,
    stats: {
      completedLessons: views.filter((lesson) => lesson.completedAt).length,
      publishedLessons: lessons.length, totalAttempts: attempts.length,
      answeredQuestions, correctAnswers,
      accuracy: answeredQuestions === 0 ? null : Math.round(correctAnswers / answeredQuestions * 100),
      studySeconds: activity.reduce((sum, day) => sum + day.studySeconds, 0), streak,
      weeklyStudyDays: week.filter((day) => day.date >= monday && activeDays.has(day.date)).length,
    },
    activity: week,
    weaknesses: incorrect.map((item) => ({ concept: item.concept, incorrectCount: item._count._all }))
      .sort((a, b) => b.incorrectCount - a.incorrectCount || a.concept.localeCompare(b.concept, "es")).slice(0, 5),
    recentAttempts: attempts.slice(0, 5).map((attempt) => ({
      id: attempt.id, lessonSlug: attempt.lessonSlug, score: attempt.score,
      passed: attempt.passed, createdAt: attempt.createdAt.toISOString(),
    })),
  };
}

export async function saveAttempt(slug: string, answers: Record<string, string | number>, client: Database = db, now = new Date()) {
  const lesson = getLesson(slug);
  if (!lesson) throw new HttpError(404, "La lección no está disponible.");
  let result;
  try { result = evaluateAnswers(lesson, answers); }
  catch { throw new HttpError(400, "Responde todas las preguntas con valores válidos antes de corregir."); }
  const user = await resolveLocalUser(client);
  const attempt = await client.$transaction(async (transaction) => {
    const saved = await transaction.attempt.create({
      data: {
        userId: user.id, lessonSlug: slug, score: result.score, passed: result.passed,
        correctCount: result.correctCount, totalCount: result.totalCount, createdAt: now,
        outcomes: { create: result.feedback.map((answer) => ({
          questionId: `${slug}:${answer.questionId}`, concept: answer.concept,
          correct: answer.correct, submitted: JSON.stringify(answers[answer.questionId]),
          correctValue: JSON.stringify(answer.correctAnswer), explanation: answer.explanation,
        })) },
      },
    });
    await activityUpdate(transaction, user.id, madridDate(now), "attempts", 1);
    return saved;
  });
  return { ...result, id: attempt.id };
}

export async function completeLesson(slug: string, read: boolean, client: Database = db, now = new Date()) {
  if (!getLesson(slug)) throw new HttpError(404, "La lección no está disponible.");
  if (read !== true) throw new HttpError(400, "Confirma que has estudiado la lección.");
  const user = await resolveLocalUser(client);
  return client.$transaction(async (transaction) => {
    const passingAttempt = await transaction.attempt.findFirst({ where: { userId: user.id, lessonSlug: slug, passed: true } });
    if (!passingAttempt) throw new HttpError(409, "Aprueba la evaluación antes de completar la lección.");
    const existing = await transaction.lessonProgress.findUnique({ where: { userId_lessonSlug: { userId: user.id, lessonSlug: slug } } });
    if (existing?.completedAt) return { completedAt: existing.completedAt.toISOString(), readAt: existing.readAt?.toISOString() };
    const progress = await transaction.lessonProgress.upsert({
      where: { userId_lessonSlug: { userId: user.id, lessonSlug: slug } },
      create: { userId: user.id, lessonSlug: slug, readAt: now, completedAt: now },
      update: { readAt: existing?.readAt ?? now, completedAt: now },
    });
    await activityUpdate(transaction, user.id, madridDate(now), "completions", 1);
    return { completedAt: progress.completedAt!.toISOString(), readAt: progress.readAt!.toISOString() };
  });
}

export async function updateSettings(settings: { name: string; weeklyGoal: number }, client: Database = db) {
  const user = await resolveLocalUser(client);
  return client.user.update({ where: { id: user.id }, data: settings, select: { name: true, weeklyGoal: true } });
}

export async function recordStudy(sessionId?: string, client: Database = db, now = new Date()) {
  const user = await resolveLocalUser(client);
  return client.$transaction(async (transaction) => {
    if (!sessionId) {
      // Keep the local session table bounded; a stale tab starts a new session.
      await transaction.studySession.deleteMany({ where: { userId: user.id, lastHeartbeatAt: { lt: new Date(now.getTime() - 86_400_000) } } });
      const session = await transaction.studySession.create({ data: { userId: user.id, startedAt: now, lastHeartbeatAt: now } });
      return { sessionId: session.id, creditedSeconds: 0 };
    }
    const session = await transaction.studySession.findFirst({ where: { id: sessionId, userId: user.id } });
    if (!session) throw new HttpError(404, "La sesión de estudio ha caducado. Vuelve a abrir la lección.");
    const currentUser = await transaction.user.findUniqueOrThrow({ where: { id: user.id } });
    const from = Math.max(session.lastHeartbeatAt.getTime(), currentUser.lastStudyAt?.getTime() ?? 0);
    const elapsed = Math.max(0, Math.floor((now.getTime() - from) / 1000));
    // A gap longer than 90 seconds means paused/background study. A shared
    // user cursor prevents simultaneous tabs and repeated calls double-counting.
    const paused = now.getTime() - session.lastHeartbeatAt.getTime() > 90_000;
    const creditedSeconds = paused ? 0 : Math.min(30, elapsed);
    const nextTimestamp = new Date(Math.max(now.getTime(), from));
    await transaction.studySession.update({ where: { id: session.id }, data: { lastHeartbeatAt: nextTimestamp } });
    await transaction.user.update({ where: { id: user.id }, data: { lastStudyAt: nextTimestamp } });
    if (creditedSeconds > 0) await activityUpdate(transaction, user.id, madridDate(now), "studySeconds", creditedSeconds);
    return { sessionId: session.id, creditedSeconds };
  });
}
