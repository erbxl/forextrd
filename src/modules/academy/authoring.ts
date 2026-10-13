import type { Lesson, Question } from "./types";

export type LessonDraft = Omit<Lesson, "moduleId" | "durationMinutes" | "passingScore" | "completionCriteria" | "questions"> & {
  durationMinutes?: number;
  questions: Question[];
};

/** Only common presentation defaults; all explanations, examples and answers are authored. */
export function defineLesson(moduleId: number, draft: LessonDraft): Lesson {
  return {
    ...draft,
    moduleId,
    durationMinutes: draft.durationMinutes ?? 18,
    passingScore: 80,
    completionCriteria: [
      `Responder las ${draft.questions.length} preguntas y obtener al menos un 80 % de aciertos.`,
      ...(draft.questions.some(question => question.required) ? ["Resolver correctamente todas las preguntas marcadas como obligatorias."] : []),
      "Revisar las explicaciones y confirmar que has estudiado la unidad.",
    ],
  };
}
