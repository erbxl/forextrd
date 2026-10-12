# Forex Academy Pro

Academia de Forex en español con Next.js, React y TypeScript, exportada como **sitio estático para GitHub Pages**. La Fase 1 conserva su diseño, una primera unidad educativa completa, ejercicios, dashboard y progreso. La corrección y la persistencia se ejecutan en el navegador, sin un servidor de aplicación.

Sitio publicado: [erbxl.github.io/forextrd/](https://erbxl.github.io/forextrd/). El 12 de octubre de 2026 se verificaron el despliegue y las cinco pruebas funcionales de navegador directamente sobre GitHub Pages. Evidencia y entorno en [TESTING.md](TESTING.md).

## Qué está disponible

- Navegación lateral responsive, modo oscuro y claro, dashboard y perfil local.
- Currículo de 13 niveles: nivel 0 parcialmente publicado y resto del contenido pendiente.
- Lección «Dinero, precios y poder adquisitivo», con explicaciones, ejemplos didácticos, recurso visual y fuentes oficiales del BCE.
- Cinco preguntas corregibles y repetibles, explicaciones y conservación de intentos.
- Aprobación con al menos un 80 % y cálculo numérico obligatorio correcto; completar exige además confirmar la lectura.
- Progreso, conceptos para repasar, lectura activa y objetivo semanal de días de estudio.
- Datos locales en IndexedDB mediante Dexie; exportación e importación JSON con validación, previsualización y confirmación.
- Restablecimiento de datos con confirmación explícita.

El 100 % de lecciones publicadas **no equivale a completar el nivel 0 ni los 13 niveles**. Las herramientas futuras muestran su estado pendiente; no inventan resultados ni datos de mercado.

## Desarrollo local

Se recomienda Node.js 22, también utilizado por GitHub Actions. El mínimo declarado es Node.js 20.17 y npm 10. Desde la raíz:

```powershell
npm ci
npm run dev
```

Abre [http://127.0.0.1:3000/forextrd/](http://127.0.0.1:3000/forextrd/). No necesitas `.env`, claves API, migraciones de servidor ni inicializar una base de datos manualmente. La primera visita crea el perfil local.

## Compilación y prueba del sitio estático

```powershell
npm run typecheck
npm test
npm run build
npm run preview
```

El build genera `out/`. La previsualización sirve exclusivamente esos archivos en [http://127.0.0.1:3100/forextrd/](http://127.0.0.1:3100/forextrd/), sin Next.js en ejecución. `npm start` es un alias de esta previsualización. No abras `out/index.html` mediante `file://`.

Para las pruebas de navegador, detén la previsualización manual y ejecuta:

```powershell
npx playwright install chromium
npm run test:e2e
```

La instalación del navegador solo es necesaria cuando falta la revisión de Chromium requerida. Playwright inicia su propio servidor de archivos y cada prueba dispone de un contexto de navegador nuevo. Consulta el alcance y resultados en [TESTING.md](TESTING.md).

Verificación completada: TypeScript, **107 pruebas unitarias y de integración**, compilación estática y **5 pruebas de navegador tanto en local como en el sitio publicado**. Incluye navegación, evaluación, persistencia, preferencias y exportación/restauración de copias.

## Publicación en GitHub Pages

Este repositorio ya utiliza GitHub Actions para Pages. Para configurar otra instalación selecciona **Settings → Pages → Build and deployment → Source: GitHub Actions**. El workflow de `.github/workflows/deploy.yml` se ejecuta tras un push a `main` o manualmente: instala con `npm ci`, comprueba tipos, ejecuta tests, compila y publica únicamente `out/` mediante las acciones oficiales. La publicación manual también se limita a `main`. [Documentación oficial de GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

La configuración fija `basePath: "/forextrd"` y `trailingSlash: true`. Las rutas profundas generan su propio `index.html`; no dependen de redirigir cualquier 404 a la portada.

## Tus datos y copias

IndexedDB guarda los datos en el navegador, perfil y origen utilizados. **GitHub no sincroniza tu progreso**. Otro dispositivo, otro navegador, una ventana privada o cambiar entre desarrollo, previsualización y Pages pueden mostrar perfiles distintos. Borrar los datos del sitio puede eliminar el historial.

En Ajustes, exporta una copia JSON y consérvala fuera del repositorio. Para trasladarla, impórtala en el navegador de destino, revisa la previsualización y confirma la sustitución. La restauración es atómica: un archivo inválido no debe aplicar cambios parciales. El JSON contiene datos personales y no está cifrado. Conserva una copia antes de restablecer o sustituir datos.

## Límites actuales

Las soluciones incluidas en el frontend son inspeccionables. Esta aplicación sirve para autoaprendizaje y no ofrece certificación resistente a manipulación. El contenido se mantiene funcional sin servicios externos; todos los ejemplos numéricos son sintéticos y educativos, no cotizaciones ni rentabilidades históricas.

GitHub Pages no ejecuta APIs de aplicación ni protege claves privadas. No incluyas secretos en el código, `NEXT_PUBLIC_*` o el artefacto publicado. Las etiquetas meta no sustituyen todas las cabeceras HTTP que un servidor propio podría establecer. No hay autenticación, sincronización, brokers, operaciones reales ni garantías de rentabilidad.

Las calculadoras, gráficos de mercado, importación de históricos, simulador, replay, backtesting, diario y tutor IA pertenecen a fases posteriores. Las futuras fuentes externas deberán permitir CORS y uso conforme a su licencia. No se garantiza funcionamiento sin conexión; esta entrega no incorpora una caché offline completa.

## Documentación

- [ARCHITECTURE.md](ARCHITECTURE.md): arquitectura estática, persistencia y límites.
- [MIGRATION.md](MIGRATION.md): auditoría y decisiones de migración.
- [DEVELOPMENT.md](DEVELOPMENT.md): desarrollo y publicación.
- [CURRICULUM.md](CURRICULUM.md): programa educativo y contenido publicado.
- [ROADMAP.md](ROADMAP.md): fases y criterios de aceptación.
- [TESTING.md](TESTING.md): verificaciones de la entrega.
- [CHANGELOG.md](CHANGELOG.md): historial de cambios.
