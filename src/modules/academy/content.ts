import type { Lesson } from "./types";
import { firstLessonContent } from "./lessons/dinero";
import { firstLessonExercises } from "./exercises";
import { firstLessonSolutions } from "./solutions";

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

export function getLesson(slug: string): Lesson | undefined {
  return slug === firstLesson.slug ? firstLesson : undefined;
}
