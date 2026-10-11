# Forex Academy Pro

Academia de Forex en español para aprender desde los fundamentos financieros y demostrar lo aprendido mediante ejercicios. Esta entrega implementa la **Fase 1: base local funcional y una primera unidad educativa completa**. El laboratorio de trading se desarrollará en fases posteriores; no hay operaciones con dinero real ni conexión con brokers.

## Disponible

- Interfaz responsive con navegación lateral, modo oscuro inicial y modo claro.
- Dashboard con progreso calculado a partir de registros guardados. Una instalación nueva comienza sin actividad; no se incluyen estadísticas ficticias.
- Mapa del currículo de 13 niveles. El nivel 0 está parcialmente publicado y los demás identifican contenido pendiente.
- Primera lección completa: **Dinero y poder adquisitivo**, con objetivos, explicación, ejemplos numéricos didácticos, diagrama, errores habituales, resumen y fuentes oficiales del Banco Central Europeo.
- Evaluación de cinco preguntas con corrección en el servidor, explicaciones y posibilidad de repetir. Aprobar exige al menos un 80 % de aciertos y resolver correctamente el cálculo numérico; completar la lección requiere además confirmar la lectura.
- Persistencia en SQLite de intentos, lecciones completadas y conceptos que requieren repaso.
- Ajustes del nombre y del objetivo semanal de días de estudio.
- Medición local de lectura activa como ayuda para registrar estudio. El tiempo de uso no sustituye a la evaluación de competencias.

El porcentaje de progreso se refiere a las **lecciones publicadas**, no a todo el plan. Aprobar la única lección inicial puede mostrar un 100 % de lo publicado y no completa el nivel 0 ni los 13 niveles. Las pantallas de futuras herramientas explican su estado pendiente.

## Instalación y ejecución

Requisitos: Node.js **20.17 o superior**, npm **10 o superior** y una terminal en la raíz del repositorio. El proyecto utiliza Next.js 16, React 19, TypeScript y Prisma 6.19.3 con SQLite. No requiere claves API ni cuentas externas.

En PowerShell:

```powershell
Copy-Item .env.example .env
npm install
npm run db:setup
npm run dev
```

Copia `.env.example` solo durante la configuración inicial; si ya tienes `.env`, conserva su configuración. Abre [http://127.0.0.1:3000](http://127.0.0.1:3000).

La variable inicial es:

```dotenv
DATABASE_URL="file:./dev.db"
```

La base SQLite se crea en `prisma/dev.db`. `db:setup` genera el cliente Prisma, aplica migraciones y sincroniza el contenido inicial mediante una semilla idempotente: repetirlo no debe borrar tu progreso. La base de datos y `.env` no se versionan.

Para ejecutar una compilación de producción local, detén antes el servidor de desarrollo:

```powershell
npm run build
npm start
```

Ambos servidores escuchan por defecto en `127.0.0.1`. Esta entrega está pensada para un único usuario local: no incluye autenticación, permisos multiusuario ni instrucciones de publicación. No expongas este servidor a una red como si fuera un servicio preparado para múltiples usuarios.

## Comprobaciones

```powershell
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Las pruebas de navegador necesitan Chromium de Playwright; si aún no está disponible, ejecuta `npx playwright install chromium`. Utilizan la compilación de producción, un servidor en el puerto 3100 y una base nueva bajo `.playwright/`, separada de tus datos personales. Consulta [TESTING.md](TESTING.md) para conocer el alcance y el estado de las verificaciones.

## Datos, fuentes y limitaciones

El contenido explica conceptos financieros con fuentes oficiales enlazadas desde la lección. Los importes y porcentajes de sus ejemplos son **sintéticos y educativos**, no cotizaciones, series históricas ni predicciones. No se suministran datos de mercado ni recomendaciones de inversión, y no se garantiza rentabilidad.

Quedan pendientes la ampliación del currículo, los exámenes por nivel, las calculadoras financieras, los gráficos de mercado, la importación de históricos, el simulador, el replay, el backtesting, el diario, las noticias, el calendario y el tutor con IA. Las metas de 100 lecciones, 300 ejercicios y 50 escenarios son objetivos de cobertura futura.

La lectura activa se mide desde el navegador; no equivale a tiempo de estudio certificado y puede variar si se cierra la pestaña antes de guardar. Para conservar los datos al actualizar, mantén el archivo SQLite y realiza copias con la aplicación detenida, como se explica en [DEVELOPMENT.md](DEVELOPMENT.md).

## Documentación

- [ARCHITECTURE.md](ARCHITECTURE.md): decisiones técnicas, límites y evolución.
- [DEVELOPMENT.md](DEVELOPMENT.md): comandos, persistencia y mantenimiento local.
- [CURRICULUM.md](CURRICULUM.md): estructura educativa y contenido publicado.
- [ROADMAP.md](ROADMAP.md): siete fases y criterios de entrega.
- [TESTING.md](TESTING.md): verificaciones y flujos de aceptación.
- [CHANGELOG.md](CHANGELOG.md): cambios de esta versión.
