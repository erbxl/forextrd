import { curriculum, getLesson, getModuleExam, getModuleLessons } from "./content";

export type Completion = { slug: string; completedAt: string | null };
export type ModuleProgress = { id: number; unlocked: boolean; completed: boolean; completedLessons: number; totalLessons: number; examReady: boolean; examSlug: string };

/** All gates derive from persisted completions; there is no separate unlock flag to lose. */
export function getModuleProgress(progress: Completion[]): ModuleProgress[] {
  const completed = new Set(progress.filter(item => item.completedAt).map(item => item.slug));
  let unlocked = true;
  return curriculum.map(module => {
    const units = getModuleLessons(module.id);
    const completedLessons = units.filter(lesson => completed.has(lesson.slug)).length;
    const examReady = unlocked && completedLessons === units.length;
    const examSlug = getModuleExam(module.id).slug;
    const done = examReady && completed.has(examSlug);
    const state = { id: module.id, unlocked, completed: done, completedLessons, totalLessons: units.length, examReady, examSlug };
    unlocked = done;
    return state;
  });
}

export function canStudy(slug: string, progress: Completion[]): boolean {
  const lesson = getLesson(slug);
  if (!lesson) return false;
  const module = getModuleProgress(progress)[lesson.moduleId];
  return lesson.kind === "exam" ? module.examReady : module.unlocked;
}

export function nextUnit(progress: Completion[]) {
  const completed = new Set(progress.filter(item => item.completedAt).map(item => item.slug));
  const module = getModuleProgress(progress).find(item => !item.completed);
  if (!module) return undefined;
  return getModuleLessons(module.id).find(lesson => !completed.has(lesson.slug)) ?? getModuleExam(module.id);
}
