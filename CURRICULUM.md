# Currículo de Forex Academy Pro

## Estado de la primera fase

Hay **una unidad publicada, cinco preguntas corregibles y un escenario numérico simulado**. El catálogo contiene trece niveles (0–12) como estructura de ampliación. Que el nivel 0 tenga contenido disponible no significa que esté completo. Los demás niveles están señalados como pendientes.

Los objetivos de cobertura son al menos 100 lecciones, 300 ejercicios, 50 escenarios, exámenes por nivel y un glosario extenso. Son objetivos del proyecto; no describen contenido ya publicado.

## Unidad disponible

**Dinero, precios y poder adquisitivo** — nivel 0, unos 20 minutos de estudio orientativos. Ruta: `/academia/dinero-y-poder-adquisitivo`.

La unidad enseña a reconocer las funciones del dinero, separar importes nominales de capacidad de compra, interpretar una cesta y calcular valores reales. Incluye siete secciones: intercambios, saldo y capacidad de compra, cesta e inflación, fórmula técnica, interpretación visual, ejemplo institucional del euro y límites del modelo.

Su ejemplo resuelto conserva 1.000 € nominales cuando una cesta se encarece un 5 %. El cálculo es `1.000 / 1,05 = 952,380952…`, es decir, 952,38 € con poder de compra inicial. La pérdida relativa es aproximadamente un 4,76 %, no un 5 % exacto. Para mantener la compra inicial se necesitarían 1.050 € nominales finales: una pregunta diferente. El 5 % es un supuesto didáctico, no una tasa de inflación observada.

### Estructura educativa

| Requisito de la lección | Implementación |
| --- | --- |
| Título | Nombre y subtítulo que identifican la competencia |
| Objetivos | Cinco capacidades concretas |
| Conocimientos previos | Operaciones básicas, porcentajes y calculadora opcional |
| Explicación sencilla | Cestas que pueden comprarse con un saldo constante |
| Explicación técnica | Factor de precios, valor real y comprobación de unidades |
| Ejemplo real verificable | Efectivo y depósitos en euros; referencias del BCE |
| Diagrama y gráfico | Comparación visual del poder de compra inicial y final; interpretación en sección 05 |
| Ejemplo numérico | Escenario resuelto, cálculos auxiliares y supuestos explícitos |
| Errores frecuentes | Cinco errores con explicación y corrección |
| Ejercicio interactivo | Cálculo numérico obligatorio |
| Quiz | Tres preguntas de elección y una de verdadero o falso |
| Resumen | Cinco ideas principales |
| Conceptos relacionados | Diez conceptos para conectar aprendizajes |
| Recursos adicionales | Tres recursos oficiales del BCE en español |
| Criterios de superación | Al menos cuatro aciertos y cálculo obligatorio correcto |

### Evaluación

Las cinco preguntas pesan lo mismo (20 puntos cada una). La lección se supera con al menos un 80 % **y** el cálculo numérico correcto. Un 80 % con el cálculo incorrecto no completa la lección. La tolerancia numérica es inclusiva: ±0,01 € respecto a 952,38 €; se admite el resultado sin redondear. La interfaz convierte la entrada del usuario en un número; el motor de evaluación exige un número finito y no convierte cadenas silenciosamente.

Cada respuesta recibe una explicación y la solución tras el envío. Las preguntas desconocidas, ausentes, valores no finitos y opciones no reconocidas se rechazan. La corrección se realiza en el navegador. Las soluciones se distribuyen como contenido estático y pueden inspeccionarse: la evaluación está orientada al autoaprendizaje. La persistencia local de intentos en IndexedDB permite repetir sin borrar el historial y conservar el logro ya alcanzado. Las horas orientativas y el tiempo de uso no conceden competencias por sí solos.

No se implementan todavía variantes aleatorias, adaptación de dificultad, ejercicios de arrastre, identificación de patrones ni exámenes por nivel. Deben añadirse con contenido verificable y corrección probada.

## Itinerario previsto

| Nivel | Área | Resultado educativo previsto | Estado |
| --- | --- | --- | --- |
| 0 | Fundamentos financieros | Distinguir dinero, mercados, precios, liquidez, riesgo e inversión | Primera unidad disponible; resto pendiente |
| 1 | Introducción al Forex | Interpretar pares, pips, lotes, costes, órdenes e instrumentos | Pendiente |
| 2 | Gráficos y análisis técnico básico | Describir velas, tendencias, rangos y estructura sin información futura | Pendiente |
| 3 | Análisis técnico intermedio | Calcular e interpretar indicadores y reconocer sus límites | Pendiente |
| 4 | Price Action y estructura | Formular reglas observables y separar evidencia de convenciones visuales | Pendiente |
| 5 | Análisis fundamental | Comparar publicaciones con expectativas y reconocer riesgo de eventos | Pendiente |
| 6 | Gestión del riesgo | Calcular exposición, tamaño, R, expectancy, drawdown y límites | Pendiente; prioridad de desarrollo |
| 7 | Psicología | Evaluar decisiones, sesgos, disciplina y respuesta emocional | Pendiente |
| 8 | Estrategias | Definir hipótesis, reglas, invalidación, costes y condiciones de fallo | Pendiente |
| 9 | Estadística | Evaluar incertidumbre, muestras, sesgos, robustez y costes | Pendiente |
| 10 | Desarrollo de sistemas | Documentar reglas reproducibles y protocolos de suspensión | Pendiente |
| 11 | Backtesting y forward testing | Validar datos, simular con costes y contrastar fuera de muestra | Pendiente |
| 12 | Preparación profesional | Estudiar rutinas, costes, seguridad, registros y marco regulatorio | Pendiente |

El nivel 4 presentará Smart Money e ICT como marcos interpretativos que requieren validación, sin atribuirles capacidad predictiva demostrada. Las estrategias del nivel 8 necesitarán hipótesis, condiciones, entradas, salidas, invalidación, riesgo, ejemplo, fallos posibles, ejercicio y protocolo de evaluación sin mirar el futuro.

El nivel 12 deberá comprobar las normas vigentes al publicar contenido dirigido a residentes en Bélgica y la UE, consultar FSMA y ESMA y distinguir spot, CFDs y otros derivados. En esta fase no se publican afirmaciones legales sobre operativa ni fiscalidad.

## Fuentes y política editorial

Consultadas el 11 de octubre de 2026:

- [BCE: ¿Qué es el dinero?](https://www.ecb.europa.eu/ecb-and-you/explainers/tell-me-more/html/what_is_money.es.html), para funciones y formas del dinero.
- [BCE: ¿Qué es la inflación?](https://www.ecb.europa.eu/ecb-and-you/explainers/tell-me-more/html/what_is_inflation.es.html), para cestas y medición de precios.
- [BCE: ¿Por qué es importante la estabilidad de precios?](https://www.ecb.europa.eu/ecb-and-you/explainers/tell-me-more/html/stableprices.es.html), para el contexto institucional y los efectos de inflación y deflación.

El texto y los escenarios numéricos son originales. No se reutiliza una serie de mercado ni se presentan cifras simuladas como observaciones históricas. Las fuentes permiten ampliar y contrastar conceptos; las fórmulas se verifican mediante aritmética y pruebas automatizadas. Las duraciones son estimaciones de estudio, no registros de tiempo realizado.

Para publicar una nueva unidad se exigirá: competencia observable, los quince elementos educativos, supuestos y unidades explícitos, ejercicios realmente corregibles, fuentes trazables para hechos verificables, límites del método y pruebas relevantes del cálculo. Una pantalla o un título de catálogo no equivalen a una lección publicada.
