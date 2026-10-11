# Plan de implementación

La migración de la Fase 1 a GitHub Pages conserva la aplicación y su programa educativo. No añade una nueva fase de producto ni convierte las pantallas futuras en herramientas terminadas. Cada entrega debe ser ejecutable como sitio estático, con datos personales locales.

## Fase 1 — Base funcional

Dashboard, navegación responsive, temas, perfil, objetivo semanal, persistencia y primera lección completa. La adaptación estática incorpora Dexie/IndexedDB, evaluación en navegador, backups JSON y pipeline de Pages.

**Aceptación:** abrir el sitio bajo `/forextrd/`, estudiar, responder, corregir, completar y recuperar el progreso al recargar. Exportar y restaurar datos con confirmación y sin importaciones parciales. Verificación local y publicación remota se registran por separado en [TESTING.md](TESTING.md).

## Fase 2 — Academia · siguiente

Ampliar las lecciones completas, modalidades de ejercicios, exámenes por nivel, glosario y repaso. Mantener separados cobertura publicada y dominio demostrado.

**Aceptación:** cada ejercicio puede resolverse, corregirse, repetirse y guardarse. Cada lección conserva todos los apartados educativos exigidos. La corrección en cliente sigue siendo autoaprendizaje, no una certificación resistente a manipulación.

## Fase 3 — Herramientas financieras · pendiente

Calculadoras de pips, posición, lotes, margen, apalancamiento, riesgo, costes, drawdown, recuperación, expectancy y equilibrio. Gráficos y datos CSV locales con validación de fechas, zona horaria, duplicados, huecos, fuente y licencia.

**Aceptación:** fórmulas, unidades, pasos y resultados de referencia verificados. Datasets grandes importados por bloques y consultados por rangos. Las fuentes externas requieren CORS y licencia compatibles; su ausencia se muestra explícitamente.

## Fase 4 — Simulador · pendiente

Dinero ficticio, órdenes market/limit/stop, posiciones, margen, costes, P&L e historial. Motor TypeScript determinista separado de la interfaz, ejecutable en navegador.

**Aceptación:** balance, equity y exposición coherentes con cada operación. Política explícita para ambigüedades OHLC. Fuente de precios visible, sin conexión con brokers ni ejecución real.

## Fase 5 — Replay y backtesting · pendiente

Replay por velas, anotaciones, sesiones persistidas y primeras estrategias objetivas y parametrizables. Estadísticas calculadas a partir de operaciones reales de la simulación, con costes y separación de muestras.

**Aceptación:** ausencia de información futura, resultados reproducibles y datos sintéticos identificados. Utilizar Web Workers cuando el coste de cálculo afecte a la interfaz, con límites de memoria y cancelación.

## Fase 6 — Herramientas avanzadas · pendiente

Diario, analítica de disciplina, informes de competencia, ayuda educativa y tutor opcional. Calendario y noticias solo mediante fuentes legítimas configuradas.

**Aceptación:** persistencia y backups incluyen el nuevo estado. El diario distingue decisiones y resultados. La ayuda básica funciona sin API; cualquier integración que necesite secretos requiere una solución externa opcional y no puede exponerlos en Pages.

## Fase 7 — Refinamiento · pendiente

Ampliar pruebas, accesibilidad, responsive, rendimiento y documentación. Revisar migraciones, recuperación y límites del almacenamiento local. La auditoría debe tratar los límites reales de un sitio estático.

**Aceptación:** los flujos publicados funcionan de extremo a extremo y la evidencia corresponde al artefacto entregado. La publicación solo se afirma tras observar el despliegue real.

## Cobertura prevista

| Objetivo final | Entrega actual |
| --- | --- |
| 13 niveles | Mapa de 13 niveles; nivel 0 parcialmente publicado. |
| 100 lecciones o más | Una lección completa. |
| 300 ejercicios o más | Cinco preguntas en la evaluación inicial. |
| 50 escenarios o más | Colección pendiente. |
| Exámenes por nivel y glosario extenso | Pendientes. |

Se prioriza contenido útil y comprobable frente a volumen superficial. Antes de publicar afirmaciones legales sobre Bélgica o la UE habrá que consultar fuentes vigentes de FSMA, ESMA y las autoridades competentes, distinguiendo Forex spot, CFDs y otros derivados.
