import type { Question } from "./types";

export type QuestionSolution = Pick<Question, "answer" | "tolerance" | "explanation">;

/** Browser-visible educational solutions, not a protected certification answer key. */
export const firstLessonSolutions: Record<string, QuestionSolution> = {
  "funciones": {
    answer: "Unidad de cuenta",
    explanation: "Expresar ambos presupuestos en euros permite comparar sus importes: es la función de unidad de cuenta. El pago ocurriría al entregar dinero y el depósito de valor al reservarlo para otro momento.",
  },
  "nominal-real": {
    answer: "El saldo nominal se mantiene y el poder adquisitivo disminuye",
    explanation: "Un saldo nominal constante compra menos unidades cuando la cesta se encarece. El ajuste real describe esa pérdida de capacidad de compra; no modifica el saldo bancario.",
  },
  "cesta-precios": {
    answer: "No; necesito conocer los demás precios y el peso del producto en la cesta",
    explanation: "La variación de la cesta depende del coste de todos sus componentes y de sus cantidades. Una subida aislada no informa de la variación del gasto total.",
  },
  "ahorro-real": {
    answer: "Falso",
    explanation: "1.030 / 1,05 = 980,95 € a precios iniciales, menos que los 1.000 € del inicio. El saldo nominal aumenta un 3 %, pero la capacidad de compra disminuye aproximadamente un 1,90 %.",
  },
  "poder-adquisitivo": {
    answer: 952.38,
    tolerance: 0.01,
    explanation: "Divide el saldo por el factor de precios: 1.000 / (1 + 0,05) = 952,380952… €, que redondeado es 952,38 € a precios iniciales. Se acepta una diferencia máxima de 0,01 €. No restes directamente el 5 % al saldo.",
  },
};
