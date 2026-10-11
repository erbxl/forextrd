import { describe, expect, it } from "vitest";
import { curriculum, firstLesson, getLesson } from "../src/modules/academy/content";
import type { Lesson } from "../src/modules/academy/types";
import { evaluateAnswers } from "../src/modules/exercises/evaluate";

function correctAnswers(): Record<string, string | number> {
  return {
    funciones: "Unidad de cuenta",
    "nominal-real": "El saldo nominal se mantiene y el poder adquisitivo disminuye",
    "cesta-precios": "No; necesito conocer los demás precios y el peso del producto en la cesta",
    "ahorro-real": "Falso",
    "poder-adquisitivo": 952.38,
  };
}

describe("first educational unit", () => {
  it("publishes only the implemented lesson and marks all later levels as planned", () => {
    expect(curriculum.map((module) => module.id)).toEqual(Array.from({ length: 13 }, (_, index) => index));
    expect(curriculum.filter((module) => module.status === "available").map((module) => module.id)).toEqual([0]);
    expect(getLesson("dinero-y-poder-adquisitivo")).toBe(firstLesson);
    expect(getLesson("leccion-inexistente")).toBeUndefined();
  });

  it("uses the independently derived reference purchasing power", () => {
    // 1,000 euros buy 1,000 / 10.50 units; value those at the original 10 euros.
    const originalBasketPrice = 10;
    const laterBasketPrice = 10.5;
    const originalPriceEquivalent = (1000 / laterBasketPrice) * originalBasketPrice;
    expect(originalPriceEquivalent).toBeCloseTo(952.3809523809524, 10);
    const result = evaluateAnswers(firstLesson, {
      ...correctAnswers(),
      "poder-adquisitivo": originalPriceEquivalent,
    });
    expect(result).toMatchObject({ score: 100, passed: true, correctCount: 5, totalCount: 5 });
    expect(result.feedback.every((answer) => answer.correct && answer.explanation.length > 0)).toBe(true);
  });

  it("passes at exactly 80% when the mandatory calculation is correct", () => {
    const result = evaluateAnswers(firstLesson, { ...correctAnswers(), funciones: "Medio de pago" });
    expect(result).toMatchObject({ score: 80, passed: true, correctCount: 4 });
    expect(result.feedback[0]).toMatchObject({ correct: false, correctAnswer: "Unidad de cuenta" });
  });

  it("requires the calculation even with an 80% overall score", () => {
    const result = evaluateAnswers(firstLesson, { ...correctAnswers(), "poder-adquisitivo": 950 });
    expect(result).toMatchObject({ score: 80, passed: false, correctCount: 4 });
    expect(result.feedback.at(-1)?.correct).toBe(false);
  });

  it("fails below the threshold even with a correct mandatory calculation", () => {
    const result = evaluateAnswers(firstLesson, {
      ...correctAnswers(),
      funciones: "Medio de pago",
      "ahorro-real": "Verdadero",
    });
    expect(result).toMatchObject({ score: 60, passed: false, correctCount: 3 });
  });

  it.each([952.37, 952.38, 952.39, 1000 / 1.05])("accepts a value inside the inclusive cent tolerance: %s", (amount) => {
    expect(evaluateAnswers(firstLesson, { ...correctAnswers(), "poder-adquisitivo": amount }).passed).toBe(true);
  });

  it.each([952.36999, 952.39001, 950, 1050, -952.38, 0])("rejects an incorrect calculation without treating it as malformed: %s", (amount) => {
    const result = evaluateAnswers(firstLesson, { ...correctAnswers(), "poder-adquisitivo": amount });
    expect(result.passed).toBe(false);
    expect(result.feedback.at(-1)?.correct).toBe(false);
  });

  it("does not mutate answers or lesson data and returns repeatable grades", () => {
    const answers = Object.freeze(correctAnswers());
    const snapshot = JSON.stringify(firstLesson);
    const first = evaluateAnswers(firstLesson, answers);
    expect(evaluateAnswers(firstLesson, answers)).toEqual(first);
    expect(JSON.stringify(firstLesson)).toBe(snapshot);
  });
});

describe("assessment input boundary", () => {
  it("rejects missing question IDs", () => {
    const answers = correctAnswers();
    delete answers["ahorro-real"];
    expect(() => evaluateAnswers(firstLesson, answers)).toThrow(/Falta la respuesta/);
  });

  it("rejects unknown question IDs instead of trusting a client-supplied score", () => {
    expect(() => evaluateAnswers(firstLesson, { ...correctAnswers(), score: 100 })).toThrow(/desconocidas/);
  });

  it("does not use inherited answers", () => {
    const answers = Object.create(correctAnswers()) as Record<string, string | number>;
    expect(() => evaluateAnswers(firstLesson, answers)).toThrow(/Falta la respuesta/);
  });

  it("rejects symbol keys", () => {
    const answers = { ...correctAnswers(), [Symbol("untrusted")]: 1 };
    expect(() => evaluateAnswers(firstLesson, answers)).toThrow(/desconocidas/);
  });

  it.each([NaN, Infinity, -Infinity, "952.38", "952,38", "", null, undefined])("rejects a malformed numerical answer: %s", (value) => {
    const answers = { ...correctAnswers(), "poder-adquisitivo": value } as Record<string, string | number>;
    expect(() => evaluateAnswers(firstLesson, answers)).toThrow(/número finito/);
  });

  it.each(["Opción inventada", "unidad de cuenta", 0, null, undefined])("rejects unrecognized choice values: %s", (value) => {
    const answers = { ...correctAnswers(), funciones: value } as Record<string, string | number>;
    expect(() => evaluateAnswers(firstLesson, answers)).toThrow(/opción válida/);
  });

  it("uses the documented boolean option strings and rejects coerced booleans", () => {
    const answers = { ...correctAnswers(), "ahorro-real": false } as unknown as Record<string, string | number>;
    expect(() => evaluateAnswers(firstLesson, answers)).toThrow(/opción válida/);
  });

  it.each([null, undefined, [], "answers", 1])("rejects malformed answer containers: %s", (value) => {
    expect(() => evaluateAnswers(firstLesson, value as unknown as Record<string, string | number>)).toThrow(/objeto/);
  });
});

describe("assessment definition safeguards", () => {
  it("does not pass an assessment with no questions", () => {
    expect(() => evaluateAnswers({ ...firstLesson, questions: [] }, {})).toThrow(/configuración válida/);
  });

  it("rejects duplicated IDs so one answer cannot earn several marks", () => {
    const lesson = { ...firstLesson, questions: [firstLesson.questions[0], firstLesson.questions[0]] };
    expect(() => evaluateAnswers(lesson, { funciones: "Unidad de cuenta" })).toThrow(/únicos/);
  });

  it.each([-1, 101, NaN, Infinity])("rejects an invalid passing threshold: %s", (passingScore) => {
    expect(() => evaluateAnswers({ ...firstLesson, passingScore }, correctAnswers())).toThrow(/configuración válida/);
  });

  it.each([-1, NaN, Infinity])("rejects invalid numerical tolerance: %s", (tolerance) => {
    const lesson: Lesson = {
      ...firstLesson,
      questions: firstLesson.questions.map((question) => question.type === "number" ? { ...question, tolerance } : question),
    };
    expect(() => evaluateAnswers(lesson, correctAnswers())).toThrow(/solución numérica válida/);
  });

  it("requires exact equality when tolerance is zero", () => {
    const lesson: Lesson = {
      ...firstLesson,
      questions: firstLesson.questions.map((question) => question.type === "number" ? { ...question, tolerance: 0 } : question),
    };
    expect(evaluateAnswers(lesson, correctAnswers()).passed).toBe(true);
    expect(evaluateAnswers(lesson, { ...correctAnswers(), "poder-adquisitivo": 952.380000000001 }).passed).toBe(false);
  });
});
