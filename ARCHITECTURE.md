# Arquitectura — Forex Academy Pro

## Alcance inicial

Aplicación local individual. La Fase 1 entrega navegación, dashboard, SQLite, progreso y una primera unidad educativa evaluable. El resto del currículo y las herramientas se identifican como pendientes. No se publican servicios ni se conectan brokers.

## Decisiones

- Next.js App Router, React y TypeScript estricto. Server Components para consultas y componentes cliente para formularios e interacciones.
- Prisma 6 y SQLite, compatibles con Node 20.17 disponible. Migraciones versionadas; ningún dato personal ni fichero SQLite se incorpora a Git.
- Contenido educativo versionado en TypeScript y catálogo sincronizado con la base de datos mediante una semilla idempotente.
- Evaluación determinista en `src/modules/exercises`; persistencia y progreso en `src/modules/progress`; acceso a datos en `src/lib`.
- Route Handlers con Zod, errores controlados, límite de tamaño, comprobación de origen y resolución centralizada del usuario local. El servidor escucha en loopback por defecto.
- Las respuestas y la nota se calculan en el servidor. Completar exige reconocer la lectura y superar la evaluación, incluida la pregunta numérica.
- Progreso basado en lecciones publicadas y aprobadas. Completar la única lección inicial no equivale a completar el nivel 0 ni los 13 niveles.
- No hay datos de mercado ni resultados de trading en esta fase. Todos los ejemplos numéricos se etiquetan como didácticos.

## Flujo

Interfaz → validación del Route Handler → evaluación / servicio de progreso → transacción Prisma → SQLite. El dashboard consulta los registros persistidos; comienza en cero.

## Evolución

Los módulos previstos son `academy`, `lessons`, `exercises`, `assessments`, `progress`, `market-data`, `charts`, `simulator`, `replay`, `backtesting`, `strategies`, `risk`, `journal`, `analytics`, `ai-mentor` y `settings`. Solo se crean implementaciones reales durante la fase correspondiente. Para multiusuario habrá que introducir autenticación y autorización antes de exponer el servidor. PostgreSQL requerirá adaptar el proveedor y regenerar migraciones, además de migrar los datos.

## Fases

1. Base y primera unidad: estructura, contenido, persistencia, pruebas y documentación.
2. Academia: ampliar lecciones completas, modalidades, exámenes y repaso.
3. Herramientas: calculadoras, datos y gráficos con referencias matemáticas.
4. Simulador: ejecución determinista, órdenes y costes.
5. Replay y backtesting: sin filtración futura y con resultados reproducibles.
6. Diario, analítica, tutor y fuentes externas opcionales.
7. Auditoría de seguridad, accesibilidad, rendimiento y cobertura.
