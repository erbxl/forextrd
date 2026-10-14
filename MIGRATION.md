# Auditoría y plan de migración a GitHub Pages

Documento histórico de la migración 0.2.0. La academia y herramientas ampliadas de 0.3.0 se describen en README.md y ROADMAP.md.

Fecha: 11 de octubre de 2026. Base inspeccionada: commit `53f29e6` y cambio local de Next en `next-env.d.ts`.

## Auditoría previa

| Dependencia existente | Ubicación | Cambio previsto |
| --- | --- | --- |
| Prisma y SQLite | `prisma/`, `src/lib/db.ts` | Retirar del runtime y dependencias; IndexedDB/Dexie con esquema versionado |
| Consultas dinámicas al servidor | Dashboard, academia, lección, progreso y ajustes | Componentes cliente con estado observable; carga y errores explícitos |
| Cinco API Routes | `src/app/api/` | Servicios TypeScript locales con transacciones IndexedDB |
| Evaluación determinista | `src/modules/exercises/evaluate.ts` | Conservar reglas, validación y pruebas; ejecutar en navegador |
| Contenido y respuestas | `src/modules/academy/content.ts` | Conservar íntegro; separar definición pedagógica, ejercicios y soluciones |
| Fetch de formularios/cronómetro | `lesson-assessment`, `settings-form`, `study-tracker` | Invocar servicios locales y refrescar estado observable |
| Protección HTTP del servidor | `src/proxy.ts`, `src/lib/http.ts`, `headers()` | Retirar; documentar controles que GitHub Pages no permite configurar |
| Rutas dinámicas | `[section]`, `academia/[slug]` | Enumerar todas con `generateStaticParams`; directorios `index.html` |
| Rutas de recursos | Links Next, icono y fuentes locales | `basePath: /forextrd`, `trailingSlash: true`, comprobar HTML y recursos exportados |
| Tema localStorage | `app-shell.tsx` | Preferencia IndexedDB incluida en backups; conservar elección anterior al inicializar |
| Pruebas | Evaluación, SQLite/API y Playwright | Conservar evaluación, reemplazar integración por fake-indexeddb, E2E sobre archivos exportados |

No hay Server Actions. Los componentes de servidor que solo renderizan contenido estático pueden permanecer: se ejecutarán en compilación. El contenido educativo no contiene datos personales. Las soluciones en el navegador son inspeccionables; esto es autoaprendizaje, no certificación resistente a manipulación.

## Orden de trabajo

1. Crear persistencia local versionada, inicialización idempotente y servicios equivalentes.
2. Separar contenido/ejercicios/soluciones conservando valores y texto; reutilizar la evaluación.
3. Conectar componentes existentes a IndexedDB, incluidos tema, sesiones y progreso.
4. Añadir backup JSON versionado, validación, previsualización y transacciones de restauración/restablecimiento con confirmación.
5. Exportar Next, retirar runtime del servidor y preparar servidor de archivos solo para pruebas locales.
6. Configurar Actions con Node 22, npm ci, typecheck, tests, build y publicación exclusiva de `out`.
7. Verificar la exportación en navegador bajo `/forextrd/`, rutas profundas, persistencia, backups, errores y modo móvil; actualizar documentación.

## Conservación y límites

Se mantiene la identidad visual, currículo, primera unidad, criterios de aprobación y pantallas pendientes. No se implementan nuevas fases. Los futuros registros de simulador/replay/backtesting/diario tendrán tablas reservadas, sin aparentar herramientas terminadas. Los cálculos costosos se diseñarán como funciones puras invocables mediante Web Workers.

IndexedDB es local al navegador, perfil y origen; GitHub no sincroniza el progreso. Las actualizaciones del esquema deben añadir versiones y migraciones, nunca borrar la base. Las copias requieren acción del usuario. Un fichero SQLite anterior no se transforma automáticamente en IndexedDB y no se borra: deberá conservarse como archivo histórico si existe. En la comprobación final del 12 de octubre se conserva `prisma/dev.db`: una consulta de solo lectura encontró un perfil y cero intentos, registros de progreso, sesiones o actividad de estudio. No hay progreso educativo anterior que trasladar; el perfil y las preferencias de SQLite no se convierten automáticamente.

El despliegue en https://erbxl.github.io/forextrd/ está confirmado: workflow satisfactorio para el commit `2430506`, respuesta HTTP 200 y cinco pruebas de navegador aprobadas contra esa URL. Los resultados, el entorno y la referencia de Actions se registran en [TESTING.md](TESTING.md).
