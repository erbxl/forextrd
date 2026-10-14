# Historial de cambios

## 0.3.0 — Academia y laboratorio local · 14 de octubre de 2026

- Programa de 104 lecciones, 449 preguntas, 104 ejemplos, 13 exámenes y glosario de 90 términos.
- Desbloqueo de niveles mediante las ocho lecciones y su examen, con conservación del progreso anterior.
- Preguntas textuales, ordenación y gráficos accesibles; práctica numérica adaptativa reproducible.
- 14 calculadoras, Monte Carlo, datos simulados y CSV validado.
- Simulador y replay con órdenes, costes, margen, sesiones y diario; backtesting SMA/canal con muestras separadas.
- Diario con analítica de disciplina y tutor local del currículo.
- Esquema IndexedDB 3 y copias versión 2 compatibles con copias versión 1.
- Validación actual y límites en TESTING.md. Ampliación local, sin nueva publicación en esta entrega.


## 0.2.0 — Migración estática de la Fase 1

### Cambios

- Conservados diseño, navegación, dashboard, currículo, primera lección, evaluación y pantallas de herramientas pendientes.
- Next.js con exportación a `out/`, prefijo `/forextrd`, barras finales y rutas profundas generadas.
- Retirado el runtime de servidor: Prisma, SQLite, API Routes y protección dependiente de Next.
- Datos personales trasladados a Dexie/IndexedDB con esquema versionado e inicialización local.
- Corrección TypeScript en navegador con los criterios previos: mínimo 80 %, cálculo obligatorio y lectura confirmada para completar.
- Contenido, definiciones de ejercicios y soluciones separados en archivos estáticos.
- Preferencias y progreso locales, con carga y errores de almacenamiento explícitos.
- Copias JSON versionadas: exportación, validación, previsualización, confirmación y restauración atómica.
- Restablecimiento con confirmación, sin borrado automático al actualizar.
- Servidor de previsualización de archivos y E2E sobre la exportación estática.
- Compatibilidad para los nombres de segmentos que Next.js 16.4 exporta con separadores Windows; el artefacto obtiene las mismas rutas planas que solicita el navegador.
- Workflow oficial de Pages con Node 22, instalación reproducible, comprobaciones y publicación exclusiva de `out/`.
- Documentación adaptada a datos por navegador y origen, backups y límites del hosting.

### Verificación — 12 de octubre de 2026

- TypeScript y compilación estática correctos; 15 páginas generadas y 449 enlaces/recursos comprobados.
- 107 pruebas unitarias y de integración aprobadas; cinco pruebas de navegador aprobadas tanto en local como directamente sobre GitHub Pages.
- Exportación, restablecimiento confirmado y restauración JSON comprobados de extremo a extremo; archivos corruptos e incompatibles rechazados sin cambiar los datos.
- Cero vulnerabilidades reportadas por `npm audit --omit=dev` en esa ejecución.
- Publicación de la revisión `2430506` confirmada mediante [Actions](https://github.com/erbxl/forextrd/actions/runs/38146360654), respuesta HTTP 200 y suite completa sobre la web pública. Entorno y resultados en [TESTING.md](TESTING.md).

### Límites

- Las respuestas del frontend y los datos locales son inspeccionables; no se ofrece certificación resistente a manipulación.
- GitHub no sincroniza IndexedDB; las copias JSON se transfieren manualmente.
- No hay secretos protegidos, APIs privadas, autenticación ni una caché offline completa.
- Esta migración no desarrolla las fases futuras ni convierte automáticamente archivos SQLite antiguos.
- La evidencia de pruebas y el estado de publicación se registran en [TESTING.md](TESTING.md).

## 0.1.0 — Base funcional original

Primera entrega con Next.js, React, TypeScript y persistencia de servidor mediante Prisma/SQLite; navegación responsive, temas, dashboard, mapa de 13 niveles y «Dinero y poder adquisitivo». Incluyó cinco preguntas, corrección explicada, progreso, perfil y objetivo semanal.

La versión 0.2.0 sustituye ese almacenamiento y su ejecución habitual. Las instrucciones antiguas de inicialización de base de datos ya no se aplican.

## Evolución

Las integraciones y mejoras posteriores se detallan en [ROADMAP.md](ROADMAP.md).
