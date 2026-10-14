export type PracticeFamily = "pips" | "position" | "expectancy";
export type PracticeDifficulty = 1 | 2 | 3;
export type PracticeExercise = {
  family: PracticeFamily;
  seed: number;
  difficulty: PracticeDifficulty;
  generatorVersion: 1;
  title: string;
  prompt: string;
  answer: number;
  tolerance: number;
  unit: string;
  explanation: string;
  inputs: Record<string, number>;
};
export type PracticeHistory = { family: PracticeFamily; sequence: number; difficulty: PracticeDifficulty; correct: boolean };

export const practiceFamilies: { id: PracticeFamily; title: string; description: string }[] = [
  { id: "pips", title: "Distancia y valor de los pips", description: "Practica pares convencionales, cotizaciones JPY y conversiones a la divisa de cuenta." },
  { id: "position", title: "Tamaño de posición", description: "Calcula lotes a partir del riesgo, el stop y los costes, redondeando hacia abajo." },
  { id: "expectancy", title: "Esperanza matemática", description: "Combina probabilidades, resultados y costes sin confundir acierto con rentabilidad." },
];
const format = (value: number, decimals = 5) => new Intl.NumberFormat("es-ES", { maximumFractionDigits: decimals, useGrouping: false }).format(value);
const round = (value: number, decimals = 5) => Number(value.toFixed(decimals));

/** Version 1 remains deterministic so exported attempts can always be regraded. */
export function generatePractice(family: PracticeFamily, seed: number, difficulty: PracticeDifficulty): PracticeExercise {
  if (!practiceFamilies.some(item => item.id === family) || !Number.isInteger(seed) || seed < 0 || seed > 0xffffffff || ![1, 2, 3].includes(difficulty)) {
    throw new Error("Selecciona una familia, semilla y dificultad válidas.");
  }
  let state = seed >>> 0;
  const integer = (min: number, max: number) => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return min + Math.floor((state / 4294967296) * (max - min + 1));
  };
  const base = { family, seed, difficulty, generatorVersion: 1 as const, tolerance: 0.01 };
  if (family === "pips") {
    const jpy = difficulty > 1 && integer(0, 1) === 1;
    const pip = jpy ? 0.01 : 0.0001;
    const initial = jpy ? integer(13000, 16000) / 100 : integer(10500, 12500) / 10000;
    const pips = integer(12, difficulty === 1 ? 60 : 120) * (integer(0, 1) ? 1 : -1);
    const final = round(initial + pips * pip);
    if (difficulty < 3) return {
      ...base, title: "Distancia con signo", unit: "pips", answer: pips,
      prompt: `Una cotización ${jpy ? "USD/JPY" : "EUR/USD"} pasa de ${format(initial)} a ${format(final)}. Un pip equivale a ${format(pip)}. ¿Cuál es la variación con signo en pips?`,
      explanation: `Resta precio final menos inicial y divide por el pip: (${format(final)} − ${format(initial)}) / ${format(pip)} = ${pips} pips. El signo describe el precio, no el beneficio de una posición de venta.`,
      inputs: { initial, final, pip, pips },
    };
    const units = integer(1, 8) * 10000;
    const conversion = jpy ? integer(58, 70) / 10000 : integer(85, 98) / 100;
    const answer = round(pips * units * pip * conversion, 2);
    return {
      ...base, title: "Pips convertidos a euros", unit: "€", answer,
      prompt: `Compra simulada de ${format(units)} unidades de ${jpy ? "USD/JPY" : "EUR/USD"}: entrada ${format(initial)}, salida ${format(final)}, pip ${format(pip)}. Usa una conversión fija de ${format(conversion)} EUR por 1 ${jpy ? "JPY" : "USD"}. Sin costes, ¿cuál es el resultado en euros? Redondea a dos decimales.`,
      explanation: `La variación es ${pips} pips. Cada pip vale ${format(units * pip)} en divisa cotizada: ${format(units)} × ${format(pip)}. Resultado en EUR = ${pips} × ${format(units * pip)} × ${format(conversion)} = ${format(answer, 2)} €. La conversión es un supuesto fijo del ejercicio.`,
      inputs: { initial, final, pip, pips, units, conversion },
    };
  }
  if (family === "position") {
    const capital = integer(2, 20) * 1000;
    const riskPercent = difficulty === 1 ? 1 : integer(1, 4) * 0.25;
    const stopPips = integer(2, 10) * 5;
    const pipValue = difficulty < 3 ? 10 : integer(7, 12);
    const costPerLot = difficulty === 1 ? 0 : integer(3, 10);
    const step = 0.01;
    const riskCash = capital * riskPercent / 100;
    const rawLots = riskCash / (stopPips * pipValue + costPerLot);
    const answer = Math.floor((rawLots + 1e-12) / step) * step;
    return {
      ...base, tolerance: 0.000001, title: "Lotes dentro del presupuesto", unit: "lotes", answer: round(answer, 2),
      prompt: `Cuenta de ${format(capital)} €, riesgo planificado del ${format(riskPercent)} %, stop de ${stopPips} pips y valor por pip de ${format(pipValue)} € por lote. Los costes completos son ${costPerLot} € por lote. Paso mínimo: 0,01 lotes. ¿Cuántos lotes permiten ese presupuesto? Redondea siempre hacia abajo al paso permitido.`,
      explanation: `Presupuesto = ${format(capital)} × ${format(riskPercent)} / 100 = ${format(riskCash)} €. Pérdida prevista por lote = ${stopPips} × ${pipValue} + ${costPerLot} = ${format(stopPips * pipValue + costPerLot)} €. Tamaño bruto = ${format(rawLots)} lotes; al redondear hacia abajo resulta ${format(answer, 2)}. Un stop ordinario no garantiza esa pérdida ante gaps o deslizamiento.`,
      inputs: { capital, riskPercent, stopPips, pipValue, costPerLot, step },
    };
  }
  const winPercent = integer(3, 7) * 10;
  const win = integer(2, difficulty === 1 ? 4 : 8) / (difficulty === 1 ? 1 : 2);
  const loss = difficulty === 1 ? 1 : integer(1, 3) / 2;
  const cost = difficulty === 1 ? 0 : integer(1, 4) / 10;
  const trades = difficulty === 3 ? integer(2, 10) * 10 : 1;
  const expectancy = (winPercent / 100) * win - (1 - winPercent / 100) * loss - cost;
  const answer = round(expectancy * trades, 2);
  return {
    ...base, title: difficulty === 3 ? "Resultado esperado de una muestra" : "Esperanza neta por operación", unit: difficulty === 3 ? "R" : "R / operación", answer,
    prompt: `Modelo simulado: ${winPercent} % de aciertos, ganancia media bruta ${format(win)} R, pérdida media bruta ${format(loss)} R y coste de ${format(cost)} R por operación. ${difficulty === 3 ? `Si esas medias permanecen constantes, calcula el resultado esperado de ${trades} operaciones, en R.` : "Calcula la esperanza neta por operación, en R."} Redondea a dos decimales.`,
    explanation: `Esperanza neta = ${format(winPercent / 100)} × ${format(win)} − ${format(1 - winPercent / 100)} × ${format(loss)} − ${format(cost)} = ${format(expectancy)} R por operación.${difficulty === 3 ? ` Multiplicada por ${trades}: ${format(answer)} R.` : ""} Es una media del modelo; no garantiza un resultado realizado. El coste se resta una sola vez porque las ganancias y pérdidas dadas son brutas.`,
    inputs: { winPercent, win, loss, cost, trades },
  };
}

export function gradePractice(exercise: PracticeExercise, response: number): boolean {
  if (!Number.isFinite(response)) throw new Error("Escribe una respuesta numérica finita.");
  return Math.abs(response - exercise.answer) <= exercise.tolerance + Number.EPSILON * Math.max(1, Math.abs(response), Math.abs(exercise.answer)) * 4;
}

/** Three consecutive successes increase difficulty; two mistakes reduce it.
 * Streaks restart when the difficulty changes and are separate for each family. */
export function nextPracticeDifficulty(history: PracticeHistory[], family: PracticeFamily): PracticeDifficulty {
  const attempts = history.filter(item => item.family === family).sort((a, b) => b.sequence - a.sequence);
  if (!attempts.length) return 1;
  const current = attempts[0];
  let streak = 0;
  for (const attempt of attempts) {
    if (attempt.difficulty !== current.difficulty || attempt.correct !== current.correct) break;
    streak++;
  }
  if (current.correct && streak >= 3) return Math.min(3, current.difficulty + 1) as PracticeDifficulty;
  if (!current.correct && streak >= 2) return Math.max(1, current.difficulty - 1) as PracticeDifficulty;
  return current.difficulty;
}
