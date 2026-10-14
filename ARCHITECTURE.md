# Arquitectura

Next.js con App Router genera `out/` mediante exportación estática. Las 117 unidades de aprendizaje y las herramientas tienen rutas enumeradas; GitHub Pages sirve HTML, JS, CSS y fuentes bajo `/forextrd/`. Node se utiliza para desarrollar, compilar y probar. No hay API Routes, Server Actions, Prisma ni base remota en ejecución.

## Módulos

| Módulo | Responsabilidad |
| --- | --- |
| academy | 104 lecciones, 13 exámenes, glosario, fuentes y requisitos entre niveles. |
| exercises | Corrección de cinco modalidades y generadores reproducibles de práctica. |
| progress | Lectura, intentos, finalización, actividad y estadísticas. |
| risk | Funciones matemáticas con validación y Monte Carlo con semilla. |
| market-data | Contrato OHLC, validación CSV, procedencia y series simuladas deterministas. |
| simulator | Motor puro de órdenes, costes, financiación, margen, stop-out y curva. |
| backtesting | Señales causales SMA/canal, dimensionamiento y muestras independientes. |
| trading-sessions | Validación y persistencia de sesiones, cursor y anotaciones. |
| journal | Validación, CRUD, resultados netos, riesgo inicial y analítica. |
| ai-mentor | Búsqueda determinista sobre material escrito y glosario; no usa un LLM. |
| storage | Dexie, migraciones, preferencias y copias de seguridad. |

Los componentes observan IndexedDB con consultas de solo lectura. La inicialización idempotente se hace fuera de `liveQuery`. Los motores de cálculo están separados de los formularios y no usan precios externos implícitos.

## Progreso

Cada unidad requiere ≥80 %, preguntas obligatorias correctas y lectura confirmada. Una transacción verifica también los requisitos del nivel: ocho lecciones completadas para abrir su examen y examen completado para abrir el siguiente nivel. Repetir no elimina competencias ya demostradas. El porcentaje de lecciones usa 104 como denominador; los 13 exámenes se reflejan en niveles completados.

Actividad y objetivo semanal utilizan Europe/Madrid. La lectura cuenta solo intervalos de pestaña visible y enfocada; no acredita tiempo certificado. La práctica adaptativa lleva una secuencia por familia, sube tras tres aciertos y baja tras dos errores; no desbloquea exámenes por sí sola.

## Ejecución y datos

CSV: fechas UTC ordenadas y únicas, OHLC positivo coherente e intervalos múltiplos del marco declarado. No se rellenan gaps ni se verifica externamente la fuente. Límite de 5000 velas/2 MiB. Las velas son mid; spread, deslizamiento y conversión son supuestos explícitos.

Órdenes al cierre se evalúan desde la siguiente vela. Mercado y cierre manual se ejecutan en su apertura. Límites no empeoran su precio; stops pueden atravesarse por gaps. El recorrido intravela es supuesto y conservador: SL/TP ambiguos priorizan SL, salvo una apertura ya ejecutable. El margen se fija al entrar; el stop-out liquida primero la mayor pérdida. Financiación por tiempo UTC transcurrido, sin calendario real de swaps. Un gap puede producir saldo negativo.

El backtest calcula total, entrenamiento y prueba con cuentas independientes. Usa exclusivamente información anterior o actual para señales y calentamiento; liquida posiciones al final de cada intervalo con costes. No optimiza parámetros. La interfaz ejecuta el cálculo en un Web Worker cancelable, que se termina al salir de la página. El Sharpe usa retornos simples, desviación muestral, tipo libre de riesgo cero y anualización de 365 días por espaciado observado. El drawdown incluye extremos del recorrido supuesto, no solo cierres.

## Persistencia y copias

Esquema local 1: perfil, preferencias, progreso, intentos, lectura, actividad y tablas de herramientas. Versión 2: índice de conceptos a repasar. Versión 3: intentos de práctica con índice único familia/secuencia. Las migraciones son aditivas y conservan registros anteriores.

Las copias JSON versión 2 incluyen todas las tablas. Se acepta versión 1 añadiendo práctica vacía. Antes de restaurar se validan límites, fechas, relaciones, requisitos y claves; se recalculan calificaciones y estadísticas derivadas. Las sesiones de trading se validan también al abrirse; los experimentos recuperan datos/parámetros y recalculan resultados. La restauración sustituye tablas en una única transacción tras confirmación. Límite del archivo: 10 MiB.

Datos por origen y perfil del navegador. Sin autenticación ni sincronización; la ruta no separa aplicaciones del mismo origen. Las copias no están firmadas ni cifradas y las soluciones del frontend son inspeccionables. Los registros antiguos reservados se conservan, aunque no constituyen sesiones válidas hasta tener un formato reconocido.

## Hosting e integraciones

El workflow existente publica solo `out/` y concede permisos Pages al trabajo de despliegue. No hay lugar seguro para claves privadas en JavaScript. Proveedores, IA externa y sincronización requieren servicios opcionales separados. No hay ejecución real, feed de mercado ni calendario sincronizado. La migración histórica desde SQLite se documenta en MIGRATION.md; no se borran ni convierten automáticamente sus archivos.
