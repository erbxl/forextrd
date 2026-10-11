import type { AssessmentResult } from "@/modules/academy/types";

export type Theme = "dark" | "light";
export type LocalProfile = {
  id: "local-student";
  name: string;
  weeklyGoal: number;
  createdAt: string;
  lastStudyAt: string | null;
};
export type Preferences = { id: "local"; theme: Theme; updatedAt: string };
export type StoredLessonProgress = { lessonSlug: string; readAt: string | null; completedAt: string | null };
export type StoredAttempt = AssessmentResult & {
  id: string;
  lessonSlug: string;
  answers: Record<string, string | number>;
  createdAt: string;
};
export type StudySession = { id: string; startedAt: string; lastHeartbeatAt: string };
export type DailyActivity = { date: string; studySeconds: number; attempts: number; completions: number };
export type ReviewConcept = { concept: string; incorrectCount: number; lastAttemptAt: string };
export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
// Reserved records are portable local data. Their presence does not enable the
// future simulator, replay, backtesting or journal interfaces.
export type ReservedRecord = { id: string; createdAt: string; updatedAt: string; metadata: Record<string, JsonValue> };

export type PersonalTables = {
  profile: LocalProfile[];
  preferences: Preferences[];
  lessonProgress: StoredLessonProgress[];
  attempts: StoredAttempt[];
  studySessions: StudySession[];
  dailyActivity: DailyActivity[];
  reviewConcepts: ReviewConcept[];
  demoTrades: ReservedRecord[];
  replaySessions: ReservedRecord[];
  backtestResults: ReservedRecord[];
  journalEntries: ReservedRecord[];
};

export const TABLE_NAMES = [
  "profile", "preferences", "lessonProgress", "attempts", "studySessions", "dailyActivity",
  "reviewConcepts", "demoTrades", "replaySessions", "backtestResults", "journalEntries",
] as const satisfies readonly (keyof PersonalTables)[];

export function deriveReviewConcepts(attempts: StoredAttempt[]): ReviewConcept[] {
  const concepts = new Map<string, ReviewConcept>();
  for (const attempt of attempts) for (const outcome of attempt.feedback) {
    if (outcome.correct) continue;
    const previous = concepts.get(outcome.concept);
    concepts.set(outcome.concept, {
      concept: outcome.concept,
      incorrectCount: (previous?.incorrectCount ?? 0) + 1,
      lastAttemptAt: previous && previous.lastAttemptAt > attempt.createdAt ? previous.lastAttemptAt : attempt.createdAt,
    });
  }
  return [...concepts.values()];
}
