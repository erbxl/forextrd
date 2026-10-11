import type { Lesson } from "../types";

/** Static teaching content, independent of question definitions and grading solutions. */
export const firstLessonContent: Omit<Lesson, "questions"> = {
  slug: "dinero-y-poder-adquisitivo",
  title: "Dinero, precios y poder adquisitivo",
  subtitle: "Tu saldo cuenta euros. Los precios determinan lo que puedes comprar con ellos.",
  moduleId: 0,
  durationMinutes: 20,
  objectives: [
    "Reconocer las tres funciones del dinero en situaciones cotidianas.",
    "Distinguir un importe nominal de su poder de compra real.",
    "Diferenciar una subida de precio aislada de la inflación de una cesta.",
    "Calcular el poder adquisitivo de 1.000 € cuando una cesta se encarece un 5 %.",
    "Explicar los supuestos del cálculo y comprobar sus unidades y resultado.",
  ],
  prerequisites: [
    "No necesitas conocimientos de Forex ni experiencia invirtiendo.",
    "Debes poder multiplicar, dividir y convertir un porcentaje: 5 % = 0,05.",
    "Puedes utilizar una calculadora y repetir la evaluación tantas veces como necesites.",
  ],
  sections: [
    {
      id: "dinero",
      title: "01. El dinero permite coordinar intercambios",
      paragraphs: [
        "Imagina que haces pan y necesitas reparar una bicicleta. En un intercambio directo tendrías que encontrar a alguien que sepa repararla y quiera exactamente el pan que ofreces. En un ejemplo con dinero, puedes vender el pan a una persona y pagar la reparación a otra. Has separado dos intercambios que no necesitaban coincidir.",
        "El BCE distingue tres funciones: medio de pago, unidad de cuenta y depósito de valor. Pagar la reparación ilustra la primera; comparar dos presupuestos expresados en euros, la segunda; reservar parte del cobro para otro día, la tercera. Depósito de valor describe una función: no garantiza que la cantidad ahorrada compre siempre lo mismo. Fuente: BCE, «¿Qué es el dinero?», enlazada al final.",
        "Prueba mental: si una tienda muestra dos precios, 20 € y 25 €, puedes compararlos antes de comprar. No has hecho un pago ni guardado dinero. La función que estás usando es la unidad de cuenta. Separar las funciones evita tratar todos los usos del dinero como si fueran la misma acción.",
      ],
      takeaway: "Pagar, comparar y guardar son tres usos diferentes de una misma unidad monetaria.",
    },
    {
      id: "nominal-real",
      title: "02. Explicación sencilla: saldo y capacidad de compra",
      paragraphs: [
        "Usaremos un escenario didáctico, sin cotizaciones ni datos históricos. Tienes 100 € y una cesta cuesta 10 €. Puedes comprar 10 cestas. Si la misma cesta pasa a costar 12,50 € y tu saldo no cambia, puedes comprar 8. En ambos casos tienes 100 € nominales; ha cambiado la cantidad de bienes a la que puedes acceder.",
        "Nominal significa expresado en las unidades monetarias del momento. Real significa ajustado por un nivel de precios elegido como referencia. Decir «tengo 100 €» responde cuánto dinero figura en tu saldo. Decir «puedo comprar 8 cestas» responde cuánto consumo representa en este ejemplo.",
        "Para hacer una comparación útil, conserva la misma cesta y su calidad. Comparar un producto básico de ayer con una versión más grande de hoy mezcla un cambio de precio con un cambio de lo comprado. Primero define qué comparas, después realiza la división. Todas las cifras de esta sección son supuestos creados para aprender.",
      ],
      takeaway: "El saldo puede permanecer igual mientras disminuye tu poder adquisitivo.",
    },
    {
      id: "inflacion",
      title: "03. Del precio de un artículo al precio de una cesta",
      paragraphs: [
        "La inflación se refiere al aumento general de precios. Que suba un artículo no basta para describir lo que sucede con el conjunto de los gastos. Para medirlo se agrupan bienes y servicios y se asigna más peso a las partidas que representan mayor gasto. El IAPC permite estudiar precios de consumo con criterios armonizados. Fuente: BCE, «¿Qué es la inflación?».",
        "Ejemplo propio y simplificado: una cesta contiene dos productos A de 10 € y un producto B de 20 €. Cuesta 40 €. Después A cuesta 11 € y B sigue a 20 €: la cesta cuesta 42 €. A sube un 10 %, pero la cesta aumenta un 5 %: (42 / 40 − 1) × 100. Promediar precios en euros o elegir solo el producto que más sube no responde a la pregunta sobre el coste de esta cesta.",
        "Los hogares compran combinaciones diferentes, por lo que una medida agregada puede diferir de la experiencia individual. Además, una inflación menor todavía positiva significa que el nivel de precios sigue aumentando, aunque más despacio. No implica que los precios hayan vuelto al punto inicial. Fuente: BCE, «¿Qué es la inflación?».",
      ],
      takeaway: "Un índice resume una cesta definida; no es el precio de todos los artículos ni tu presupuesto exacto.",
    },
    {
      id: "formula",
      title: "04. Explicación técnica: llevar euros a una misma referencia",
      paragraphs: [
        "Define P₀ como el coste inicial de una cesta y P₁ como su coste final. El factor de precios es F = P₁ / P₀. La variación de precios es π = F − 1, expresada en decimal. Si π = 0,05, entonces F = 1,05. Un índice que empieza en 100 termina en 105; el índice es una escala de comparación, no un saldo en euros.",
        "Para expresar un saldo final M en euros con el poder de compra inicial, divide: valor real a precios iniciales = M / F = M / (1 + π). La razón se puede comprobar sin memorizar: M / P₁ son las cestas que puedes comprar al final. Multiplicar esas cestas por P₀ las valora a precios iniciales. Por tanto, (M / P₁) × P₀ = M / F.",
        "Si también cambia el saldo, usa la misma referencia para comparar ambos momentos. Con 1.000 € iniciales, 1.030 € finales y una cesta que sube un 5 %, el saldo real final es 1.030 / 1,05 = 980,95 € a precios iniciales. La variación real es (1,03 / 1,05 − 1) × 100 = −1,90 % aproximadamente. Son cifras didácticas; no describen un producto de ahorro ni su rentabilidad.",
        "Restar 3 % − 5 % = −2 % proporciona aquí una aproximación, no el resultado exacto. Las tasas pequeñas pueden hacerla útil para estimar mentalmente, pero el cociente es la comprobación adecuada. Mantén decimales durante el cálculo y redondea el resultado monetario al final.",
      ],
      takeaway: "Euros finales ÷ factor de precios = euros equivalentes a precios iniciales.",
    },
    {
      id: "interpretar",
      title: "05. Lee el diagrama y comprueba el resultado",
      paragraphs: [
        "En el gráfico de esta unidad, la referencia inicial vale 1.000 €. La barra de poder adquisitivo después de la subida representa 952,38 € a precios iniciales. Ambas barras usan la misma unidad y el mismo origen. El saldo nominal después sigue siendo 1.000 €; el gráfico representa capacidad de compra, no una retirada de dinero de la cuenta.",
        "Haz tres comprobaciones. Primero, dirección: si los precios suben y el saldo no cambia, el resultado real debe ser menor. Segundo, referencia: el resultado se expresa a precios iniciales. Tercero, reversibilidad: 952,380952… × 1,05 devuelve 1.000. Si redondeas antes, 952,38 × 1,05 da 999,999 €, una pequeña diferencia debida al redondeo.",
        "Otra pregunta distinta es cuánto dinero hará falta para mantener la compra inicial: 1.000 × 1,05 = 1.050 €. No confundas los 1.050 € nominales necesarios en el futuro con los 952,38 € de poder de compra inicial que representan los 1.000 € disponibles. Se multiplican los precios que quieres pagar; se divide el saldo que quieres expresar en la referencia anterior.",
      ],
      takeaway: "La unidad y el período de referencia forman parte de la respuesta, igual que el número.",
    },
    {
      id: "contexto-real",
      title: "06. Un ejemplo real verificable: el euro",
      paragraphs: [
        "El euro ilustra que dinero y efectivo no son sinónimos: también existen depósitos bancarios denominados en euros. Los billetes son dinero de banco central; un depósito en un banco comercial es dinero de banco comercial. El BCE explica estas formas y sus diferencias en «¿Qué es el dinero?». Este es un ejemplo institucional verificable, sin atribuirle un precio o una rentabilidad inventados.",
        "El BCE describe la estabilidad de precios como su objetivo principal y explica por qué la inflación elevada dificulta planificar gastos y ahorros. Su explicación de la estabilidad también trata los problemas de una deflación prolongada. Una caída de precios aislada o una compra más barata no resume por sí sola la situación económica. Fuente: BCE, «¿Por qué es importante la estabilidad de precios?».",
        "Para estudiar esta lección no hace falta conocer la inflación actual ni predecirla. El 5 % utilizado aquí es una hipótesis didáctica. Al consultar una publicación real, registra qué índice utiliza, a qué territorio se refiere y entre qué fechas compara. No sustituyas una tasa mensual por una anual dentro de la misma operación.",
      ],
      takeaway: "Las fuentes respaldan los conceptos; las cifras del ejercicio están identificadas como simuladas.",
    },
    {
      id: "limites",
      title: "07. Límites del modelo y puente hacia Forex",
      paragraphs: [
        "Nuestro cálculo conserva una cesta fija y supone que conoces su cambio de precio. No modela sustitución entre productos, cambios de calidad, intereses, impuestos ni comisiones. Para incorporar alguno de esos elementos, identifica primero si cambia el saldo disponible o el coste de la cesta. Después vuelve a comparar magnitudes con la misma referencia.",
        "Si varias subidas se suceden, multiplica sus factores: dos períodos del 5 % generan 1,05 × 1,05 = 1,1025, es decir, un 10,25 % acumulado en el ejemplo. Sumar 5 + 5 oculta que el segundo aumento se aplica a una base mayor. Esta observación es aritmética, no una previsión de inflación.",
        "Antes de estudiar pares de divisas, conserva esta distinción: convertir una cantidad de euros a otra moneda y ajustar euros por una cesta de consumo son preguntas diferentes. Ninguna de las operaciones de esta lección constituye una señal de compra o venta. La competencia que demuestras aquí es medir, explicitar supuestos y verificar un cálculo.",
      ],
      takeaway: "Una fórmula es útil cuando sabes qué mide, qué supone y qué deja fuera.",
    },
  ],
  workedExample: {
    title: "¿Qué pueden comprar 1.000 € después de una subida del 5 %?",
    scenario: "Escenario didáctico simulado. El saldo permanece en 1.000 €, sin intereses, entradas, salidas ni costes. La misma cesta de consumo cuesta un 5 % más al final del período. Calcula el valor del saldo final en euros con poder de compra del inicio.",
    steps: [
      "Fija la referencia: precios del inicio del período. El saldo nominal final es 1.000 €.",
      "Convierte el porcentaje: 5 / 100 = 0,05. El factor de precios es 1 + 0,05 = 1,05.",
      "Aplica la fórmula: poder adquisitivo a precios iniciales = 1.000 / 1,05 = 952,380952… €.",
      "Redondea al final: 952,38 € a precios iniciales. La diferencia real es 1.000 − 952,38 = 47,62 € aproximadamente.",
      "Comprueba la pérdida relativa: (1 / 1,05 − 1) × 100 = −4,7619… %. Una subida de precios del 5 % no produce una pérdida exacta del 5 % del poder de compra.",
    ],
    conclusion: "El saldo sigue siendo 1.000 € nominales. Su capacidad de compra equivale a 952,38 € a precios del inicio. Para mantener la compra inicial harían falta 1.050 € nominales al final.",
  },
  commonMistakes: [
    { mistake: "Restar un 5 % a 1.000 y responder 950 €.", correction: "La cesta se multiplica por 1,05; el saldo real se divide por 1,05. La resta es una aproximación que aquí no satisface el cálculo solicitado." },
    { mistake: "Afirmar que han desaparecido 47,62 € de la cuenta.", correction: "La cuenta mantiene su saldo nominal. La diferencia describe poder de compra valorado con los precios iniciales." },
    { mistake: "Usar la subida de un solo producto como inflación de toda la cesta.", correction: "Define cantidades y precios de la cesta. Calcula su coste total en ambos momentos antes de comparar." },
    { mistake: "Mezclar una tasa mensual con un saldo comparado durante un año.", correction: "Alinea fechas y períodos. Para cambios sucesivos utiliza el producto de sus factores, no una sustitución entre tasas." },
    { mistake: "Interpretar el 5 % del ejercicio como inflación actual.", correction: "Es un supuesto educativo. Una afirmación sobre inflación observada necesita fuente, territorio, índice y fecha." },
  ],
  summary: [
    "El dinero permite pagar, expresar precios y trasladar capacidad de compra en el tiempo, con límites.",
    "Nominal es la cantidad de euros; real expresa esa cantidad frente a una referencia de precios.",
    "La inflación de una cesta no se deduce de un único precio y puede diferir del gasto de cada hogar.",
    "Con saldo constante, el poder adquisitivo inicial equivalente se calcula como saldo / (1 + variación de precios).",
    "En el escenario simulado, 1.000 / 1,05 = 952,38 € a precios iniciales. Comprueba dirección, unidades y redondeo.",
  ],
  relatedConcepts: ["Medio de pago", "Unidad de cuenta", "Depósito de valor", "Importe nominal", "Valor real", "Cesta de consumo", "Inflación", "Índice de precios", "Interés compuesto", "Tipo de cambio"],
  sources: [
    {
      title: "BCE · ¿Qué es el dinero?",
      url: "https://www.ecb.europa.eu/ecb-and-you/explainers/tell-me-more/html/what_is_money.es.html",
      note: "Funciones y formas del dinero. Recurso oficial en español; consultado el 11 de octubre de 2026. Los ejemplos numéricos de la lección son originales y simulados.",
    },
    {
      title: "BCE · ¿Qué es la inflación?",
      url: "https://www.ecb.europa.eu/ecb-and-you/explainers/tell-me-more/html/what_is_inflation.es.html",
      note: "Cestas, ponderaciones e inflación individual frente a la agregada. Recurso oficial en español; consultado el 11 de octubre de 2026. No utilizamos tasas actuales de este recurso.",
    },
    {
      title: "BCE · ¿Por qué es importante la estabilidad de precios?",
      url: "https://www.ecb.europa.eu/ecb-and-you/explainers/tell-me-more/html/stableprices.es.html",
      note: "Contexto sobre inflación, deflación y planificación económica. Recurso oficial en español; consultado el 11 de octubre de 2026.",
    },
  ],
  passingScore: 80,
  completionCriteria: [
    "Responder las cinco preguntas: tres de elección, una de verdadero o falso y un cálculo numérico.",
    "Obtener al menos un 80 % de aciertos (4 de 5 respuestas correctas).",
    "Resolver correctamente el cálculo numérico obligatorio, con una tolerancia de ±0,01 €.",
    "Revisar la explicación de cada error. Puedes volver a estudiar y realizar otro intento.",
  ],
};
