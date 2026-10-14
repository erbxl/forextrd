# Desarrollo y publicación

## Inicio

Se recomienda Node.js 22, utilizado en CI; el mínimo del proyecto es 20.17 con npm 10. Conserva `package-lock.json` y ejecuta desde la raíz:

```powershell
npm ci
npm run dev
```

Dirección de desarrollo: `http://127.0.0.1:3000/forextrd/`. No hay configuración habitual de `.env`, credenciales ni base del servidor. IndexedDB se inicializa al visitar la aplicación.

## Comandos

| Comando | Finalidad |
| --- | --- |
| `npm run dev` | Desarrollo Next.js local bajo `/forextrd/`. |
| `npm run typecheck` | Comprobar TypeScript. |
| `npm test` | Currículo, ejecución, cálculos, práctica, almacenamiento y backups mediante Vitest. |
| `npm run test:watch` | Vitest durante desarrollo. |
| `npm run build` | Exportar a `out/` y verificar el artefacto. |
| `npm run preview` / `npm start` | Servir archivos de `out/` en `127.0.0.1:3100/forextrd/`. |
| `npm run test:e2e` | Navegador sobre el último build estático. |

`preview` no ejecuta Next.js, no corrige ejercicios y no tiene APIs. Solo sirve archivos, devuelve 404 para rutas inexistentes y redirige directorios a su variante con barra final. No contiene una redirección general a la portada. Para otro puerto en PowerShell:

```powershell
$env:PREVIEW_PORT = "3101"
npm run preview
```

El puerto de E2E permanece en 3100. Cada puerto constituye un origen diferente a efectos de almacenamiento. Tras una modificación, vuelve a compilar antes de comprobar `preview`; el servidor no recompila archivos.

### Compatibilidad de exportación en Windows

La versión instalada de Next.js 16.4 recoge rutas de segmentos con `path.relative`, pero su codificador de nombres estáticos sustituye solo `/`. En Windows se observó `academia/__next.academia/__PAGE__.txt` donde el navegador solicita `academia/__next.academia.__PAGE__.txt`. La comprobación del build ejecuta `scripts/static-export-paths.mjs` para copiar esos archivos de texto a los nombres planos esperados, conservando los originales y rechazando colisiones de contenido. Si el exportador ya produce nombres planos, como en Linux, no modifica nada.

La corrección se aplica al artefacto publicable, sin rewrites exclusivos de la previsualización. Sus pruebas cubren rutas normales y dinámicas, repetición, salida plana y colisiones. Al actualizar Next, comprueba de nuevo el exportador y retira esta compatibilidad cuando ya no sea necesaria. La navegación entre páginas utiliza payloads estáticos además de HTML; ambos deben existir. [Exportación estática de Next.js](https://nextjs.org/docs/app/guides/static-exports).

## Persistencia y backups

El catálogo educativo está versionado en TypeScript, separado de ejercicios y soluciones. El estado del estudiante se almacena en IndexedDB con Dexie. Conserva identificadores estables de preguntas y lecciones; los resultados existentes dependen de ellos.

Añadir una versión de esquema requiere una migración que preserve los datos. Revisa los tests de actualizaciones e inicialización idempotente y añade casos que abran una base anterior. No uses `deleteDatabase` como ruta normal de actualización.

Para respaldar o mover datos, utiliza la exportación JSON de Ajustes. La importación valida, muestra el alcance y solicita confirmar la sustitución. El restablecimiento también pide confirmación. Mantén las copias fuera del código fuente y del directorio `public/`: contienen datos personales y no están cifradas.

La lectura depende de una pestaña visible y enfocada, medida con el reloj local. Los intervalos aún no guardados pueden perderse al cerrar. No representa competencia ni tiempo certificado. El objetivo semanal se reinicia el lunes en `Europe/Madrid`.

Una instalación previa con archivos SQLite debe conservarlos como archivo histórico. Esta migración no incluye conversión automática a IndexedDB. Ya no se utilizan comandos `db:setup`, semilla Prisma ni variables de conexión en la ejecución habitual.

## GitHub Pages

El workflow `.github/workflows/deploy.yml` se activa por push a `main` o de forma manual. Utiliza Node 22, `npm ci`, typecheck, tests, build, comprobación de `out/` y acciones oficiales de Pages. Se publica únicamente el artefacto generado; el despliegue requiere la rama `main`.

Activa **Repository Settings → Pages → Build and deployment → Source: GitHub Actions**. Si el workflow indica que Pages no está configurado, completa ese paso con una cuenta que administre el repositorio y vuelve a ejecutar el workflow. Comprueba la URL devuelta por el trabajo `deploy` y recarga directamente una lección. [Guía oficial de workflows de Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

`configure-pages` no modifica automáticamente el código de Next en este workflow: `basePath` y exportación están definidos en `next.config.ts`. La subida de `out/` mediante Actions evita una compilación Jekyll y conserva `_next/`. [Acción oficial de subida de artefactos](https://github.com/actions/upload-pages-artifact).

No se necesita un token personal en el código. Los permisos de escritura se conceden solo al trabajo de publicación mediante el token temporal de Actions. No copies claves privadas a `NEXT_PUBLIC_*`, `public/` o archivos TypeScript.

## Continuar la academia

Mantén los apartados definidos en [CURRICULUM.md](CURRICULUM.md), fuentes verificables y ejemplos etiquetados. Cada modalidad publicada necesita casos de referencia, corrección explicada, guardado y repetición. Una nueva ruta de lección debe figurar en los parámetros estáticos y generar su HTML.

Las herramientas actuales se implementan en módulos TypeScript locales; sus supuestos se documentan en ARCHITECTURE.md. Para datos grandes, considera paginación, cuotas, importación por bloques y Web Workers. Las interfaces de proveedores externos deben hacer explícitas CORS, licencia y disponibilidad; no añadas datos inventados para cubrir una integración ausente.

## Diagnóstico

- **Portada 404:** utiliza `/forextrd/`, no la raíz del dominio.
- **Vista previa antigua:** repite `npm run build`.
- **Ruta profunda o recursos 404:** comprueba su archivo en `out/`, el prefijo y la barra final; no ocultes el fallo mediante fallback SPA.
- **No aparecen mis datos:** verifica navegador, perfil, modo privado y origen; importa tu copia si has cambiado de entorno.
- **Almacenamiento no disponible:** revisa restricciones del navegador y el mensaje de error. La interfaz no debe afirmar que ha guardado algo que IndexedDB rechazó.
- **Falta Chromium:** instala la revisión requerida por Playwright. Los detalles de diagnóstico están en [TESTING.md](TESTING.md).
