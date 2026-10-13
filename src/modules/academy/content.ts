import type { Lesson } from "./types";
import { firstLessonContent } from "./lessons/dinero";
import { firstLessonExercises } from "./exercises";
import { firstLessonSolutions } from "./solutions";
import { curriculum } from "./curriculum";
import { level0Lessons } from "./lessons/level-0";
import { level1Lessons } from "./lessons/level-1";
import { level2Lessons } from "./lessons/level-2";
import { level3Lessons } from "./lessons/level-3";
import { level4Lessons } from "./lessons/level-4";
import { level5Lessons } from "./lessons/level-5";
import { level6Lessons } from "./lessons/level-6";
import { level7Lessons } from "./lessons/level-7";
import { level8Lessons } from "./lessons/level-8";
import { level9Lessons } from "./lessons/level-9";
import { level10Lessons } from "./lessons/level-10";
import { level11Lessons } from "./lessons/level-11";
import { level12Lessons } from "./lessons/level-12";

export { curriculum } from "./curriculum";

/** Compatibility catalog assembled from separately maintained educational data. */
export const firstLesson: Lesson = {
  ...firstLessonContent,
  questions: firstLessonExercises.map((question) => {
    const solution = firstLessonSolutions[question.id];
    if (!solution) throw new Error(`Falta la solución para la pregunta: ${question.id}.`);
    return { ...question, ...solution };
  }),
};

export const lessons: Lesson[] = [firstLesson, ...level0Lessons, ...level1Lessons, ...level2Lessons, ...level3Lessons, ...level4Lessons, ...level5Lessons, ...level6Lessons, ...level7Lessons, ...level8Lessons, ...level9Lessons, ...level10Lessons, ...level11Lessons, ...level12Lessons];

export function getModuleLessons(moduleId: number) { return lessons.filter(lesson => lesson.moduleId === moduleId); }

// The cumulative exam deliberately revisits two different questions per unit.
// It is a transparent learning assessment, not a protected certification bank.
export const exams: Lesson[] = curriculum.map(module => {
  const units = getModuleLessons(module.id);
  const questions = units.flatMap((lesson, index) => {
    const first = lesson.questions[index % lesson.questions.length];
    const second = lesson.questions.find(question => question.id !== first.id && question.required) ?? lesson.questions[(index + 1) % lesson.questions.length];
    return [first, second].map((question, number) => ({ ...question, id: `exam-${module.id}-${index}-${number}` }));
  });
  return {
    kind: "exam", slug: `examen-nivel-${module.id}`, title: `Examen del nivel ${module.id}: ${module.title}`,
    subtitle: "Integra lo aprendido y comprueba que puedes avanzar al siguiente nivel.", moduleId: module.id,
    durationMinutes: 25, objectives: units.map(lesson => lesson.title), prerequisites: ["Completar todas las lecciones de este nivel."],
    sections: [], workedExample: { title: "", scenario: "", steps: [], conclusion: "" }, commonMistakes: [], summary: [], relatedConcepts: module.topics, sources: [],
    questions, passingScore: 80, completionCriteria: ["Responder el examen completo con al menos un 80 % de aciertos.", "Resolver todas las preguntas obligatorias.", "Confirmar la revisión para completar el nivel y desbloquear el siguiente."],
  };
});

export const learningUnits = [...lessons, ...exams];
const bySlug = new Map(learningUnits.map(lesson => [lesson.slug, lesson]));
export function getLesson(slug: string): Lesson | undefined { return bySlug.get(slug); }
export function getModuleExam(moduleId: number): Lesson { return exams[moduleId]; }
