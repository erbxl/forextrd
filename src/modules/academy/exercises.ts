import type { PublicQuestion } from "./types";

/** Question text and answer controls; solutions live in their own static module. */
export const firstLessonExercises: PublicQuestion[] = [
  {
    id: "funciones",
    type: "choice",
    concept: "Funciones del dinero",
    prompt: "Comparas una reparación de 20 € con otra de 25 €, sin pagar todavía. ¿Qué función del dinero estás utilizando?",
    options: ["Unidad de cuenta", "Medio de pago", "Depósito de valor"],
  },
  {
    id: "nominal-real",
    type: "choice",
    concept: "Nominal y real",
    prompt: "Tu saldo permanece igual y la misma cesta cuesta más. ¿Qué sucede?",
    options: ["El saldo nominal se mantiene y el poder adquisitivo disminuye", "El saldo nominal disminuye automáticamente", "El poder adquisitivo se mantiene porque el saldo no cambia"],
  },
  {
    id: "cesta-precios",
    type: "choice",
    concept: "Cesta e inflación",
    prompt: "En un ejemplo simulado, solo conoces que un producto subió un 10 %. ¿Puedes concluir que toda la cesta subió un 10 %?",
    options: ["No; necesito conocer los demás precios y el peso del producto en la cesta", "Sí; todos los precios suben a la misma tasa", "Sí; basta con elegir el producto que más ha subido"],
  },
  {
    id: "ahorro-real",
    type: "boolean",
    concept: "Rendimiento real",
    prompt: "En el escenario simulado, pasar de 1.000 € a 1.030 € mientras la cesta sube un 5 % implica ganar poder adquisitivo.",
    options: ["Verdadero", "Falso"],
  },
  {
    id: "poder-adquisitivo",
    type: "number",
    concept: "Cálculo del poder adquisitivo",
    prompt: "Escenario simulado: conservas 1.000 € sin intereses ni costes y la misma cesta se encarece un 5 %. ¿A cuántos euros con poder de compra inicial equivale tu saldo final? Redondea a dos decimales.",
    unit: "€ a precios iniciales",
    required: true,
  },
];
