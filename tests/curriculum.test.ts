import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { curriculum, exams, firstLesson, getModuleLessons, learningUnits, lessons } from "../src/modules/academy/content";
import { canStudy, getModuleProgress, nextUnit } from "../src/modules/academy/progression";
import { evaluateAnswers } from "../src/modules/exercises/evaluate";
import { AcademyDatabase, initializeDatabase } from "../src/modules/storage/db";
import { completeLesson, getProgress, saveAttempt } from "../src/modules/progress/service";
import { exportBackup, parseBackup, restoreBackup } from "../src/modules/storage/backup";

describe("programa completo y progresión real",()=>{
  it("publica 13 niveles, 104 lecciones sustantivas y 13 exámenes",()=>{
    expect(curriculum).toHaveLength(13);expect(lessons).toHaveLength(104);expect(exams).toHaveLength(13);expect(new Set(learningUnits.map(lesson=>lesson.slug)).size).toBe(117);
    expect(lessons.reduce((sum,lesson)=>sum+lesson.questions.length,0)).toBeGreaterThanOrEqual(300);
    for(const module of curriculum)expect(getModuleLessons(module.id)).toHaveLength(8);
    for(const lesson of lessons){const words=lesson.sections.flatMap(section=>section.paragraphs).join(" ").split(/\s+/).length;expect(words,lesson.slug).toBeGreaterThanOrEqual(350);expect(lesson.workedExample.steps.length,lesson.slug).toBeGreaterThanOrEqual(3);expect(lesson.commonMistakes.length).toBeGreaterThanOrEqual(2);expect(lesson.sources.length).toBeGreaterThan(0);expect(lesson.objectives.length).toBeGreaterThanOrEqual(3);expect(lesson.questions.length).toBeGreaterThanOrEqual(4);}
  });
  it("todas las soluciones son evaluables y las preguntas únicas dentro de cada unidad",()=>{
    for(const lesson of learningUnits){for(const question of lesson.questions){expect(question.id.length).toBeLessThanOrEqual(80);expect(question.explanation.length).toBeGreaterThan(15);}
      const answers=Object.fromEntries(lesson.questions.map(question=>[question.id,question.answer]));expect(evaluateAnswers(lesson,answers),lesson.slug).toMatchObject({passed:true,score:100});}
  });
  it("la primera lección no completa el nivel ni habilita su examen",()=>{
    const progress=[{slug:firstLesson.slug,completedAt:new Date().toISOString()}];expect(getModuleProgress(progress)[0]).toMatchObject({completed:false,completedLessons:1,examReady:false,unlocked:true});expect(getModuleProgress(progress)[1].unlocked).toBe(false);expect(canStudy(exams[0].slug,progress)).toBe(false);expect(nextUnit(progress)?.slug).toBe(getModuleLessons(0)[1].slug);
  });
  it("recorre los 13 niveles, guarda resultados, respeta gates y restaura la progresión",async()=>{
    const client=new AcademyDatabase(`curriculum-${crypto.randomUUID()}`);const restored=new AcademyDatabase(`curriculum-restore-${crypto.randomUUID()}`);const now=new Date("2026-10-13T12:00:00.000Z");
    try {await initializeDatabase(client,now);const later=getModuleLessons(1)[0];await expect(saveAttempt(later.slug,Object.fromEntries(later.questions.map(q=>[q.id,q.answer])),client,now)).rejects.toThrow("nivel anterior");expect(await client.attempts.count()).toBe(0);
      for(const module of curriculum){const exam=exams[module.id];await expect(saveAttempt(exam.slug,Object.fromEntries(exam.questions.map(q=>[q.id,q.answer])),client,now)).rejects.toThrow();
        for(const lesson of [...getModuleLessons(module.id),exam]){await saveAttempt(lesson.slug,Object.fromEntries(lesson.questions.map(question=>[question.id,question.answer])),client,now);await completeLesson(lesson.slug,true,client,now);}
        const snapshot=await getProgress(client,now);expect(snapshot.stats.completedModules).toBe(module.id+1);expect(snapshot.stats.completedLessons).toBe((module.id+1)*8);if(module.id<12)expect(getModuleProgress(snapshot.lessons)[module.id+1].unlocked).toBe(true);
      }
      expect(nextUnit((await getProgress(client,now)).lessons)).toBeUndefined();const envelope=await exportBackup(client);await restoreBackup(parseBackup(JSON.stringify(envelope)),restored);expect((await getProgress(restored,now)).stats).toMatchObject({completedLessons:104,completedModules:13,totalAttempts:117});
    }finally{await client.delete();await restored.delete();}
  },30000);
});
