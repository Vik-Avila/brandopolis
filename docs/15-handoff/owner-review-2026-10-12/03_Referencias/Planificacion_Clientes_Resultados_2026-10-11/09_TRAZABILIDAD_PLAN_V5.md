# Trazabilidad obligatoria · plan versión 5
Fecha: 2026-10-11 · Paquete revisión 3

Esta matriz conecta las incorporaciones del plan §11–13 con la entrega por fases y sus pruebas. **Todos los estados de implementación y validación nuevos son pendientes.** Los documentos de este paquete están preparados; su integración al checkout local también está pendiente.

Los contratos indicados describen responsabilidades; Claude debe localizar o crear sus archivos canónicos conforme a source-of-truth, sin inventar aquí rutas de schemas que todavía no existen.

| Requisito / origen aprobado | Fase de entrega | Documento y contrato a actualizar | Criterios de aceptación | Estado real |
|---|---|---|---|---|
| Captura manual/web persistente, prioridad de F4 | F4 | 01 + PHASE4_SPEC; datos, reintentos y permisos | I10-CLI-01…10; I10-SEC-01…08 | Pendiente de implementar/probar |
| Flujo multicanal contacto → oportunidad → cierre → Validación, §11 | Contratos/prueba F4; operativo F5 | 08 §§1–2; PHASE4_SPEC, state-machines, authorization y Brando | I10-FLU-01…06 | Alcance aprobado; runtime pendiente |
| Asistente interno de Brando, §11.3 | Preparación F4; F5 | 08 §2; contratos IA, contexto por rol y propuesta sin envío | I10-BRA-01, 05…08 | Pendiente de desarrollar y probar con IA real |
| Agente externo, política y toma humana, §11.3–4 | Prueba acotada F4; habilitación F6 | 08 §2; ADR de autoridad, permisos/eventos/envíos, requisitos externos | I10-BRA-02…08; I10-CW-01…12 | Adopción/operación pendientes |
| Captura y depuración de origen, UTM y segmento conocido, §12.2 y §13.6 | F4 | 01/08 §3; entrada web/manual, schema de evidencia y referencias | I10-ATR-01…03, 07…08 | Implementación y pruebas pendientes |
| Referencias publicitarias por mensaje, §12.5 | Prueba F4; conector real F5/F6 | 03/08 §§3,10; adaptador y catálogo verificable | I10-ATR-04, 07; I10-CW-06…08 | Fuente técnica revisada; integración sin probar |
| Historia de interacciones y atribución por oportunidad/venta, §12.3 | F5 | 08 §3; modelos de interacción/identidad/atribución y auditoría | I10-ATR-05…07; I10-ROA-04 | Pendiente |
| Gasto real, ingresos elegibles, ROAS y cobertura, §12.4 | F5; ampliaciones F6 | 08 §4; Resultados, importaciones/conectores, versiones de medición | I10-ROA-01…06; I10-RES-01…06 | Pendiente; no hay ROAS real acreditado |
| Asesores/equipos y reparto de crédito, §13.2 | Contratos F4; F5 | 08 §5; autorización por equipo, asignaciones y snapshots al cierre | I10-EQU-01…02; I10-MET-04 | Pendiente |
| Segmentos y partidas de productos/servicios, §13.2 | Segmento conocido y contratos F4; completo F5 | 08 §5; catálogo/ofertas vigente, partidas y segmento principal | I10-ATR-03; I10-EQU-03…04 | Pendiente; no sustituye catálogo vigente sin revisión |
| Metas por seis dimensiones y tres periodos, §13.3 | Contratos F4; F5 | 08 §6; metas/versiones/calendario/base/moneda y permisos | I10-MET-01…04 | Pendiente; no diferir el básico a F6 |
| Históricos, comparativos y exportaciones, §13.4 | Contratos F4; F5 | 08 §7; cortes, versiones y detalle autorizado | I10-HIS-01…04 | Pendiente |
| Forecast de ganados y programación, §13.5 | Contratos F4; F5 | 08 §8; hitos, saldos, fuentes y cortes; distinción de facturado/cobrado | I10-FOR-01…06 | Pendiente; separado de oportunidades abiertas |
| Licencia, API, aislamiento, costes y canales | Evaluación/prueba F4; cada habilitación | 03 y requisitos externos; ADR previo a nuevas dependencias | I10-CW-01…12; I10-CHN-01…04; I10-BRA-08 | Solo evaluación documental realizada |
| Navegación y continuidad | F4 | 04/05/06, matriz, handoff, SESSION_STATE y CHANGELOG | I10-DOC-01; I10-UI-01…03; I10-CON-01…04 | Paquete preparado; checkout y capturas pendientes |

## Integración y evidencia

- La numeración I10-… complementa la matriz anterior del checkout; no la reemplaza.
- Cada contrato debe enlazar sus IDs aplicables y registrar qué parte se prepara en Fase 4 frente a qué recorrido se entrega después.
- Anotar SHA/árbol, prueba, entorno, fecha, resultado y artefacto. Una revisión documental no cuenta como PASS funcional.
- Si se usa una fixture, anotar SIMULADO. Distinguir Chatwoot real, canal real, IA real e invitado real.
- Mantener decisiones de modelo de atribución, calendario comercial, reparto de crédito, contratos de ingresos y autoridad del bot explícitas. No inventar valores por defecto comerciales salvo el calendario natural aprobado en el plan.
- Actualizar esta matriz con evidencia al aplicar; no marcar todo completado por fusionar los documentos.
