# Forex Academy Pro

Academia de Forex en español con 13 niveles, 104 lecciones, 449 preguntas de lección y 13 exámenes. Incluye práctica numérica, calculadoras, simulador, replay, backtesting, diario y tutor de consulta del temario. Next.js genera un sitio estático para GitHub Pages; los cálculos y los datos personales permanecen en el navegador.

Esta ampliación está implementada en el repositorio local. La dirección de publicación es [erbxl.github.io/forextrd/](https://erbxl.github.io/forextrd/); el estado de esta entrega y sus pruebas se documenta en [TESTING.md](TESTING.md). No se ha publicado esta ampliación durante su desarrollo.

## Aprender y desbloquear niveles

Cada nivel tiene ocho lecciones y un examen. El nivel 0 está disponible desde el inicio. Para completar una unidad necesitas al menos un 80 %, todas las preguntas obligatorias correctas y confirmar la lectura. Completar sus ocho lecciones abre el examen; completarlo desbloquea el siguiente nivel. El progreso anterior de la primera lección se conserva.

- 104 ejemplos resueltos, diagramas, fuentes y explicaciones de los errores.
- Preguntas de selección, verdadero/falso, cálculo, respuesta textual y ordenación; algunas incluyen velas con tabla accesible.
- 13 exámenes de 16 preguntas: reutilizan 208 selecciones del banco de lecciones, sin inflar el número de preguntas originales.
- Glosario de 90 términos, biblioteca de fuentes, repaso de errores, plan semanal y seguimiento de lectura.
- Práctica reproducible de pips, posición y expectativa con tres dificultades adaptativas y registro de intentos.

## Laboratorio disponible

| Herramienta | Funciones |
| --- | --- |
| Calculadoras | 14 herramientas: pips, valor por pip, lotes, posición, margen, apalancamiento, riesgo por operación, riesgo/beneficio, drawdown, recuperación, expectativa, equilibrio, costes y Monte Carlo. |
| Simulador | Saldo virtual, órdenes mercado/límite/stop, SL/TP, cierres manuales, margen, stop-out, spread, deslizamiento, comisiones y financiación. Historial, curva, CSV y sesiones guardadas. |
| Replay | Avance por vela, reproducción/pausa, fecha inicial, futuro oculto en el gráfico, soportes/resistencias y recuperación de sesiones. |
| Backtesting | Cruce SMA y ruptura de canal parametrizables, riesgo, costes, intervalo, entrenamiento/prueba separados, métricas, curvas, JSON/CSV y experimentos guardados. |
| Diario | Crear, editar y eliminar registros; motivos, emociones, reglas, errores, captura, resultado neto, múltiplos R y analítica por estrategia y hora UTC. |
| Mentor | Consulta local de explicaciones y fuentes del currículo, modo técnico y revisión de errores; no conecta con un modelo de IA. |

Los precios incluidos son simulados y están etiquetados. Puedes importar CSV propios con fuente declarada: 2–5000 velas, hasta 2 MiB. El motor interpreta OHLC como precio medio. No hay cotizaciones en directo, broker ni órdenes reales. Las ambigüedades intravela, la conversión fija y el modelo de financiación se explican en las herramientas.

## Ejecutar y comprobar

Node.js 22 recomendado (mínimo declarado 20.17, npm 10):

```powershell
npm ci
npm run dev
```

Desarrollo: http://127.0.0.1:3000/forextrd/. No necesitas claves API ni una base de datos de servidor.

```powershell
npm run typecheck
npm test
npm run build
npm run preview
```

La previsualización sirve el último artefacto de `out/` en http://127.0.0.1:3100/forextrd/. Detén la previsualización manual antes de ejecutar `npm run test:e2e`; Playwright inicia su propio servidor. Si falta Chromium, instala la revisión requerida con `npx playwright install chromium`.

## Datos y copias

IndexedDB pertenece a cada origen, navegador y perfil. GitHub no sincroniza tus datos. Ajustes permite exportar una copia JSON, previsualizar una importación y confirmar su sustitución atómica. Las copias actuales usan versión 2 y aceptan copias de versión 1; la migración local a esquema 3 conserva el historial existente. Las sesiones de trading se conservan al pulsar Guardar. El diario y los ejercicios se guardan al confirmar cada registro.

Las copias contienen datos personales sin cifrar: guárdalas fuera del repositorio. Borrar los datos del sitio, cambiar de dispositivo o usar otro puerto puede mostrar un perfil vacío. La exportación tiene un límite de 10 MiB; exporta los CSV o JSON de sesiones y experimentos también para conservar resultados individuales.

## Publicación y límites

El workflow existente de GitHub Actions comprueba tipos, tests y build, y publica exclusivamente `out/` al enviar cambios a `main`. Configuración de Pages: **Settings → Pages → Source: GitHub Actions**. Se mantiene `basePath: /forextrd` y cada ruta genera su propio HTML.

La aplicación es de autoaprendizaje: respuestas y estado local son inspeccionables. No ofrece certificación protegida, autenticación, sincronización entre dispositivos ni caché offline completa. El mentor no es un LLM. Los calendarios enlazan a organismos oficiales; no hay calendario sincronizado, consenso de mercado ni noticias integradas. Las simulaciones no reconstruyen ticks ni garantizan resultados futuros. Cualquier integración con secretos necesita un servicio externo; no se deben incluir claves privadas en el sitio estático.

## Documentación

[Programa](CURRICULUM.md) · [Arquitectura](ARCHITECTURE.md) · [Desarrollo](DEVELOPMENT.md) · [Estado y siguientes mejoras](ROADMAP.md) · [Pruebas](TESTING.md) · [Historial](CHANGELOG.md) · [Migración original](MIGRATION.md)
