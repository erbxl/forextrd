# Arquitectura — Forex Academy Pro

## Decisión de esta versión

Next.js 16 con App Router y React 19 se conserva como generador estático. `output: "export"` produce `out/`, `basePath: "/forextrd"` adapta enlaces y recursos, y `trailingSlash: true` genera páginas de directorio. Las rutas de lecciones y secciones futuras se enumeran mediante `generateStaticParams`. Los componentes de servidor que quedan solo producen contenido en compilación; no existe un servidor Next.js en producción.

La aplicación principal no requiere Node.js, API Routes, Server Actions, Prisma, SQLite, Docker ni una base remota. Node se utiliza para desarrollo, pruebas y build. GitHub Pages sirve HTML, JavaScript, CSS, fuentes y otros recursos estáticos.

## Separación de responsabilidades

| Capa | Responsabilidad |
| --- | --- |
| `src/modules/academy` | Currículo, textos de lecciones, definiciones de ejercicios y soluciones en archivos separados. |
| `src/modules/exercises` | Evaluación TypeScript determinista: validación, puntuación y explicación. |
| `src/modules/progress` | Registro de intentos, finalización, lectura, actividad y consultas agregadas. |
| Persistencia Dexie/IndexedDB | Tablas locales, versiones de esquema y transacciones. |
| Servicios de copia JSON | Exportación versionada, validación, previsualización y restauración atómica. |
| Componentes cliente | Interacciones y estado observable, con carga y errores explícitos. |
| `out/` | Único artefacto publicable; nunca contiene la base personal del navegador. |

El catálogo estático se combina para mantener el contrato educativo existente. Separar soluciones de preguntas facilita su mantenimiento, pero no las oculta al usuario: ambas forman parte de los recursos descargables.

## Flujo de aprendizaje

Interfaz → motor de evaluación en navegador → transacción IndexedDB → actualización observable → dashboard y repaso.

Una evaluación se aprueba con al menos un 80 % y el cálculo obligatorio correcto. Completar exige una evaluación aprobada previa y confirmación de lectura. Repetir no duplica la lección completada ni borra una competencia aprobada. El dashboard consulta registros reales; un perfil nuevo comienza en cero.

La actividad utiliza `Europe/Madrid`: el objetivo semanal cuenta días de lunes a domingo y el gráfico muestra los últimos siete días. La lectura activa es una ayuda local y no una acreditación de estudio. Los conceptos de repaso se derivan de errores históricos, incluso si hubo aciertos posteriores. El progreso porcentual mide lo publicado, no el currículo futuro.

## Persistencia y evolución

Dexie administra IndexedDB con esquema versionado e inicialización idempotente. Los datos personales incluyen perfil, preferencias, resultados, respuestas, progreso y sesiones de estudio. Las tablas reservadas para operaciones demo, replay, backtesting y diario permiten evolucionar el almacenamiento; no representan funcionalidades ya implementadas.

Las próximas versiones deben añadir migraciones explícitas que conserven registros existentes. Actualizar el catálogo o el sitio no debe borrar la base. No se emplea borrar y recrear IndexedDB como mecanismo de actualización.

Los datos se aíslan por origen y perfil de navegador, no por cuenta GitHub. La ruta `/forextrd/` no es una frontera de seguridad entre aplicaciones del mismo origen. No hay sincronización entre dispositivos ni autenticación compartida.

## Copias de seguridad

La exportación JSON identifica formato y versión e incluye los datos personales y preferencias. Importar implica validar tamaño, estructura, versión, identificadores y relaciones antes de mostrar el alcance. La confirmación autoriza una sustitución completa dentro de una transacción; un fallo revierte el conjunto. El restablecimiento también requiere una acción explícita.

Una copia no es una firma de autenticidad ni un cifrado. Las validaciones evitan corrupción accidental y estados incompatibles; un usuario con acceso al navegador puede manipular su estado. No hay evaluación certificada a prueba de fraude.

El archivo anterior `prisma/dev.db` permanece intacto y excluido de Git. En la verificación final de solo lectura contiene un perfil y ningún intento, registro de progreso, sesión o actividad de estudio. El perfil y las preferencias de SQLite no se convierten automáticamente. Si otra instalación tiene progreso anterior, hay que conservar su archivo: no se importa automáticamente ni debe borrarse al actualizar. El formato SQLite no es el JSON de copia de IndexedDB.

## Hosting, seguridad e integraciones

El workflow compila con Node 22 y sube solo `out/`; el trabajo de despliegue obtiene `pages: write` e `id-token: write`. El trabajo de build solo necesita lectura del repositorio y de la configuración de Pages.

Se elimina la dependencia de `headers()` y del proxy de Next. Pages decide las cabeceras HTTP del sitio; las etiquetas meta admitidas no equivalen a controles como HSTS o protección completa contra framing. No se ofrece un endpoint privado, una sesión autenticada ni un lugar seguro para almacenar claves API.

La academia básica no usa IA externa, datos de mercado ni brokers. Una fuente futura necesita contrato desacoplado, licencia compatible y acceso CORS permitido. Un secreto incluido en JavaScript, una variable pública o el artefacto estático es visible. Cualquier servicio externo opcional deberá resolver esa limitación sin convertir la academia básica en dependiente de él.

## Fases futuras en el navegador

Cálculos, simulación, replay y backtesting se diseñarán como funciones puras y reproducibles. Las cargas costosas podrán ejecutarse en Web Workers; no se añade un servidor para cálculos que pueden hacerse localmente. Los datos CSV necesitarán validación, importación por bloques, índices y paginación, teniendo en cuenta cuota de IndexedDB y memoria disponible.

Esta migración mantiene el alcance de Fase 1. [ROADMAP.md](ROADMAP.md) conserva las siete fases; no se implementa aún el laboratorio financiero.
