import type { AssessmentResult, Lesson } from "../academy/types";

/** Pure grading function. Never trust a submitted score or coerce answer types. */
export function evaluateAnswers(
  lesson: Lesson,
  answers: Record<string, string | number>,
): AssessmentResult {
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
    throw new Error("Las respuestas deben ser un objeto.");
  }
  if (
    lesson.questions.length === 0 ||
    !Number.isFinite(lesson.passingScore) ||
    lesson.passingScore < 0 ||
    lesson.passingScore > 100
  ) {
    throw new Error("La evaluación no tiene una configuración válida.");
  }

  const questionIds = new Set(lesson.questions.map((question) => question.id));
  if (questionIds.size !== lesson.questions.length) {
    throw new Error("Los identificadores de las preguntas deben ser únicos.");
  }
  if (Reflect.ownKeys(answers).some((key) => typeof key !== "string" || !questionIds.has(key))) {
    throw new Error("La evaluación contiene preguntas desconocidas.");
  }

  const feedback = lesson.questions.map((question) => {
    if (!Object.hasOwn(answers, question.id)) {
      throw new Error(`Falta la respuesta a la pregunta: ${question.id}.`);
    }
    const submitted = answers[question.id];
    let correct: boolean;

    if (question.type === "number") {
      if (typeof submitted !== "number" || !Number.isFinite(submitted)) {
        throw new Error(`La respuesta a ${question.id} debe ser un número finito.`);
      }
      const tolerance = question.tolerance ?? 0;
      if (
        typeof question.answer !== "number" ||
        !Number.isFinite(question.answer) ||
        !Number.isFinite(tolerance) ||
        tolerance < 0
      ) {
        throw new Error(`La pregunta ${question.id} no tiene una solución numérica válida.`);
      }
      // Inclusive tolerance with a tiny allowance for binary decimal representation.
      // Exact questions (zero tolerance) still require exact equality.
      const roundingAllowance = tolerance === 0
        ? 0
        : Number.EPSILON * Math.max(1, Math.abs(submitted), Math.abs(question.answer)) * 4;
      correct = Math.abs(submitted - question.answer) <= tolerance + roundingAllowance;
    } else {
      if (
        (question.type !== "choice" && question.type !== "boolean") ||
        typeof question.answer !== "string" ||
        !question.options?.includes(question.answer)
      ) {
        throw new Error(`La pregunta ${question.id} no tiene opciones válidas.`);
      }
      if (typeof submitted !== "string" || !question.options.includes(submitted)) {
        throw new Error(`Selecciona una opción válida para la pregunta: ${question.id}.`);
      }
      correct = submitted === question.answer;
    }

    return {
      questionId: question.id,
      concept: question.concept,
      correct,
      explanation: question.explanation,
      correctAnswer: question.answer,
    };
  });

  const correctCount = feedback.filter((answer) => answer.correct).length;
  const totalCount = feedback.length;
  const exactScore = (correctCount / totalCount) * 100;
  const requiredPassed = lesson.questions.every(
    (question, index) => !question.required || feedback[index].correct,
  );

  return {
    score: Math.round(exactScore),
    passed: exactScore >= lesson.passingScore && requiredPassed,
    correctCount,
    totalCount,
    feedback,
  };
}
