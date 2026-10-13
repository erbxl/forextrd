export type Question = {
  id: string;
  type: "choice" | "boolean" | "number" | "text" | "order";
  concept: string;
  prompt: string;
  options?: string[];
  answer: string | number;
  tolerance?: number;
  explanation: string;
  unit?: string;
  required?: boolean;
  acceptedAnswers?: string[];
  chart?: { candles: { open: number; high: number; low: number; close: number }[]; caption: string };
};
export type PublicQuestion = Omit<Question, "answer" | "tolerance" | "explanation" | "acceptedAnswers">;
export type LessonSection = {
  id: string;
  title: string;
  paragraphs: string[];
  takeaway?: string;
};
export type Lesson = {
  kind?: "lesson" | "exam";
  diagram?: { title: string; nodes: string[]; caption: string };
  slug: string;
  title: string;
  subtitle: string;
  moduleId: number;
  durationMinutes: number;
  objectives: string[];
  prerequisites: string[];
  sections: LessonSection[];
  workedExample: { title: string; scenario: string; steps: string[]; conclusion: string };
  commonMistakes: { mistake: string; correction: string }[];
  summary: string[];
  relatedConcepts: string[];
  sources: { title: string; url: string; note: string }[];
  questions: Question[];
  passingScore: number;
  completionCriteria: string[];
};
export type CurriculumModule = {
  id: number;
  title: string;
  description: string;
  topics: string[];
  status: "available" | "planned";
};
export type GradedAnswer = {
  questionId: string;
  concept: string;
  correct: boolean;
  explanation: string;
  correctAnswer: string | number;
};
export type AssessmentResult = {
  score: number;
  passed: boolean;
  correctCount: number;
  totalCount: number;
  feedback: GradedAnswer[];
};
