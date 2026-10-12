# Pruebas de la versión estática

## Estado

Validación local completada el **12 de octubre de 2026** sobre la versión estática. Entorno: Windows, Node.js 20.17.0, npm 11.13.0 y Playwright 1.64.0. Las pruebas de navegador utilizaron Chromium **145.0.7632.6**, revisión 1208 ya instalada, mediante `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`; no la revisión predeterminada de Playwright 1.64.0.

| Comprobación | Resultado observado |
| --- | --- |
| `npm run typecheck` | Correcto; ejecuta `next typegen` antes de TypeScript. |
| `npm test` | **107/107**: 49 de evaluación, 11 de progreso, 9 de almacenamiento, 34 de backups y 4 de rutas de exportación. |
| `npm run build` | Correcto: 15 páginas generadas, 14 archivos esenciales y 449 enlaces/recursos comprobados. |
| Compatibilidad Windows | 12 recursos segmentados normalizados al formato plano de Next. |
| `npm run test:e2e` local | **5/5**, en 18,7 s, sobre `out/` en `/forextrd/`. |
| E2E sobre GitHub Pages | **5/5**, en 17,5 s, directamente sobre `https://erbxl.github.io/forextrd/`. |
| `npm audit --omit=dev` | Cero vulnerabilidades reportadas en las dependencias de producción en esa ejecución. |

El despliegue de la revisión `24305063dec30f27d2379e5ead70abc2c9b4243c` terminó correctamente en [GitHub Actions](https://github.com/erbxl/forextrd/actions/runs/38146360654). La [portada pública](https://erbxl.github.io/forextrd/) respondió HTTP 200 con el título «Tu espacio | Forex Academy Pro». La suite completa también pasó sobre esa publicación: navegación y recarga de rutas profundas, evaluación, persistencia, preferencias, temas, backups y rechazo de archivos inválidos, sin errores de consola ni recursos fallidos en los flujos comprobados.

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

`typecheck` genera sus tipos de rutas con `next typegen`, de modo que el workflow puede ejecutarlo antes del primer build en un checkout sin `.next/`.

Cada prueba abre un contexto de navegador nuevo y aislado, con su propio IndexedDB. No se utiliza el perfil habitual ni se comparte progreso entre pruebas. Los tests de servicios emplean `fake-indexeddb`, que no sustituye las comprobaciones de navegador real.

Para usar un Chromium existente puede configurarse `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` con la ruta absoluta del ejecutable. El navegador por defecto es la revisión administrada por Playwright. Si se utiliza otra, registra esa diferencia con el resultado.

## Cobertura comprobada

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

Pages ya está activado para este repositorio. Para ejecutar la misma suite sobre el sitio publicado, en PowerShell:

```powershell
$env:PLAYWRIGHT_BASE_URL = "https://erbxl.github.io/forextrd/"
npm run test:e2e
Remove-Item Env:PLAYWRIGHT_BASE_URL
```

Con esta variable no se inicia un servidor local. Los registros de prueba permanecen en IndexedDB del contexto aislado; no se envían a un backend remoto. La eliminación de la variable devuelve las próximas ejecuciones al artefacto local. Conserva la barra final del prefijo.

Después de cada nueva publicación comprueba también:

1. Abre la URL publicada por el trabajo `deploy`.
2. Comprueba dashboard, fuentes, iconos y estilos.
3. Abre directamente `/forextrd/academia/dinero-y-poder-adquisitivo/` y recarga.
4. Completa una evaluación, cambia ajustes y recarga para comprobar IndexedDB.
5. Exporta una copia y prueba su restauración en un perfil de navegador de pruebas.
6. Comprueba consola y red: no deben existir llamadas a localhost, APIs retiradas ni recursos 404.

Registra la URL real, revisión, fecha, navegador, comandos y resultados. Si faltan permisos para activar Pages, indica el paso de configuración pendiente; no declares el despliegue verificado.

## Límites de las pruebas

`fake-indexeddb` no reproduce todas las cuotas, restricciones del modo privado ni diferencias entre navegadores. La revisión móvil no es una auditoría completa de accesibilidad. Simulador, datos de mercado, backtesting, autenticación y sincronización no se validan porque siguen pendientes.
