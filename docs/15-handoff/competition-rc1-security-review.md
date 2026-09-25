Status: derived
Owner: Engineering
Canonical: no
Last reviewed: 2026-09-24
Related: docs/12-security/authorization.md
Depends on: Competition MVP RC1 local DEMO

# RC1 · revisión acotada de seguridad

Revisión de código y pruebas del 24 de septiembre de 2026 (hora Guatemala). No es pentest, certificación ni garantía de ausencia de vulnerabilidades. No se añadieron dependencias ni rutas de escritura estratégica.

| Control | Resultado y evidencia |
|---|---|
| Secretos y variables | PASS en archivos a entregar: `.env.example` vacío/ejemplo; `.env`, `.local`, sesiones, contraseñas y test-results excluidos por Git. Credenciales aleatorias generadas en runtime; no proveedor real. process.env sólo en servidor/tooling. No se imprimen valores privados. |
| Sesión y autoridad | PASS: Engine.identity verifica hash, expiración, membership activo y rol humano; actor del commit se coteja. Tests INV-001/004/006 rechazan AI, visitante, actor suplantado y marca sin asignación. Expiración real probada en PostgreSQL; UI 401 simulado por Playwright vuelve al acceso sin error crudo. |
| Workspace/Brand | PASS: Engine.scope aplica ambos IDs y asignación; consultas de entidades usan scope y FKs compuestas. Tests rechazan referencias/lecturas/escrituras cruzadas. CapabilityEvent se consulta por usuario, fuera de Context Assembler. |
| Concurrencia e idempotencia | PASS: INV-009/010 verifican carreras, expectedActiveVersion, replay y colisión de key; rollback de auditoría es atómico. Browser cubre dos pestañas y doble submit. No se afirma idempotencia universal de todas las creaciones. |
| Inputs y HTTP | PASS: JSON limitado, validación de schemas, transiciones y procedencia; estados 400/401/403/404/409/503 mapeados. Test HTTP cubre 401, 403 CSRF, 404 rutas no admitidas y 409 stale. UI muestra mensajes propios, no el message arbitrario de la respuesta. |
| SQL y archivos públicos | PASS por revisión: Drizzle parametriza valores; SQL de readiness es constante. Assets en allowlist explícita; no servidor estático sobre raíz, `.local` ni `.env`. Prueba HTTP complementada con sondeo real del servidor RC. |
| HTML y navegador | PASS por revisión de interpolaciones: texto externo escapado con escape(), estados/clases desde enums internos; notices usan textContent. CSP self, frame-ancestors none, no-referrer y nosniff; cookie HttpOnly/SameSite Strict. Esc, Tab, foco y overflow cubiertos en navegador. |
| Readiness y fallos DB | PASS: /health sólo devuelve aplicación/protocolo/estado; tests 200/503 y DB hasta 0005 incompatible. Errores inesperados HTTP se reducen a UNAVAILABLE sin stack ni URL DB. Pool limita conexión/consulta y maneja desconexión idle. Una confirmación perdida requiere comprobar estado, nunca se reintenta escritura automáticamente. |
| Tooling de concurso | PASS: loopback; rechaza NODE_ENV production y DATABASE_URL no vacío. Renueva sesión sólo del mismo Workspace DEMO y ADMIN activo; test verifica que no eleva permisos revocados. No HTTP de provisioning, cleanup ni reset. Demo usa casos de uso reales. |
| Migraciones e historia | PASS: 0000–0007 sin cambios en RC; sin DROP/TRUNCATE accidental. Upgrade desde 0005 con historia existente y replay comparan DecisionVersion. 0006/0007 mantienen FKs, separación Learning/Signal y Capability por usuario. |
| Residuos | PASS: sin TODO/FIXME/TBD/debugger en runtime/tooling revisado; console.log limitado a salida CLI de operación y demos intencionales. Fixtures y rutas negativas de tests son deliberadas. No assets WIP ni resultados generados en el diff. |

No se identificó un hallazgo HIGH pendiente en esta revisión acotada. El endurecimiento elimina de UI respuestas técnicas arbitrarias, añade feedback y bloqueo de envío, y separa readiness de éxito estratégico.

## Riesgos residuales explícitos

- Acceso al archivo local de sesión concede autoridad DEMO. Windows mode 0600 no garantiza ACL: proteger el perfil del usuario y no compartir esos archivos. Renovación CLI es comodidad local, no recuperación de cuenta de producción.
- HTTP loopback sin TLS; cookie no usa Secure porque la demo local es HTTP. No exponer por túnel ni como servicio público; auth, TLS, rate limits, secretos operativos y despliegue de piloto requieren su propio trabajo aprobado.
- Idempotencia de Decision y aceptación de Learning probada. Crear Brand/Experiment/Signal ante una respuesta perdida exige inspeccionar estado antes de repetir; bloqueo del botón sólo evita envíos simultáneos dentro de la página.
- Readiness compara journal/hash con el checkout, no audita toda alteración manual de esquema. No editar migraciones publicadas ni normalizar sus bytes sobre una DB existente sin revisar compatibilidad.
- audit --prod informa sólo vulnerabilidades conocidas en dependencias productivas en el momento consultado; no sustituye esta revisión ni cubre toda la cadena de desarrollo.
- No hubo escaneo exhaustivo de todo el historial Git ni restore de backup, certificación WCAG, prueba de carga o auditoría externa. IA real y producción siguen fuera del RC.
