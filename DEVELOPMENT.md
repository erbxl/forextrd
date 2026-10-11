# Desarrollo local

## Entorno

Node.js >= 20.17 y npm >= 10. El stack de esta entrega es Next.js 16 con App Router, React 19, TypeScript estricto, Tailwind CSS, Prisma 6.19.3, SQLite y Zod. Los comandos se ejecutan desde la raíz del repositorio. Las versiones concretas están en `package.json`; conserva el archivo de bloqueo al actualizar dependencias.

Configuración inicial en PowerShell:

```powershell
Copy-Item .env.example .env
npm install
npm run db:setup
npm run dev
```

Si `.env` ya existe, comprueba su configuración antes de modificarlo. La URL predeterminada es `DATABASE_URL="file:./dev.db"`, relativa al directorio del esquema Prisma; los datos se almacenan en `prisma/dev.db`. La aplicación está disponible en `http://127.0.0.1:3000`.

No se necesitan API keys. Añadir un proveedor externo será una tarea de una fase posterior; sus credenciales deberán quedarse en el servidor y fuera del repositorio.

## Comandos

| Comando | Finalidad |
| --- | --- |
| `npm run dev` | Servidor de desarrollo en loopback. |
| `npm run build` | Generar cliente Prisma y compilar para producción local. |
| `npm start` | Ejecutar la compilación local en loopback. |
| `npm run db:generate` | Regenerar el cliente del esquema Prisma. |
| `npm run db:migrate` | Aplicar las migraciones versionadas existentes. |
| `npm run db:seed` | Sincronizar el catálogo inicial sin reiniciar el progreso. |
| `npm run db:setup` | Generar cliente, aplicar migraciones y ejecutar la semilla. |
| `npm run typecheck` | Comprobar tipos sin emitir JavaScript. |
| `npm test` | Ejecutar las pruebas de Vitest. |
| `npm run test:watch` | Ejecutar Vitest durante el desarrollo. |
| `npm run test:e2e` | Ejecutar Playwright contra el build de producción, con SQLite aislado en el puerto 3100. |

`db:migrate` no crea una migración nueva ni reinicia la base. Si cambias el esquema, prepara una migración de desarrollo, revisa su SQL y pruébala con una base desechable antes de aplicarla a datos de estudio. No utilices `prisma migrate reset` para actualizar una instalación con progreso.

Antes de `test:e2e`, ejecuta `npm run build`. Playwright crea una carpeta nueva `.playwright/run-*`, aplica las migraciones y la semilla y arranca el servidor de producción en `127.0.0.1:3100`. No reutiliza servidores existentes ni escribe en `prisma/dev.db`. Las carpetas de ejecución se conservan para poder inspeccionar la base tras un fallo; `.playwright/`, `artifacts/`, `test-results/` y `playwright-report/` están excluidas del control de versiones.

## Persistencia y copias de seguridad

El perfil local, los resultados y el progreso se guardan en SQLite. El contenido educativo vive en archivos versionados y la semilla sincroniza su catálogo. Actualizar ese catálogo no debe reemplazar los resultados del usuario. Conserva identificadores estables para que los intentos sigan asociados a su lección.

La actividad diaria utiliza la zona horaria `Europe/Madrid`. El objetivo semanal corresponde a días de estudio, de 1 a 7, dentro de la semana de lunes a domingo; se reinicia el lunes. El gráfico de actividad muestra los últimos siete días. La precisión de respuestas agrega los intentos guardados; el repaso recoge conceptos con errores históricos, incluidos los corregidos en un intento posterior, y no constituye un diagnóstico de dominio definitivo.

El navegador envía señales de lectura activa y el servidor calcula el tiempo transcurrido: una sesión empieza con cero, cada actualización acredita como máximo 30 segundos y una pausa de más de 90 segundos se descarta. Un cursor común evita contar dos veces intervalos coincidentes entre pestañas. Al cerrar antes de la siguiente actualización puede perderse el último intervalo. Una evaluación suspensa posterior no elimina una competencia ya aprobada.

Para una copia segura de la base predeterminada:

1. Detén con `Ctrl+C` los servidores y cualquier prueba o proceso que use la base. Espera a que finalicen.
2. Crea una carpeta de copias fuera de carpetas públicas y del control de versiones.
3. Copia `prisma/dev.db` a esa carpeta. Si, tras el cierre normal, quedan archivos `dev.db-wal`, `dev.db-shm` o `dev.db-journal`, conserva también esos archivos con la misma base y sin escrituras concurrentes; no los elimines para forzar una copia.
4. Guarda junto a la copia la versión del proyecto o su identificador de revisión.

Para restaurar, detén todos los procesos, conserva primero una copia de la base actual y restaura el conjunto correspondiente. Utiliza una versión compatible del proyecto y aplica las migraciones pendientes con `npm run db:setup`. No mezcles archivos auxiliares de dos copias distintas. Una copia del código sin SQLite no contiene el historial de estudio.

## Desarrollo por módulos

La academia define el currículo y las lecciones; el motor de ejercicios corrige en el servidor; el servicio de progreso guarda y consulta resultados. Prisma concentra el acceso a datos. Consulta los límites y el flujo en [ARCHITECTURE.md](ARCHITECTURE.md).

Al publicar una lección:

1. Incluye todos los apartados educativos definidos en [CURRICULUM.md](CURRICULUM.md), fuentes verificables y ejemplos etiquetados.
2. Define preguntas con identificadores estables, soluciones y explicaciones. Separa las respuestas correctas del contenido que necesita el navegador.
3. Añade casos de prueba que comprueben resultados de referencia y reglas de aprobación.
4. Comprueba lectura, corrección, guardado, repaso y persistencia tras reiniciar.

No marques un nivel como completado por el mero hecho de terminar las lecciones actualmente publicadas. No incluyas números de actividad, mercado o trading para rellenar un estado vacío.

## Límite de seguridad local

Esta versión resuelve un usuario local y carece de autenticación multiusuario. Mantén los servidores en loopback. Las validaciones y comprobaciones de origen de las rutas no sustituyen a un sistema de identidad y permisos.

El uso de PostgreSQL requiere adaptar el proveedor y las migraciones y trasladar los datos; no se consigue únicamente cambiando `DATABASE_URL`. Antes de una versión compartida habrá que añadir autenticación, autorización, protección de sesiones y una revisión específica de despliegue.

## Incidencias frecuentes

- **Faltan tablas o cliente Prisma:** comprueba `.env` y ejecuta `npm run db:setup`.
- **SQLite bloqueado:** detén procesos de pruebas y servidores duplicados antes de repetir la operación. No borres la base para resolver el bloqueo.
- **Puerto 3000 ocupado:** detén la instancia anterior antes de arrancar otra; producción y desarrollo no pueden compartir el mismo puerto.
- **Playwright no encuentra Chromium:** ejecuta `npx playwright install chromium` y repite el flujo de [TESTING.md](TESTING.md).
- **No se puede instalar o generar:** comprueba la versión de Node y el acceso al registro npm y a los binarios necesarios. La instalación inicial requiere red; el aprendizaje básico utiliza la base local.
