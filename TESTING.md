# Pruebas de la versión estática

## Estado

Las verificaciones de la migración están **pendientes de ejecución y confirmación**. Los resultados de la versión anterior con servidor no acreditan esta arquitectura. La publicación remota en GitHub Pages tampoco está confirmada por la mera existencia del workflow.

## Procedimiento

Desde la raíz, con dependencias instaladas mediante `npm ci`:

```powershell
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Instala Chromium solo si no está disponible la revisión requerida. E2E necesita el build más reciente y el puerto 3100 libre; inicia su propio servidor que sirve exclusivamente `out/` bajo `/forextrd/`. No ejecuta Next.js ni un backend de pruebas.

Cada prueba abre un contexto de navegador nuevo y aislado, con su propio IndexedDB. No se utiliza el perfil habitual ni se comparte progreso entre pruebas. Los tests de servicios emplean `fake-indexeddb`, que no sustituye las comprobaciones de navegador real.

Para usar un Chromium existente puede configurarse `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` con la ruta absoluta del ejecutable. El navegador por defecto es la revisión administrada por Playwright. Si se utiliza otra, registra esa diferencia con el resultado.

## Cobertura requerida

| Área | Comprobación |
| --- | --- |
| Evaluación | 80 % mínimo, cálculo obligatorio, tolerancia numérica y cargas inválidas. |
| Persistencia | Inicialización idempotente, intentos, finalización, preferencias, actividad y migraciones. |
| Copias JSON | Estructura y versión, previsualización, confirmación, restauración atómica y rechazo de archivos incompatibles. |
| Exportación | HTML de cada ruta, recursos bajo el prefijo, ausencia de dependencias de backend en el artefacto. |
| Compatibilidad Windows | Nombres planos de segmentos Next, conservación de originales, idempotencia, colisiones y lista de archivos admitidos. |
| Navegador | Dashboard inicial, evaluación, recarga, progreso, ajustes, temas y backups. |
| Hosting estático | Rutas profundas y navegación bajo `/forextrd/`, 404 reales y recursos cargados. |

La evaluación inicial debe rechazar el 80 % obtenido al fallar la pregunta numérica. Tras aprobar, la confirmación de lectura habilita la finalización. La recarga debe recuperar el estado desde IndexedDB, y el porcentaje publicado no debe presentarse como currículo completo.

Los E2E verifican exportación de JSON, restablecimiento confirmado e importación con previsualización antes de confirmar. Un JSON inválido no debe modificar ajustes ni progreso. La prueba móvil usa un viewport, no un dispositivo físico.

## Artefactos

Las capturas de revisión se guardan en `artifacts/dashboard.png` y `artifacts/mobile.png`. Los fallos conservan traza y captura en `test-results/`; el informe HTML está en `playwright-report/`. Estos directorios están ignorados por Git. Su existencia no significa que las pruebas hayan pasado.

## Verificación remota

Después de una ejecución satisfactoria de Actions:

1. Abre la URL publicada por el trabajo `deploy`.
2. Comprueba dashboard, fuentes, iconos y estilos.
3. Abre directamente `/forextrd/academia/dinero-y-poder-adquisitivo/` y recarga.
4. Completa una evaluación, cambia ajustes y recarga para comprobar IndexedDB.
5. Exporta una copia y prueba su restauración en un perfil de navegador de pruebas.
6. Comprueba consola y red: no deben existir llamadas a localhost, APIs retiradas ni recursos 404.

Registra la URL real, revisión, fecha, navegador, comandos y resultados. Si faltan permisos para activar Pages, indica el paso de configuración pendiente; no declares el despliegue verificado.

## Límites de las pruebas

`fake-indexeddb` no reproduce todas las cuotas, restricciones del modo privado ni diferencias entre navegadores. La revisión móvil no es una auditoría completa de accesibilidad. Simulador, datos de mercado, backtesting, autenticación y sincronización no se validan porque siguen pendientes.
