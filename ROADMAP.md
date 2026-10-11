# Plan de implementación

Cada fase debe conservar una aplicación ejecutable. Una pantalla de navegación no acredita una funcionalidad: su flujo debe producir resultados correctos, guardarlos cuando corresponda y contar con comprobaciones adecuadas.

## Fase 1 — Base funcional · entrega actual

- Proyecto local con Next.js, React, TypeScript y SQLite mediante Prisma.
- Diseño responsive, navegación lateral y temas oscuro y claro.
- Dashboard construido con datos persistidos y estados iniciales vacíos.
- Perfil local, objetivo semanal y seguimiento de progreso.
- Mapa de los 13 niveles, con estado parcial o pendiente explícito.
- Una unidad completa, «Dinero y poder adquisitivo», con evaluación, intentos guardados y repaso.
- Documentación y verificaciones de compilación, tipos, lógica y flujos esenciales.

**Aceptación:** instalar, iniciar, estudiar la primera unidad, responder, obtener una corrección explicada y conservar el progreso tras recargar y reiniciar. El estado de las verificaciones se mantiene en [TESTING.md](TESTING.md).

La primera unidad adelanta una parte acotada de la Fase 2 para verificar que el recorrido educativo funciona. No supone haber completado la academia.

## Fase 2 — Academia · siguiente

Ampliar progresivamente los niveles con lecciones completas, más modalidades de ejercicios, exámenes por nivel, glosario y repaso personalizado. Definir criterios de competencia para desbloqueos e informes. Mantener separadas la cobertura publicada y la competencia demostrada.

**Aceptación:** cada modalidad puede resolverse, corregirse y repetirse; los resultados persisten y las recomendaciones se derivan de errores reales. Cada lección incluye objetivos, explicación sencilla y técnica, ejemplo, recurso visual, errores frecuentes, ejercicio, quiz, resumen, fuentes y criterio de aprobación.

## Fase 3 — Herramientas financieras · pendiente

Incorporar calculadoras de pips, posición, lotes, margen, apalancamiento, riesgo, costes, drawdown, recuperación, expectancy y equilibrio. Añadir gráficos e importación CSV mediante proveedores desacoplados, con fechas, zona horaria, duplicados, huecos, fuente y licencia.

**Aceptación:** las calculadoras muestran fórmulas, unidades y pasos y superan pruebas con resultados independientes de referencia. Los datos importados se validan y su procedencia se distingue de cualquier ejemplo sintético. Las simulaciones Monte Carlo documentan supuestos y semilla reproducible.

## Fase 4 — Simulador · pendiente

Crear cuentas de dinero ficticio, órdenes market/limit/stop, posiciones, margen, spread, comisiones, slippage, stop-loss, take-profit, P&L e historial. El motor de ejecución será determinista y estará separado de la interfaz.

**Aceptación:** operaciones y costes modifican correctamente balance, equity y exposición; las ambigüedades intravela de datos OHLC se resuelven mediante una política explícita. La fuente y el tipo de precios son visibles. No habrá ejecución con brokers ni dinero real.

## Fase 5 — Replay y backtesting · pendiente

Añadir replay por velas, sesiones guardadas, anotaciones, unas pocas estrategias objetivas y parametrizables, comparación de resultados e informes exportables. Incluir costes, muestras separadas y evaluación de sesgos.

**Aceptación:** el estado visible y los indicadores solo utilizan información disponible en el instante de la simulación. Una misma entrada y configuración reproducen las mismas operaciones. Las estadísticas se calculan desde esas operaciones; los datos sintéticos no se presentan como evidencia de rentabilidad histórica.

## Fase 6 — Herramientas avanzadas · pendiente

Desarrollar diario de operaciones, analítica de disciplina, evaluación de competencia y tutor educativo opcional. Integrar calendario y noticias solo con proveedores legítimos configurados; documentar licencias y mantener secretos en el servidor. Ofrecer ayuda predefinida sin depender de una API de pago.

**Aceptación:** el diario guarda y analiza entradas reales del usuario y distingue decisiones de resultados. El tutor no modifica operaciones ni balances sin una acción explícita. Las fuentes ausentes muestran una integración pendiente, sin eventos ni precios inventados.

## Fase 7 — Refinamiento · pendiente

Ampliar pruebas de integración y navegador, revisar seguridad, rendimiento, accesibilidad por teclado, diseño móvil y documentación. Verificar recuperación de datos y flujos de error. Una futura variante multiusuario requiere primero autenticación y autorización.

**Aceptación:** los flujos publicados funcionan de extremo a extremo, las limitaciones están documentadas y la evidencia de validación corresponde a la versión entregada.

## Objetivos de cobertura

| Objetivo final | Estado de esta entrega |
| --- | --- |
| 13 niveles | Estructura de 13 niveles; nivel 0 parcial. |
| Al menos 100 lecciones | Una lección completa publicada. |
| Al menos 300 ejercicios | Cinco preguntas en la evaluación inicial. |
| Al menos 50 escenarios prácticos | Objetivo futuro; sin colección de escenarios entregada. |
| Exámenes por nivel y glosario extenso | Pendientes. |

Estos objetivos no justifican material superficial. Antes de publicar contenidos legales para Bélgica o la UE será necesario verificar fuentes vigentes de FSMA, ESMA y autoridades competentes y distinguir Forex spot, CFDs y otros derivados. Esta fase no entrega asesoramiento regulatorio.
