# Verificación y pruebas

## Estado de la entrega

Las verificaciones están **pendientes de ejecución y confirmación** durante la implementación de esta entrega. Este documento describe el procedimiento y los criterios; no constituye por sí mismo evidencia de que las comprobaciones hayan pasado.

## Preparación

Instala dependencias y configura la base según [README.md](README.md). Vitest crea su base de integración en una carpeta temporal. Playwright crea una base nueva bajo `.playwright/run-*`, aplica migraciones y semilla y utiliza un servidor de producción en `http://127.0.0.1:3100`. Ninguna de estas pruebas escribe en `prisma/dev.db`.

Comandos de validación:

```powershell
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

La instalación de Chromium es necesaria únicamente si Playwright no tiene disponible el navegador. Requiere acceso a sus binarios. Un fallo de descarga impide ejecutar las pruebas de navegador y debe registrarse como una limitación, no como una prueba aprobada.

`test:e2e` requiere haber ejecutado `npm run build` después del último cambio. No reutiliza un servidor que ya esté escuchando en el puerto 3100. La configuración ejecuta cuatro pruebas seriales en Chromium: instalación vacía y protección de rutas; intento fallido y finalización; ajustes; navegación móvil y temas. La prueba móvil utiliza un viewport de 390 × 844, no un dispositivo físico.

Para un entorno con un Chromium ya instalado puede configurarse `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` con la ruta absoluta de su ejecutable. El comportamiento predeterminado utiliza la revisión administrada por Playwright; cualquier sustitución del navegador debe registrarse con los resultados.

El flujo guarda capturas en `artifacts/dashboard.png` y `artifacts/mobile.png`. Playwright conserva trazas y capturas de fallos en `test-results/` y un informe en `playwright-report/`. Las bases de cada ejecución permanecen en `.playwright/` para diagnóstico. Todos estos directorios están ignorados por Git; los archivos no deben considerarse resultados aprobados si el comando falló.

## Alcance

| Capa | Qué debe comprobar |
| --- | --- |
| TypeScript | Coherencia de contratos y tipos. |
| Vitest | Reglas deterministas de corrección, puntuación, cálculo y progreso. |
| Persistencia | Intentos y finalización guardados; repetición de la semilla sin reiniciar progreso. |
| Playwright | Lectura, evaluación, corrección y progreso desde el navegador. |
| Compilación | Generación de Prisma y build de producción. |
| Revisión manual | Navegación por teclado, móvil, temas, estados vacíos, errores y reinicio. |

## Casos esenciales de la primera unidad

- Confirmar que un perfil nuevo no presenta lecciones aprobadas ni actividad inventada.
- Abrir «Dinero y poder adquisitivo» desde academia o dashboard.
- Impedir completar la unidad solo por visitarla o por acumular tiempo de lectura.
- Mostrar corrección y explicación para cada respuesta enviada.
- Guardar un intento suspenso y reflejar los conceptos que requieren repaso.
- Exigir un 80 % como mínimo y la respuesta numérica correcta para aprobar, y la confirmación de lectura para completar la lección. Acertar cuatro respuestas con el cálculo equivocado no debe aprobar la evaluación.
- Aprobar con respuestas suficientes y comprobar que la finalización se conserva al recargar.
- Repetir la evaluación sin duplicar la lección completada.
- Identificar que completar lo publicado no equivale a completar el currículo.
- Guardar el nombre y el objetivo semanal y comprobarlos tras volver a abrir ajustes.

Las respuestas correctas y la nota se deciden en el servidor. La validación debe rechazar cargas mal formadas, lecciones inexistentes y valores fuera de las restricciones admitidas.

## Comprobación manual de persistencia

1. Inicia la aplicación local y responde a la evaluación.
2. Anota el resultado y el estado del dashboard.
3. Detén el servidor con `Ctrl+C` y vuelve a ejecutarlo sin borrar la base.
4. Comprueba que resultados, perfil y progreso permanecen.
5. Detén el servidor, ejecuta `npm run db:setup` y arranca de nuevo. La semilla debe conservar los resultados existentes.

## Revisión de interfaz

Comprueba al menos una anchura de escritorio y una móvil, los dos temas, el acceso por teclado, foco visible y etiquetas de campos. Los módulos futuros deben indicar su estado pendiente, sin formularios que simulen resultados ni gráficos con precios presentados como reales.

La revisión visual no sustituye una auditoría de accesibilidad y los tests de esta fase no validan simulación, backtesting, datos de mercado ni multiusuario, porque esas funcionalidades aún no están implementadas.

## Registro de resultados

Al verificar una versión, registra el comando, resultado, fecha y entorno; incluye las limitaciones o comprobaciones omitidas. No transformes un bloqueo de herramientas o de red en un resultado satisfactorio. Los resultados del build no sustituyen a ejecutar los flujos de navegador.
