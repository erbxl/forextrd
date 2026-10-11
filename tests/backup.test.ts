import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { firstLesson } from "../src/modules/academy/content";
import { evaluateAnswers } from "../src/modules/exercises/evaluate";
import {
  MAX_BACKUP_BYTES, backupPreview, exportBackup, parseBackup, resetDatabase, restoreBackup,
  type BackupEnvelope,
} from "../src/modules/storage/backup";
import { AcademyDatabase, SCHEMA_V1, initializeDatabase } from "../src/modules/storage/db";
import { TABLE_NAMES, type ReservedRecord } from "../src/modules/storage/types";

const at = "2026-10-11T10:00:00.000Z";
const passedAt = "2026-10-11T10:05:00.000Z";
const completedAt = "2026-10-11T10:06:00.000Z";
const databases: Dexie[] = [];
let serial = 0;
let database: AcademyDatabase;

function databaseName() { return `backup-tests-${Date.now()}-${++serial}`; }
function newDatabase() {
  const client = new AcademyDatabase(databaseName());
  databases.push(client);
  return client;
}
function answers() {
  return Object.fromEntries(firstLesson.questions.map((question) => [question.id, question.answer]));
}
function reserved(id: string): ReservedRecord {
  return {
    id, createdAt: at, updatedAt: completedAt,
    metadata: { source: "synthetic", note: "Registro reservado, no operación ejecutada", nested: { valid: true, units: 2 }, tags: ["demo", null] },
  };
}
function fixture(): BackupEnvelope {
  const wrong = { ...answers(), "poder-adquisitivo": 950 };
  const correct = answers();
  return {
    format: "forex-academy-pro", version: 1, exportedAt: "2026-10-11T11:00:00.000Z",
    tables: {
      profile: [{ id: "local-student", name: "Lucía", weeklyGoal: 5, createdAt: "2026-10-10T10:00:00.000Z", lastStudyAt: completedAt }],
      preferences: [{ id: "local", theme: "light", updatedAt: at }],
      lessonProgress: [{ lessonSlug: firstLesson.slug, readAt: at, completedAt }],
      attempts: [
        { id: "attempt-a", lessonSlug: firstLesson.slug, answers: wrong, createdAt: "2026-10-10T22:30:00.000Z", ...evaluateAnswers(firstLesson, wrong) },
        { id: "attempt-b", lessonSlug: firstLesson.slug, answers: correct, createdAt: passedAt, ...evaluateAnswers(firstLesson, correct) },
      ],
      studySessions: [{ id: "study-1", startedAt: at, lastHeartbeatAt: "2026-10-11T10:01:00.000Z" }],
      dailyActivity: [{ date: "2026-10-11", studySeconds: 60, attempts: 2, completions: 1 }],
      reviewConcepts: [{ concept: "Cálculo del poder adquisitivo", incorrectCount: 1, lastAttemptAt: "2026-10-10T22:30:00.000Z" }],
      demoTrades: [reserved("demo-1")],
      replaySessions: [reserved("replay-1")],
      backtestResults: [reserved("backtest-1")],
      journalEntries: [reserved("journal-1")],
    },
  };
}
function parsedFixture() { return parseBackup(JSON.stringify(fixture())); }

beforeEach(async () => {
  database = newDatabase();
  await initializeDatabase(database, new Date(at));
});
afterEach(async () => {
  for (const client of databases.splice(0)) {
    client.close();
    await client.delete();
  }
});

describe("portable backups", () => {
  it("round-trips every personal table, preferences and reserved future records", async () => {
    const original = parsedFixture();
    await restoreBackup(original, database);
    const exported = await exportBackup(database);
    const other = newDatabase();
    await restoreBackup(parseBackup(JSON.stringify(exported)), other);
    const restored = await exportBackup(other);
    expect(restored.tables).toEqual(exported.tables);
    expect(restored.tables).toEqual(original.tables);
    for (const table of TABLE_NAMES) expect(restored.tables[table].length).toBeGreaterThan(0);
    expect(restored.tables.preferences[0].theme).toBe("light");
    expect(restored.tables.journalEntries[0].metadata.nested).toEqual({ valid: true, units: 2 });
  });

  it("provides concrete preview counts without mutating the current profile", async () => {
    expect(backupPreview(parsedFixture())).toEqual({
      profileName: "Lucía", exportedAt: "2026-10-11T11:00:00.000Z", lessonsRead: 1,
      lessonsCompleted: 1, attempts: 2, studySeconds: 60, theme: "light", demoTrades: 1,
      replaySessions: 1, backtestResults: 1, journalEntries: 1, totalRecords: 12,
    });
    expect((await database.profile.get("local-student"))?.name).toBe("Estudiante");
  });

  it("replaces existing data instead of merging it", async () => {
    await database.journalEntries.add(reserved("local-only"));
    await restoreBackup(parsedFixture(), database);
    expect(await database.journalEntries.get("local-only")).toBeUndefined();
    expect(await database.journalEntries.get("journal-1")).toBeDefined();
  });

  it("revalidates an object changed after preview before writing any table", async () => {
    const parsed = parsedFixture();
    backupPreview(parsed);
    parsed.tables.attempts[0].answers["poder-adquisitivo"] = Number.NaN;
    const before = (await exportBackup(database)).tables;
    await expect(restoreBackup(parsed, database)).rejects.toThrow();
    expect((await exportBackup(database)).tables).toEqual(before);
  });

  it("takes a detached snapshot before asynchronous writes", async () => {
    const parsed = parsedFixture();
    const pending = restoreBackup(parsed, database);
    parsed.tables.profile[0].name = "Modificado después";
    parsed.tables.journalEntries[0].metadata.note = "Modificado después";
    await pending;
    expect((await database.profile.get("local-student"))?.name).toBe("Lucía");
    expect((await database.journalEntries.get("journal-1"))?.metadata.note).toBe("Registro reservado, no operación ejecutada");
  });

  it("rolls back every clear and write if one table write fails", async () => {
    await database.journalEntries.add(reserved("keep-me"));
    const before = (await exportBackup(database)).tables;
    const failWrite = () => { throw new Error("Simulated quota failure"); };
    database.preferences.hook("creating", failWrite);
    try {
      await expect(restoreBackup(parsedFixture(), database)).rejects.toThrow("Simulated quota failure");
    } finally {
      database.preferences.hook("creating").unsubscribe(failWrite);
    }
    expect((await exportBackup(database)).tables).toEqual(before);
  });

  it("resets all data atomically to a dark theme and the default student", async () => {
    await restoreBackup(parsedFixture(), database);
    await resetDatabase(database);
    const reset = await exportBackup(database);
    expect(reset.tables.profile[0]).toMatchObject({ id: "local-student", name: "Estudiante", weeklyGoal: 3, lastStudyAt: null });
    expect(reset.tables.preferences[0].theme).toBe("dark");
    expect(reset.tables.lessonProgress).toEqual([{ lessonSlug: firstLesson.slug, readAt: null, completedAt: null }]);
    for (const table of TABLE_NAMES.filter((name) => !["profile", "preferences", "lessonProgress"].includes(name))) {
      expect(reset.tables[table]).toEqual([]);
    }
  });

  it("rolls back reset if writing defaults fails", async () => {
    await restoreBackup(parsedFixture(), database);
    const before = (await exportBackup(database)).tables;
    const failWrite = () => { throw new Error("Reset write failed"); };
    database.preferences.hook("creating", failWrite);
    try {
      await expect(resetDatabase(database)).rejects.toThrow("Reset write failed");
    } finally {
      database.preferences.hook("creating").unsubscribe(failWrite);
    }
    expect((await exportBackup(database)).tables).toEqual(before);
  });
});

describe("backup validation and derivation", () => {
  it("recomputes forged grades, feedback, daily counts and review concepts", () => {
    const source = fixture();
    Object.assign(source.tables.attempts[0], {
      score: 100, passed: true, correctCount: 5,
      feedback: source.tables.attempts[0].feedback.map((item) => ({ ...item, correct: true, explanation: "Manipulado" })),
    });
    source.tables.dailyActivity[0].attempts = 999;
    source.tables.dailyActivity[0].completions = 999;
    source.tables.reviewConcepts = [];
    const actual = parseBackup(JSON.stringify(source));
    expect(actual.tables.attempts[0]).toMatchObject({ score: 80, passed: false, correctCount: 4 });
    expect(actual.tables.attempts[0].feedback.at(-1)?.correct).toBe(false);
    expect(actual.tables.attempts[0].feedback.at(-1)?.explanation).not.toBe("Manipulado");
    expect(actual.tables.dailyActivity).toEqual([{ date: "2026-10-11", studySeconds: 60, attempts: 2, completions: 1 }]);
    expect(actual.tables.reviewConcepts).toEqual(fixture().tables.reviewConcepts);
  });

  it("recreates derived activity dates in Europe/Madrid when absent", () => {
    const source = fixture();
    source.tables.dailyActivity = [];
    expect(parseBackup(JSON.stringify(source)).tables.dailyActivity).toEqual([
      { date: "2026-10-11", studySeconds: 0, attempts: 2, completions: 1 },
    ]);
  });

  const corruptions: [string, (source: BackupEnvelope) => void][] = [
    ["duplicate primary keys", (source) => { source.tables.attempts.push(structuredClone(source.tables.attempts[0])); }],
    ["unknown lesson", (source) => { source.tables.attempts[0].lessonSlug = "unknown"; }],
    ["missing progress", (source) => { source.tables.lessonProgress = []; }],
    ["unknown question", (source) => { source.tables.attempts[0].feedback[0].questionId = "unknown"; }],
    ["unknown answer key", (source) => { source.tables.attempts[0].answers["unknown"] = 100; }],
    ["missing read evidence", (source) => { source.tables.lessonProgress[0].readAt = null; }],
    ["missing passing attempt", (source) => { source.tables.attempts = [source.tables.attempts[0]]; }],
    ["forged completed status", (source) => { source.tables.attempts[1].answers["poder-adquisitivo"] = 950; }],
    ["completion before reading", (source) => { source.tables.lessonProgress[0].completedAt = "2026-10-10T10:00:00.000Z"; }],
    ["completion before passing", (source) => { source.tables.lessonProgress[0].completedAt = "2026-10-11T10:01:00.000Z"; }],
    ["noncanonical timestamp", (source) => { source.exportedAt = "2026-10-11T11:00:00Z"; }],
    ["impossible calendar date", (source) => { source.tables.dailyActivity[0].date = "2026-02-30"; }],
    ["excess study duration", (source) => { source.tables.dailyActivity[0].studySeconds = 86_401; }],
    ["negative counter", (source) => { source.tables.dailyActivity[0].attempts = -1; }],
    ["inverted session timestamps", (source) => { source.tables.studySessions[0].lastHeartbeatAt = "2026-10-10T10:00:00.000Z"; }],
    ["unknown envelope field", (source) => { Object.assign(source, { extra: true }); }],
  ];
  it.each(corruptions)("rejects %s without changing any existing table", async (_label, corrupt) => {
    await database.journalEntries.add(reserved("keep-me"));
    const before = (await exportBackup(database)).tables;
    const source = fixture();
    corrupt(source);
    await expect(restoreBackup(source, database)).rejects.toThrow();
    expect((await exportBackup(database)).tables).toEqual(before);
  });

  it("rejects future format versions without modifying data", async () => {
    const source = { ...fixture(), version: 2 };
    const before = (await exportBackup(database)).tables;
    expect(() => parseBackup(JSON.stringify(source))).toThrow(/versión/);
    await expect(restoreBackup(source as unknown as BackupEnvelope, database)).rejects.toThrow(/versión/);
    expect((await exportBackup(database)).tables).toEqual(before);
  });

  it("rejects oversized input before parsing, including UTF-8 multibyte text", () => {
    expect(() => parseBackup(" ".repeat(MAX_BACKUP_BYTES + 1))).toThrow(/10 MiB/);
    expect(() => parseBackup("é".repeat(Math.floor(MAX_BACKUP_BYTES / 2) + 1))).toThrow(/10 MiB/);
  });

  it.each(["__proto__", "constructor", "prototype"])("rejects dangerous JSON key %s inside nested metadata", (key) => {
    const source = fixture();
    source.tables.journalEntries[0].metadata = JSON.parse(`{"nested":{"${key}":{"polluted":true}}}`);
    expect(() => parseBackup(JSON.stringify(source))).toThrow(/clave no permitida/);
    expect(Object.hasOwn(Object.prototype, "polluted")).toBe(false);
  });

  it("rejects overly deep metadata and circular direct input", async () => {
    const source = fixture();
    let nested: Record<string, unknown> = {};
    source.tables.journalEntries[0].metadata = nested as ReservedRecord["metadata"];
    for (let depth = 0; depth < 25; depth++) {
      const next = {};
      nested.child = next;
      nested = next;
    }
    expect(() => parseBackup(JSON.stringify(source))).toThrow(/anidados/);
    const cycle = fixture();
    cycle.tables.journalEntries[0].metadata.self = cycle.tables.journalEntries[0].metadata;
    await expect(restoreBackup(cycle, database)).rejects.toThrow(/circulares/);
  });

  it("rejects malformed JSON, missing tables and excessive rows", () => {
    expect(() => parseBackup("{broken")).toThrow(/JSON/);
    expect(() => parseBackup(JSON.stringify({ format: "forex-academy-pro", version: 1, exportedAt: at, tables: {} }))).toThrow(/estructura/);
    const source = fixture();
    source.tables.journalEntries = Array.from({ length: 10_001 }, (_, index) => reserved(`entry-${index}`));
    expect(() => parseBackup(JSON.stringify(source))).toThrow(/registros|datos/);
  });
});

describe("schema upgrades and portable backup version", () => {
  it("preserves a v1 local database through the additive v2 migration and export", async () => {
    const name = databaseName();
    const legacy = new Dexie(name);
    databases.push(legacy);
    legacy.version(1).stores(SCHEMA_V1);
    await legacy.open();
    const source = fixture();
    for (const [table, rows] of Object.entries(source.tables)) {
      if (table !== "reviewConcepts") await legacy.table(table).bulkAdd(rows);
    }
    legacy.close();
    const upgraded = new AcademyDatabase(name);
    databases.push(upgraded);
    await initializeDatabase(upgraded);
    expect(upgraded.verno).toBe(2);
    expect(await upgraded.reviewConcepts.toArray()).toEqual(source.tables.reviewConcepts);
    const portable = await exportBackup(upgraded);
    expect(portable.version).toBe(1);
    expect(portable.tables.profile[0].name).toBe("Lucía");
    expect(portable.tables.journalEntries).toEqual(source.tables.journalEntries);
    await restoreBackup(portable, database);
    expect((await exportBackup(database)).tables).toEqual(portable.tables);
    upgraded.close();
  });
});
