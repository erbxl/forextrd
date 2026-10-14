# Pruebas de la versión estática

## Estado de 0.3.0 · 14 de octubre de 2026

Validación del árbol de trabajo local, sin publicar esta ampliación. Windows, Node.js 20.17.0, npm 11.13.0 y Playwright 1.64.0. Chromium 145.0.7632.6, revisión 1208 ya instalada, seleccionado mediante `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`; no se utilizó la revisión predeterminada de Playwright.

| Comprobación | Resultado |
| --- | --- |
| TypeScript | Correcto, tanto en typecheck como en build. |
| Vitest | **155/155** en 10 archivos. |
| Build estático | Correcto: 133 páginas generadas; 133 entradas esenciales y 4626 enlaces/recursos verificados bajo /forextrd/. Las entradas esenciales incluyen recursos y una ruta repetida, no son un recuento de lecciones. |
| Compatibilidad Windows | 130 recursos segmentados normalizados al nombre plano esperado por Next. |
| Playwright local | **13/13**, 57,5 s, contra archivos de out/ servidos en /forextrd/. |
| Inventario de contenido | 104 lecciones, 449 preguntas, 13 exámenes con 208 selecciones, 104 ejemplos, 90 términos sin duplicados y 75 URL de fuentes. |
| Publicación 0.3.0 | No realizada ni verificada en esta entrega. |

## Cobertura de lógica e integración

- 49 pruebas de evaluación: respuestas y validación del contrato de preguntas.
- 11 de progreso: intentos, aprobación, lectura, finalización y estadísticas reales.
- 9 de almacenamiento: inicialización, consultas observables y migración conservando datos.
- 34 de copias: exportación, importación, versiones, validación, recalificación, rollback y restablecimiento.
- 4 de exportación: compatibilidad de rutas estáticas de Next en Windows.
- 4 de currículo: contenido, soluciones, requisitos y recorrido completo de las 104 lecciones más 13 exámenes, exportando/restaurando sus desbloqueos.
- 18 de calculadoras y mercado: fórmulas de referencia, límites numéricos, Monte Carlo y CSV inválidos.
- 5 de diario: resultados netos, riesgo, financiación como abono, persistencia y validación.
- 6 de práctica: variantes deterministas, cálculos independientes, dificultad, restauración, recalificación y capturas grandes en copias.
- 15 de simulación/backtesting: siguiente apertura, compras/ventas, costes, límites, gaps, SL/TP ambiguos, margen, stop-out, financiación, señales causales, muestras independientes y recuperación de sesiones y experimentos en otra base.

El ensayo de tamaño máximo ejecutó 5000 velas sintéticas repetidas y obtuvo 207 operaciones en aproximadamente 1,95 s en Node de este equipo. Es una observación local, no un benchmark general ni un histórico de mercado. La interfaz ejecuta el backtest en un Web Worker cancelable para evitar bloquear la navegación.

## Cobertura de navegador

1. Navegación por rutas estáticas, recarga profunda, prefijo y 404 reales.
2. Evaluación con cálculo obligatorio, intentos y finalización persistente.
3. Perfil, objetivo, tema y navegación móvil.
4. Exportación, restablecimiento e importación con previsualización y confirmación.
5. Rechazo de JSON corrupto y versión futura sin modificar datos.
6. Ocho lecciones del nivel 0, examen, desbloqueo del nivel 1 y persistencia al recargar; acceso directo bloqueado antes de cumplir requisitos.
7. Calculadoras con resultados de referencia y rechazo de stops incoherentes.
8. Diario: pérdida con plan respetado, guardado, edición y recarga.
9. Glosario y consulta del mentor sobre contenido real del currículo.
10. Tres variantes correctas elevan la dificultad y conservan historial.
11. Orden de simulador, siguiente apertura, cierre, guardado, recuperación, envío al diario y exportación de copia.
12. Replay de CSV, fecha inicial, solo velas reveladas, anotación, guardado y recuperación; comprobación de anchura móvil.
13. Backtest en worker, guardado y reproducción de los mismos resultados.

Los flujos instrumentados no produjeron errores de JavaScript ni de consola. Las pruebas originales comprueban además recursos fallidos y ausencia de APIs retiradas. Las capturas locales revisadas incluyen dashboard, simulador, replay móvil y backtesting. El cambio de vista móvil es un viewport de Chromium, no un teléfono físico.

## Repetir la verificación

```powershell
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

La instalación de Chromium solo hace falta si no está disponible la revisión requerida. Para usar otro ejecutable instalado, establece `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` con su ruta absoluta. Detén cualquier previsualización manual en el puerto 3100: Playwright inicia su propio servidor de archivos. El build debe ser posterior a los cambios de código que se quieran verificar.

Cada prueba utiliza un contexto de navegador aislado. Las copias y los datos de prueba no se envían a un backend. Capturas: `artifacts/`; informe: `playwright-report/`; fallos y trazas: `test-results/`. Estos directorios están excluidos de Git y su existencia por sí sola no demuestra éxito.

## Publicación y evidencia histórica

La versión 0.2.0 se verificó el 12 de octubre de 2026: 107 tests y 5 E2E locales/remotos sobre la revisión `24305063dec30f27d2379e5ead70abc2c9b4243c`, [despliegue de Actions](https://github.com/erbxl/forextrd/actions/runs/38146360654). Esa evidencia corresponde a la primera fase, no a las funciones nuevas de 0.3.0. El audit de producción sin vulnerabilidades registrado entonces tampoco constituye un audit actualizado de esta entrega.

Después de publicar esta ampliación, se puede ejecutar la suite remota:

```powershell
$env:PLAYWRIGHT_BASE_URL = "https://erbxl.github.io/forextrd/"
npm run test:e2e
Remove-Item Env:PLAYWRIGHT_BASE_URL
```

Comprobar también portada, fuentes, rutas profundas, recursos del worker y restauración en un perfil de pruebas. Registrar revisión, fecha y URL del despliegue observado.

## Límites

Las pruebas no acreditan rentabilidad ni ejecución de un bróker. OHLC no reconstruye ticks; el modelo de costes y financiación es didáctico. No se han probado feeds, calendario sincronizado, IA externa, autenticación ni sincronización, porque no se integran en esta versión. Las fuentes jurídicas necesitan revisión periódica y los textos educativos se beneficiarían de revisión docente independiente.

fake-indexeddb no reproduce cuotas reales, restricciones de modo privado ni todos los navegadores. No se ha realizado una auditoría completa de accesibilidad ni de seguridad. Los límites de entrada y las transacciones no protegen contra la manipulación voluntaria de las respuestas o del estado local.
