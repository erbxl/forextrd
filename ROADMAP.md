# Estado de la academia

La versión local 0.3.0 amplía la migración estática con el programa completo y las herramientas de práctica. El sitio sigue funcionando sin servidor de aplicación. La publicación de esta ampliación no forma parte de la validación local.

| Área | Implementado |
| --- | --- |
| Base y persistencia | Navegación responsive, temas, perfil, objetivo semanal, lectura, IndexedDB y copias atómicas. |
| Academia | 13 niveles, 104 lecciones, 449 preguntas, 104 ejemplos resueltos, diagramas, 13 exámenes y glosario de 90 términos. |
| Evaluación | Cinco modalidades, explicaciones, revisión de errores y desbloqueo por ocho lecciones más examen. |
| Práctica adaptativa | Tres familias numéricas, variantes reproducibles, tres dificultades, historial y backup. |
| Calculadoras y datos | 14 calculadoras, Monte Carlo, velas simuladas e importación CSV validada con fuente declarada. |
| Simulador | Órdenes, costes, margen y stop-out, posiciones, cierres, historial, exportación y sesiones. |
| Replay | Avance/pausa/velocidad, inicio configurable, gráfico sin velas futuras, líneas y persistencia. |
| Backtesting | Dos estrategias objetivas, entrenamiento/prueba independientes, métricas, curvas y experimentos reproducibles. |
| Diario y ayuda | Diario con captura, analítica de disciplina, tutor local del temario, biblioteca y calendarios oficiales enlazados. |
| Verificación | Recorrido completo de 13 niveles mediante servicios; pruebas de navegador del artefacto estático. Evidencia en TESTING.md. |

## Mejoras e integraciones posteriores

- Un proveedor opcional de históricos o cotizaciones requerirá licencia, disponibilidad y CORS compatibles. Actualmente se trabaja con simulaciones o CSV del usuario.
- Un calendario integrado con revisiones y consenso necesita una fuente autorizada; ahora se enlazan calendarios oficiales.
- Un mentor generativo con claves protegidas necesita una arquitectura externa opcional. La ayuda local ya permite consultar material y revisar errores.
- Ampliar estrategias, indicadores y pruebas estadísticas más allá del cruce SMA, canal y Monte Carlo disponibles.
- Ampliar datasets más allá de 5000 velas con consultas por rangos y control de cuota; el backtest actual ya usa un worker cancelable.
- Revisiones docentes independientes, actualización periódica de fuentes regulatorias y pruebas en otros navegadores y dispositivos físicos.
- Sincronización, cuentas y certificación protegida quedan fuera del hosting puramente estático actual.

El contenido de los exámenes procede del banco de lecciones y no añade preguntas originales al recuento. Los 104 escenarios son ejemplos resueltos, no 104 históricos de mercado. Los motores describen sus supuestos OHLC; no representan ejecución de un bróker.
