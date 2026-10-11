import Dexie, { type Table } from "dexie";
import { z } from "zod";
import { firstLesson } from "@/modules/academy/content";
import { deriveReviewConcepts, type DailyActivity, type LocalProfile, type Preferences, type ReservedRecord,
  type ReviewConcept, type StoredAttempt, type StoredLessonProgress, type StudySession, type Theme } from "./types";

export const DATABASE_NAME = "forex-academy-pro";
export const SCHEMA_V1 = {
  profile: "id",
  preferences: "id",
  lessonProgress: "lessonSlug",
  attempts: "id, lessonSlug, createdAt",
  studySessions: "id, lastHeartbeatAt",
  dailyActivity: "date",
  demoTrades: "id, createdAt",
  replaySessions: "id, createdAt",
  backtestResults: "id, createdAt",
  journalEntries: "id, createdAt",
};

export class AcademyDatabase extends Dexie {
  profile!: Table<LocalProfile, string>;
  preferences!: Table<Preferences, string>;
  lessonProgress!: Table<StoredLessonProgress, string>;
  attempts!: Table<StoredAttempt, string>;
  studySessions!: Table<StudySession, string>;
  dailyActivity!: Table<DailyActivity, string>;
  reviewConcepts!: Table<ReviewConcept, string>;
  demoTrades!: Table<ReservedRecord, string>;
  replaySessions!: Table<ReservedRecord, string>;
  backtestResults!: Table<ReservedRecord, string>;
  journalEntries!: Table<ReservedRecord, string>;

  constructor(name = DATABASE_NAME) {
    super(name);
    this.version(1).stores(SCHEMA_V1);
    // Add versions instead of deleting/recreating the database. This additive
    // migration builds a review index without changing existing personal data.
    this.version(2).stores({ reviewConcepts: "concept, incorrectCount" }).upgrade(async (transaction) => {
      const attempts = await transaction.table<StoredAttempt>("attempts").toArray();
      const concepts = deriveReviewConcepts(attempts);
      if (concepts.length) await transaction.table("reviewConcepts").bulkPut(concepts);
    });
  }
}

let database: AcademyDatabase | undefined;

export function getDatabase(): AcademyDatabase {
  if (typeof indexedDB === "undefined") {
    throw new Error("El almacenamiento local no está disponible. Abre la aplicación en un navegador con IndexedDB habilitado.");
  }
  database ??= new AcademyDatabase();
  return database;
}

export function defaultProfile(now = new Date()): LocalProfile {
  return { id: "local-student", name: "Estudiante", weeklyGoal: 3, createdAt: now.toISOString(), lastStudyAt: null };
}

export function defaultPreferences(now = new Date(), theme: Theme = "dark"): Preferences {
  return { id: "local", theme, updatedAt: now.toISOString() };
}

function previousTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  try { return window.localStorage.getItem("forex-theme") === "light" ? "light" : "dark"; }
  catch { return "dark"; }
}

export async function initializeDatabase(client = getDatabase(), now = new Date()): Promise<void> {
  try { if (!client.isOpen()) await client.open(); }
  catch {
    throw new Error("No se pudo abrir el almacenamiento local. Comprueba los permisos del navegador, el espacio disponible y que no estés usando un modo privado que bloquee IndexedDB.");
  }
  await client.transaction("rw", client.profile, client.preferences, client.lessonProgress, async () => {
    if (!await client.profile.get("local-student")) await client.profile.add(defaultProfile(now));
    if (!await client.preferences.get("local")) await client.preferences.add(defaultPreferences(now, previousTheme()));
    if (!await client.lessonProgress.get(firstLesson.slug)) {
      await client.lessonProgress.add({ lessonSlug: firstLesson.slug, readAt: null, completedAt: null });
    }
  });
}

export async function getPreferences(client = getDatabase()): Promise<{ theme: Theme }> {
  // Read queries are used inside liveQuery, where write transactions are not
  // permitted. The application initializes once before subscribing.
  const preferences = await client.preferences.get("local");
  if (!preferences) throw new Error("Inicializa el espacio local antes de consultar las preferencias.");
  return { theme: preferences.theme };
}

export async function updatePreferences(settings: { theme: Theme }, client = getDatabase()): Promise<void> {
  const parsed = z.object({ theme: z.enum(["dark", "light"]) }).strict().safeParse(settings);
  if (!parsed.success) throw new Error("Selecciona un tema válido.");
  await initializeDatabase(client);
  await client.preferences.put(defaultPreferences(new Date(), parsed.data.theme));
}
