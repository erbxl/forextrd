import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { generatePractice, gradePractice, nextPracticeDifficulty, type PracticeDifficulty } from "../src/modules/exercises/practice";
import { savePracticeAttempt } from "../src/modules/exercises/practice-storage";
import { AcademyDatabase, initializeDatabase } from "../src/modules/storage/db";
import { exportBackup, parseBackup, restoreBackup } from "../src/modules/storage/backup";

const databases: AcademyDatabase[] = [];
const database = () => { const db = new AcademyDatabase(`practice-${crypto.randomUUID()}`); databases.push(db); return db; };
afterEach(async () => { await Promise.all(databases.splice(0).map(db => db.delete())); });

describe("variantes y dificultad de práctica", () => {
  it.each([1, 2, 3] as PracticeDifficulty[])("dificultad %i: variantes reproducibles y operaciones contrastadas", difficulty => {
    for (let seed = 0; seed < 40; seed++) {
      const pips = generatePractice("pips", seed, difficulty);
      expect(generatePractice("pips", seed, difficulty)).toEqual(pips);
      const v = pips.inputs;
      const delta = (v.final - v.initial) / v.pip;
      const expected = difficulty < 3 ? delta : delta * v.units * v.pip * v.conversion;
      expect(Math.abs(pips.answer - expected)).toBeLessThan(.006);
      const size = generatePractice("position", seed, difficulty); const s = size.inputs;
      const risk = s.capital * s.riskPercent / 100, perLot = s.stopPips * s.pipValue + s.costPerLot;
      expect(size.answer * perLot).toBeLessThanOrEqual(risk + 1e-8);
      expect((size.answer + s.step) * perLot).toBeGreaterThan(risk - 1e-8);
      const expectancy = generatePractice("expectancy", seed, difficulty); const e = expectancy.inputs;
      expect(expectancy.answer).toBeCloseTo((e.winPercent / 100 * e.win - (1 - e.winPercent / 100) * e.loss - e.cost) * e.trades, 2);
      expect(gradePractice(size, size.answer + .01)).toBe(false);
    }
  });
  it("eleva tras tres aciertos, baja tras dos errores y restaura el historial", async () => {
    const db = database();
    for (let seed = 0; seed < 3; seed++) { const q = generatePractice("pips", seed, 1); await savePracticeAttempt({ ...q, response: q.answer }, db); }
    let history = await db.practiceAttempts.toArray();
    expect(nextPracticeDifficulty(history, "pips")).toBe(2);
    expect(nextPracticeDifficulty(history, "position")).toBe(1);
    await expect(savePracticeAttempt({ family: "pips", seed: 4, difficulty: 1, response: 0 }, db)).rejects.toThrow(/otra pestaña/);
    for (let seed = 4; seed < 6; seed++) { const q = generatePractice("pips", seed, 2); await savePracticeAttempt({ ...q, response: q.answer + 100 }, db); }
    history = await db.practiceAttempts.toArray();
    expect(nextPracticeDifficulty(history, "pips")).toBe(1);
    const backup = await exportBackup(db);
    const target = database(); await restoreBackup(parseBackup(JSON.stringify(backup)), target);
    expect(await target.practiceAttempts.toArray()).toEqual(history);
    const forged = backup.tables.practiceAttempts.find(item => item.sequence === 5)!;
    forged.correct = true;
    expect(parseBackup(JSON.stringify(backup)).tables.practiceAttempts.find(item => item.id === forged.id)!.correct).toBe(false);
  });
  it("una copia con captura de diario grande conserva su contenido", async () => {
    const db = database(); await initializeDatabase(db);
    const timestamp = new Date().toISOString();
    const capture = "data:image/png;base64," + "A".repeat(100000);
    await db.journalEntries.add({ id: "capture", createdAt: timestamp, updatedAt: timestamp, metadata: { capture } });
    expect((await exportBackup(db)).tables.journalEntries[0].metadata.capture).toBe(capture);
  });
  it("rechaza semillas, dificultad y respuestas no finitas", () => {
    expect(() => generatePractice("pips", -1, 1)).toThrow();
    expect(() => gradePractice(generatePractice("pips", 1, 1), Infinity)).toThrow();
  });
});
