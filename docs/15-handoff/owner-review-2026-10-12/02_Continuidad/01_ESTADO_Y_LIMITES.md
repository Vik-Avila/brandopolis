# Estado de continuidad — corte 12-10-2026

## Último candidato reportado por Claude

Código **c660124**, documentación **6c4756b**, rama **feat/phase4-marketing-web-collaboration**. Siete commits locales sobre 5a76d0f: 0776a8c, 6951684, c349d76, df13e86, 6969b29, c660124 y 6c4756b. Sin push ni despliegue. Servicios reportados detenidos.

Es información comunicada por el equipo, no verificación independiente del checkout actual. Antes de trabajar, comprobar posibles commits posteriores. La última migración reportada en la conversación fue 0032, aplicada solo a bases aisladas junto con 0028–0031; comprobar si el candidato posterior añadió alguna más.

## Entrega anterior reportada

- R12-01…24 implementados localmente: aprobaciones con revisor, política de autoaprobación/segunda persona, comentarios por versión, menciones, notificaciones e Inicio «Para ti».
- Cola de email con reintentos y errores; el proveedor DEMO guarda mensajes y no los entrega a nadie.
- Ofertas con varios planes de precio, copia desde otra oferta, Brando previo al formulario, fuentes preseleccionadas.
- Artes y referencias, versiones de plantillas, variantes por red, colaboración multirrecurso, resultados con periodos/comparaciones.
- Performance Max y campañas de mensajes WhatsApp/Messenger solo con simulador, según ADR-0036.
- Correcciones de interfaz, navegación y panel móvil. La revisión actual solicita una simplificación visual más profunda.

## Pruebas comunicadas, con su alcance

| Prueba | Resultado comunicado |
| --- | --- |
| Unitarias | 544 PASS, incluidas 18 nuevas. |
| Typecheck, lint, Foundation, UI | Sin errores / PASS. |
| PILOT | 10/10. |
| Navegador sobre 6969b29 | 330 ejecuciones: 316 PASS, 13 SKIP por tamaño y 1 FAIL. |
| Suites afectadas sobre c660124 | 50 PASS, 7 SKIP, 0 FAIL. |

El fallo fue atribuido al primer ajuste del panel móvil; c660124 lo corrige con CSS a 1000 px o menos. **La regresión completa no está reportada sobre c660124.** No unir resultados de commits diferentes como si fueran una sola ejecución.

Hay 17 capturas canónicas: 11 internas difieren tras cambios solicitados y requieren revisión; 6 públicas son idénticas. No se actualizaron referencias. Galería reportada: `.local/acceptance/review-2026-10-12/index.html`, no incluida aquí porque pertenece al repositorio/entorno local de Windows.

La incidencia de Clientes se cerró como defecto de producto: clic perdido durante carga inicial y respuesta tardía que sustituía la elección; corrección 5356f57 y prueba determinista. Se conserva el resultado histórico 300 ejecuciones, 286 PASS, 13 SKIP, 1 FAIL. El 503 de phase3.spec.ts:58 sigue en observación, no reapareció en el último reporte.

## Qué sigue abierto

**Aceptación:** el usuario continúa encontrando problemas de experiencia. La DEMO no está aceptada, Fase 4 no está cerrada y el candidato sigue not release-ready.

**Código real pendiente:** adaptadores Google Ads, Meta y Canva con OAuth; cierre de marca DEL-002/004/005; kit de Meta IDN-004; fuentes OTF/WOFF2 incrustadas; PDF y búsqueda del portal; cambio de espacio de trabajo; integración de correo real y demás pendientes que confirme la matriz vigente. Biblioteca/Plantillas tuvo avance posterior; no conservar automáticamente su estado antiguo de «sin código» ni declarar toda Biblioteca completa por la nueva pestaña.

**Evidencia o acceso real pendiente:** HTTPS, dominio, DNS, medición, invitado real, accesos a proveedores y resultados reales. Cola, autorización, conciliación y pantallas con simuladores no equivalen a adaptadores funcionando.

**Decisiones:** aceptación visual/funcional, entorno HTTPS, registro de integraciones/cuentas de prueba, dominio/alojamiento, privacidad/consentimiento, correo y remitente/destinatario de prueba, IA real y aplicaciones de destino de exportaciones. Cualquier gasto real necesita autorización específica por operación.

ADR-0035 sigue propuesto. Atomic y Chatwoot no están adoptados.

## Investigación de Media Planning Canvas

Se inició sesión y se probó un caso ficticio. Se recorrieron proyecto, mercado, público, objetivos/canales, táctica, resumen, guardado y reapertura. Activación y Seguimiento bloquearon el acceso por nivel Business; PDF no se obtuvo como archivo verificable. La investigación adjunta detalla pruebas y límites.

El caso «Evaluación metodológica Brandopolis — caso ficticio» quedó guardado ocupando el único plan Free. Al terminar aquella sesión se observaron 0/3 análisis y 2/10 mejoras. La nueva captura del usuario muestra otros contadores: no inferir uso adicional ni estado actual de la cuenta desde el reporte anterior.

No se incluyen credenciales ni sesiones. Volver a autenticar por el mecanismo seguro si hace falta continuar. No contratar Business ni gastar créditos por iniciativa propia. El uso de otro mecanismo de navegador no elimina la restricción comercial.

## Procedencia y estado de este paquete

Los documentos nuevos son planificación e instrucciones. Se inspeccionó la captura nueva y se usaron las revisiones anteriores. No se ejecutó Brandopolis, no se modificó su código ni se corrieron sus pruebas durante la preparación del ZIP.

Los scripts de traslado crean un archivo Git a partir del repositorio real cuando el propietario los ejecute. El paquete no es por sí solo un respaldo ejecutable del proyecto.
