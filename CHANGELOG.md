# Historial de cambios

## 0.1.0 — Fase 1 local

### Incorporado

- Base de aplicación en español con Next.js 16, React 19, TypeScript, Tailwind CSS, Prisma 6.19.3 y SQLite.
- Navegación lateral responsive y temas oscuro y claro.
- Dashboard con actividad y progreso obtenidos de registros persistidos, sin actividad ficticia inicial.
- Estructura del currículo de 13 niveles con publicación parcial explícita.
- Primera unidad completa: «Dinero y poder adquisitivo», con fuentes del Banco Central Europeo y ejemplos sintéticos identificados.
- Evaluación de cinco preguntas, corrección en servidor, explicaciones y registro de intentos.
- Regla de aprobación de al menos 80 % y ejercicio numérico correcto; completar la unidad exige además confirmar la lectura.
- Progreso persistido y repaso basado en errores registrados.
- Perfil local con nombre y objetivo semanal, y seguimiento de lectura activa en el navegador.
- Migraciones versionadas y semilla idempotente para inicializar el catálogo sin reiniciar progreso.
- Documentación de arquitectura, desarrollo, currículo, fases y comprobaciones.

### Alcance y limitaciones

- Uso individual en loopback, sin autenticación multiusuario ni publicación incluida.
- Una lección disponible; alcanzar un 100 % de lecciones publicadas no acredita haber completado el nivel ni la academia.
- Calculadoras, gráficos de mercado, simulador, replay, backtesting, diario, calendario y tutor IA quedan para fases posteriores.
- Sin brokers, ejecución real, noticias actuales ni proveedores de datos de mercado.
- La cobertura y los resultados de verificación se documentan en [TESTING.md](TESTING.md); no se presuponen comprobaciones aprobadas.

### Siguiente entrega

Fase 2: ampliar el material educativo completo, los formatos de ejercicios, las evaluaciones y el repaso personalizado, conforme a [ROADMAP.md](ROADMAP.md).
