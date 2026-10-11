export type LessonProgressView = {
  slug: string;
  readAt: string | null;
  completedAt: string | null;
  bestScore: number;
  passed: boolean;
  attemptsCount: number;
};
export type ProgressSnapshot = {
  user: { name: string; weeklyGoal: number };
  lessons: LessonProgressView[];
  stats: {
    completedLessons: number;
    publishedLessons: number;
    totalAttempts: number;
    answeredQuestions: number;
    correctAnswers: number;
    accuracy: number | null;
    studySeconds: number;
    streak: number;
    weeklyStudyDays: number;
  };
  activity: { date: string; studySeconds: number; attempts: number; completions: number }[];
  weaknesses: { concept: string; incorrectCount: number }[];
  recentAttempts: { id: string; lessonSlug: string; score: number; passed: boolean; createdAt: string }[];
};
