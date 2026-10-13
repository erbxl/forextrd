import { z } from "zod";
import { firstLesson, getLesson } from "@/modules/academy/content";
import { evaluateAnswers } from "@/modules/exercises/evaluate";
import { canStudy } from "@/modules/academy/progression";
import { AcademyDatabase, defaultPreferences, defaultProfile, getDatabase, initializeDatabase } from "./db";
import { madridDate } from "./dates";
import { TABLE_NAMES, deriveReviewConcepts, type DailyActivity, type JsonValue, type PersonalTables } from "./types";

export type BackupEnvelope = {
  format: "forex-academy-pro";
  version: 1;
  exportedAt: string;
  tables: PersonalTables;
};

export type BackupPreview = {
  profileName: string;
  exportedAt: string;
  lessonsRead: number;
  lessonsCompleted: number;
  attempts: number;
  studySeconds: number;
  theme: "dark" | "light";
  demoTrades: number;
  replaySessions: number;
  backtestResults: number;
  journalEntries: number;
  totalRecords: number;
};

export const MAX_BACKUP_BYTES = 10 * 1024 * 1024;
const MAX_ROWS = 10_000;
const unsafeKeys = new Set(["__proto__", "prototype", "constructor"]);
const boundedString = z.string().max(2_000);
const identifier = z.string().min(1).max(128);
const isoDate = z.string().length(24).refine((value) => {
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString() === value;
}, "La fecha debe ser ISO UTC canónica.");
const calendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T12:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, "La fecha de actividad no es válida.");
const integer = z.number().int().min(0).max(100_000);

/** Iterative traversal also rejects cycles, exotic objects and excessive nesting. */
function assertSafeJson(value: unknown): void {
  const pending: { value: unknown; depth: number }[] = [{ value, depth: 0 }];
  const visited = new WeakSet<object>();
  let nodes = 0;
  while (pending.length) {
    const current = pending.pop()!;
    if (++nodes > 150_000 || current.depth > 20) throw new Error("La copia contiene demasiados datos o niveles anidados.");
    if (current.value === null || typeof current.value === "boolean") continue;
    if (typeof current.value === "number") {
      if (!Number.isFinite(current.value)) throw new Error("La copia contiene un número no finito.");
      continue;
    }
    if (typeof current.value === "string") {
      if (current.value.length > 20_000) throw new Error("La copia contiene un texto demasiado largo.");
      continue;
    }
    if (typeof current.value !== "object") throw new Error("La copia debe contener únicamente valores JSON.");
    if (visited.has(current.value)) throw new Error("La copia contiene referencias repetidas o circulares.");
    visited.add(current.value);
    if (Array.isArray(current.value)) {
      if (current.value.length > MAX_ROWS) throw new Error("La copia contiene demasiados registros.");
      for (const child of current.value) pending.push({ value: child, depth: current.depth + 1 });
      continue;
    }
    const prototype = Object.getPrototypeOf(current.value);
    if (prototype !== Object.prototype && prototype !== null) throw new Error("La copia contiene objetos no compatibles con JSON.");
    for (const key of Reflect.ownKeys(current.value)) {
      if (typeof key !== "string" || key.length > 128 || unsafeKeys.has(key)) {
        throw new Error("La copia contiene una clave no permitida.");
      }
      const descriptor = Object.getOwnPropertyDescriptor(current.value, key)!;
      if (!Object.hasOwn(descriptor, "value")) throw new Error("La copia contiene propiedades no compatibles con JSON.");
      pending.push({ value: descriptor.value, depth: current.depth + 1 });
    }
  }
}

const feedbackSchema = z.object({
  questionId: identifier,
  concept: boundedString,
  correct: z.boolean(),
  explanation: boundedString,
  correctAnswer: z.union([boundedString, z.number().finite()]),
}).strict();
const attemptSchema = z.object({
  id: identifier,
  lessonSlug: identifier,
  answers: z.record(identifier, z.union([boundedString, z.number().finite()])),
  createdAt: isoDate,
  score: z.number().min(0).max(100),
  passed: z.boolean(),
  correctCount: integer,
  totalCount: integer,
  feedback: z.array(feedbackSchema).max(100),
}).strict();
const metadataSchema = z.custom<Record<string, JsonValue>>((value) =>
  value !== null && typeof value === "object" && !Array.isArray(value),
  "Los metadatos deben ser un objeto JSON.",
);
const reservedSchema = z.object({
  id: identifier,
  createdAt: isoDate,
  updatedAt: isoDate,
  metadata: metadataSchema,
}).strict().refine((record) => record.updatedAt >= record.createdAt, "Las fechas del registro están invertidas.");
const tableSchemas = z.object({
  profile: z.array(z.object({
    id: z.literal("local-student"),
    name: z.string().trim().min(1).max(50).regex(/^[^\u0000-\u001f\u007f<>]+$/),
    weeklyGoal: z.number().int().min(1).max(7),
    createdAt: isoDate,
    lastStudyAt: isoDate.nullable(),
  }).strict()).length(1),
  preferences: z.array(z.object({ id: z.literal("local"), theme: z.enum(["dark", "light"]), updatedAt: isoDate }).strict()).length(1),
  lessonProgress: z.array(z.object({ lessonSlug: identifier, readAt: isoDate.nullable(), completedAt: isoDate.nullable() }).strict()).min(1).max(MAX_ROWS),
  attempts: z.array(attemptSchema).max(MAX_ROWS),
  studySessions: z.array(z.object({ id: identifier, startedAt: isoDate, lastHeartbeatAt: isoDate }).strict()
    .refine((session) => session.startedAt <= session.lastHeartbeatAt, "Las fechas de la sesión están invertidas.")).max(MAX_ROWS),
  dailyActivity: z.array(z.object({ date: calendarDate, studySeconds: z.number().int().min(0).max(86_400), attempts: integer, completions: integer }).strict()).max(MAX_ROWS),
  reviewConcepts: z.array(z.object({ concept: boundedString.min(1), incorrectCount: integer, lastAttemptAt: isoDate }).strict()).max(MAX_ROWS),
  demoTrades: z.array(reservedSchema).max(MAX_ROWS),
  replaySessions: z.array(reservedSchema).max(MAX_ROWS),
  backtestResults: z.array(reservedSchema).max(MAX_ROWS),
  journalEntries: z.array(reservedSchema).max(MAX_ROWS),
}).strict();
const envelopeSchema = z.object({
  format: z.literal("forex-academy-pro"),
  version: z.literal(1),
  exportedAt: isoDate,
  tables: tableSchemas,
}).strict();

function validateEnvelope(raw: unknown): BackupEnvelope {
  assertSafeJson(raw);
  if (raw && typeof raw === "object" && "version" in raw && raw.version !== 1) {
    throw new Error("La versión de esta copia no es compatible. No se ha modificado ningún dato.");
  }
  const parsed = envelopeSchema.safeParse(raw);
  if (!parsed.success) throw new Error("La estructura de la copia no es válida. Comprueba sus campos y fechas.");
  const envelope: BackupEnvelope = parsed.data;
  const { tables } = envelope;
  let rowCount = 0;
  for (const table of TABLE_NAMES) {
    rowCount += tables[table].length;
    const keys = tables[table].map((record) => {
      if ("id" in record) return record.id;
      if ("lessonSlug" in record) return record.lessonSlug;
      if ("date" in record) return record.date;
      return record.concept;
    });
    if (new Set(keys).size !== keys.length) throw new Error(`La tabla ${table} contiene identificadores duplicados.`);
  }
  if (rowCount > 30_000) throw new Error("La copia contiene demasiados registros.");
  const progressSlugs = new Set(tables.lessonProgress.map((record) => record.lessonSlug));
  if (!progressSlugs.has(firstLesson.slug)) throw new Error("La copia no contiene el progreso de la unidad disponible.");
  for (const progress of tables.lessonProgress) {
    if (!getLesson(progress.lessonSlug)) throw new Error("La copia hace referencia a una lección desconocida.");
  }
  tables.attempts = tables.attempts.map((attempt) => {
    const lesson = getLesson(attempt.lessonSlug);
    if (!lesson || !progressSlugs.has(attempt.lessonSlug)) throw new Error("Un intento no tiene una lección o un progreso válido.");
    const ids = new Set(attempt.feedback.map((outcome) => outcome.questionId));
    if (attempt.feedback.length !== lesson.questions.length || ids.size !== lesson.questions.length ||
      lesson.questions.some((question) => !ids.has(question.id))) {
      throw new Error("Un intento hace referencia a preguntas desconocidas, ausentes o duplicadas.");
    }
    return { ...attempt, ...evaluateAnswers(lesson, attempt.answers) };
  });
  for (const progress of tables.lessonProgress) {
    if (progress.completedAt && (!progress.readAt || progress.completedAt < progress.readAt ||
      !tables.attempts.some((attempt) => attempt.lessonSlug === progress.lessonSlug && attempt.passed && attempt.createdAt <= progress.completedAt!))) {
      throw new Error("Una lección completada necesita lectura y un intento aprobado verificable anterior a su finalización.");
    }
  }
  const completions = tables.lessonProgress.map(item => ({ slug: item.lessonSlug, completedAt: item.completedAt }));
  for (const attempt of tables.attempts) {
    const priorCompletions = completions.map(item => ({ ...item, completedAt: item.completedAt && item.completedAt <= attempt.createdAt ? item.completedAt : null }));
    if (!canStudy(attempt.lessonSlug, priorCompletions)) throw new Error("Un intento no cumple los requisitos previos del nivel o del examen.");
  }
  const daily = new Map<string, DailyActivity>(tables.dailyActivity.map((day) => [day.date, { ...day, attempts: 0, completions: 0 }]));
  const activityFor = (timestamp: string): DailyActivity => {
    const date = madridDate(new Date(timestamp));
    const activity = daily.get(date) ?? { date, studySeconds: 0, attempts: 0, completions: 0 };
    daily.set(date, activity);
    return activity;
  };
  for (const attempt of tables.attempts) activityFor(attempt.createdAt).attempts += 1;
  for (const progress of tables.lessonProgress) if (progress.completedAt) activityFor(progress.completedAt).completions += 1;
  tables.dailyActivity = [...daily.values()].sort((left, right) => left.date.localeCompare(right.date));
  tables.reviewConcepts = deriveReviewConcepts(tables.attempts);
  return envelope;
}

export function parseBackup(text: string): BackupEnvelope {
  if (typeof text !== "string" || text.length > MAX_BACKUP_BYTES || new TextEncoder().encode(text).byteLength > MAX_BACKUP_BYTES) {
    throw new Error("La copia debe ser un archivo JSON de hasta 10 MiB.");
  }
  let raw: unknown;
  try { raw = JSON.parse(text); }
  catch { throw new Error("No se pudo leer el JSON de la copia. No se ha modificado ningún dato."); }
  return validateEnvelope(raw);
}

function snapshotBackup(value: unknown): BackupEnvelope {
  assertSafeJson(value);
  // Clone before any await: callers cannot change an already validated restore.
  return parseBackup(JSON.stringify(value));
}

export async function exportBackup(client = getDatabase()): Promise<BackupEnvelope> {
  await initializeDatabase(client);
  const tables = {} as PersonalTables;
  await client.transaction("r", TABLE_NAMES.map((table) => client.table(table)), async () => {
    for (const table of TABLE_NAMES) {
      Object.assign(tables, { [table]: await client.table(table).toArray() });
    }
  });
  return snapshotBackup({ format: "forex-academy-pro", version: 1, exportedAt: new Date().toISOString(), tables });
}

export function backupPreview(parsed: BackupEnvelope): BackupPreview {
  const { tables, exportedAt } = snapshotBackup(parsed);
  return {
    profileName: tables.profile[0].name,
    exportedAt,
    lessonsRead: tables.lessonProgress.filter((progress) => progress.readAt).length,
    lessonsCompleted: tables.lessonProgress.filter((progress) => progress.completedAt).length,
    attempts: tables.attempts.length,
    studySeconds: tables.dailyActivity.reduce((total, day) => total + day.studySeconds, 0),
    theme: tables.preferences[0].theme,
    demoTrades: tables.demoTrades.length,
    replaySessions: tables.replaySessions.length,
    backtestResults: tables.backtestResults.length,
    journalEntries: tables.journalEntries.length,
    totalRecords: TABLE_NAMES.reduce((total, table) => total + tables[table].length, 0),
  };
}

async function replaceTables(client: AcademyDatabase, tables: PersonalTables): Promise<void> {
  if (!client.isOpen()) await client.open();
  await client.transaction("rw", TABLE_NAMES.map((table) => client.table(table)), async () => {
    for (const table of TABLE_NAMES) await client.table(table).clear();
    for (const table of TABLE_NAMES) {
      if (tables[table].length) await client.table(table).bulkAdd(tables[table]);
    }
  });
}

export async function restoreBackup(parsed: BackupEnvelope, client = getDatabase()): Promise<void> {
  const snapshot = snapshotBackup(parsed);
  await replaceTables(client, snapshot.tables);
}

export async function resetDatabase(client = getDatabase()): Promise<void> {
  const now = new Date();
  await replaceTables(client, {
    profile: [defaultProfile(now)],
    preferences: [defaultPreferences(now, "dark")],
    lessonProgress: [{ lessonSlug: firstLesson.slug, readAt: null, completedAt: null }],
    attempts: [], studySessions: [], dailyActivity: [], reviewConcepts: [],
    demoTrades: [], replaySessions: [], backtestResults: [], journalEntries: [],
  });
}
