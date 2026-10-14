import "fake-indexeddb/auto";
import { describe,it,expect } from "vitest";
import { journalAnalytics, journalSchema, tradeResult, saveJournalEntry, getJournalEntries, type JournalEntry } from "../src/modules/journal/service";
import { AcademyDatabase } from "../src/modules/storage/db";

const sample:JournalEntry={openedAt:"2026-10-13T09:00:00.000Z",closedAt:"2026-10-13T10:00:00.000Z",pair:"EUR/USD",direction:"buy",entry:1.1,exit:1.102,stop:1.098,target:1.104,units:10000,quoteToAccount:1,costs:2,strategy:"Reglas de prueba",entryReason:"Ruptura confirmada",exitReason:"Salida temporal",emotionBefore:"Tranquilidad",emotionAfter:"Revisión",errors:[],notes:"Escenario simulado",followedPlan:true};

describe("diario con resultados derivados y calidad del proceso independiente",()=>{
  it("deriva neto y R con costes y conversión explícitos",()=>{expect(tradeResult(sample).net).toBeCloseTo(18);expect(tradeResult(sample).risk).toBeCloseTo(20);expect(tradeResult(sample).r).toBeCloseTo(.9);const sell={...sample,direction:"sell" as const,stop:1.102,target:1.096,exit:1.098};expect(tradeResult(sell).net).toBeCloseTo(18);expect(tradeResult({...sample,initialRisk:22}).r).toBeCloseTo(18/22);});
  it("los abonos de financiación aumentan el neto sin cambiar el riesgo inicial",()=>{const credited={...sample,costs:-3};expect(journalSchema.safeParse(credited).success).toBe(true);expect(tradeResult(credited).net).toBeCloseTo(23);expect(tradeResult(credited).risk).toBeCloseTo(20);});
  it("una pérdida con plan respetado no deteriora disciplina",()=>{const losing={...sample,exit:1.098};const stats=journalAnalytics([sample,losing]);expect(stats.discipline).toBe(100);expect(stats.net).toBeCloseTo(-4);expect(stats.profitFactor).toBeCloseTo(18/22);expect(stats.errors).toEqual([]);expect(stats.groups[0].count).toBe(2);});
  it("rechaza stop invertido, tiempos imposibles e imágenes no permitidas",()=>{expect(journalSchema.safeParse({...sample,stop:1.101}).success).toBe(false);expect(journalSchema.safeParse({...sample,closedAt:"2020-01-01T00:00:00.000Z"}).success).toBe(false);expect(journalSchema.safeParse({...sample,image:"javascript:alert(1)"}).success).toBe(false);});
  it("persistencia, edición y conservación de fecha original",async()=>{const db=new AcademyDatabase(`journal-test-${crypto.randomUUID()}`);try{const saved=await saveJournalEntry(sample,undefined,db);await saveJournalEntry({...sample,notes:"Revisión posterior"},saved.id,db);const entries=await getJournalEntries(db);expect(entries).toHaveLength(1);expect(entries[0].notes).toBe("Revisión posterior");expect(entries[0].createdAt).toBe(saved.createdAt);expect(entries[0].id).toBe(saved.id);}finally{await db.delete();}});
});
