Status: derived
Owner: Product / Engineering
Canonical: no
Last reviewed: 2026-10-11
Related: docs/15-handoff/PHASE4_SPEC.md, docs/15-handoff/PHASE4_ACCEPTANCE_MATRIX.md, docs/15-handoff/PHASE4_EXTERNAL_REQUIREMENTS.md, docs/14-decisions/ADR-0031.md, docs/14-decisions/ADR-0032.md, SESSION_STATE.md
Depends on: candidato local 0c356ca (ver SESSION_STATE para los resultados exactos)

# Fase 4 · DEMO integral para la aceptación del propietario

Esta guía prepara la **revisión local** de la Fase 4. Hay tres estados que se mantienen separados y no se deducen
unos de otros:

| Estado | Situación a la fecha de esta guía |
|---|---|
| Implementación local | Completa en el alcance local acordado, con simuladores para Google Ads, Meta Ads y Canva (ver la matriz, v23) |
| Aceptación de la DEMO por el propietario | **Pendiente**: requiere tu revisión de este recorrido |
| Verificación real y preparación para producción | **Pendiente**: requiere accesos y decisiones (abajo). El candidato es **not release-ready** |

Aceptar esta DEMO no equivale a cerrar la Fase 4 ni autoriza campañas reales, gasto, dominios ni despliegues.

## Iniciar y detener

Capturas de las pantallas nuevas para revisar (locales, no canónicas): `.local/acceptance/index.html`.

Requisitos: Node 24, pnpm 12.4.2, el repositorio en la rama del candidato y los puertos 3001, 3101, 3201 (en
127.0.0.2) y 55434 libres.

1. **Iniciar todo:** `pnpm demo:phase4`. Arranca, como procesos hijos y en este orden: la aplicación aislada
   (3001, con su PostgreSQL 55434 y las migraciones pendientes, sin borrar datos), el servidor del sitio público
   (3101), la vista previa autenticada (127.0.0.2:3201) y el worker supervisado con los simuladores. Cuando todo
   responde, imprime las direcciones.
2. **Entrar:** abre `http://127.0.0.1:3001` y pega el valor del campo `token` del archivo
   `.local/rc1-smoke/demo-session.json` (es privado: no lo compartas).
3. **Detener todo:** `Ctrl+C` en esa terminal. Detiene los cuatro procesos; los datos de la DEMO se conservan.
   El inicio con `pnpm demo:phase4` se comprobó en este cierre. La parada con `Ctrl+C` no pudo probarse desde la
   sesión del agente, que no tiene consola interactiva.
4. **Parada manual en Windows,** si algún proceso sigue vivo. En PowerShell, detiene sólo los procesos de esta DEMO:

   ```powershell
   Get-CimInstance Win32_Process -Filter "Name='node.exe'" | ? { $_.CommandLine -match 'phase4-demo.ts|competition-start.ts.*--isolated|sites-server.ts|external-worker.ts' } | % { Stop-Process -Id $_.ProcessId }
   ```

   El PostgreSQL aislado se detiene con su proceso; los datos se conservan.

Alternativa manual, cuatro terminales: `pnpm competition:start --isolated`; `pnpm sites:public --isolated`;
`pnpm sites:preview --isolated`; `pnpm external:worker --isolated`. Se detienen con `Ctrl+C` en cada una.

## Recorrido breve de aceptación (unos 20 minutos)

Cada paso simulado está etiquetado en la pantalla como «Simulador» o «simulado».

1. **Marca nueva** (botón «Nueva marca»): crea una marca ficticia.
2. **Productos y servicios:** crea y aprueba una oferta.
3. **Marketing › Plan de Marketing:** añade una acción con presupuesto (es «presupuesto planificado», no gasto).
4. **Marca y recursos:** incorpora una identidad (un color basta), envíala a revisión y apruébala.
5. **Productos y servicios › Materiales de venta:** crea un texto de la oferta y un brief de diseño. En el brief
   aprobado, el panel de Canva permite conectar Canva (simulado), enviar el brief, vincular un diseño existente y
   recuperarlo: aparece una versión nueva en borrador y la aprobada sigue igual.
6. **Colaboración:** invita a un cliente por enlace, comparte el material en revisión. Con otra identidad (otro
   navegador) el cliente comenta y aprueba esa versión; el equipo todavía tiene que aprobarla.
7. **Marketing › Sitio web:** crea el sitio, pide la propuesta, revisa, publica (servidor de desarrollo), prueba la
   vista previa por tamaño y descarga el ZIP.
8. **Marketing › Campañas digitales:**
   - Conecta la cuenta simulada de Google Ads, crea la campaña, pide la propuesta a Brando, completa y aprueba.
   - «Solicitar la creación en pausa»: revisa la pantalla de confirmación. Puedes elegir el escenario
     «Respuesta perdida después de crear» y luego «Comprobar en el proveedor».
   - «Solicitar la activación (segunda autorización)», «Leer estado en el proveedor» y «Solicitar la pausa».
   - Meta, captación: elige «captación de contactos», con el sitio publicado como destino. Verás que no se puede
     activar hasta «Registrar verificación simulada» de la medición.
   - Prueba «Simular acceso vencido» y «Pedir que se detenga» para ver cómo se explica lo detenido y lo pendiente.
9. **Clientes:** abre el sitio publicado con `?utm_campaign=<referencia de la campaña>` y envía el formulario. La
   oportunidad aparece con su origen.
10. **Resultados:** presupuesto, gasto real («Sin conectar»), lecturas del simulador, conversiones atribuidas por
    proveedor, oportunidades, ventas («Sin datos») y ROAS («Sin datos») aparecen por separado.
11. **Revisión del ciclo:**
    - Marca una sugerencia de Brando, escribe lo aprendido, decide («Volver a probar») y guarda.
    - «Llevar a Validación» abre una propuesta revisable; al confirmarla se crea un experimento planificado.
    - Requiere una hipótesis y una decisión vigentes en la marca.

## Limitaciones visibles

- Google Ads, Meta Ads y Canva son **simuladores**: ninguna cuenta real, ninguna campaña real, ningún gasto. Las
  cifras de una campaña «activa» son sintéticas y se muestran como «Simulado (no es dato real)».
- La verificación de medición para captación es **simulada**.
- El sitio se publica en el servidor de desarrollo, con direcciones `*.localhost` y sin HTTPS. El dominio propio se
  verifica por TXT con el mecanismo probado, pero sin DNS real.
- El formulario de desarrollo usa el aviso de privacidad provisional y sólo funciona en DEMO (en PILOT responde 404).
- Las invitaciones se entregan por enlace: el correo no está configurado.
- Brando funciona en modo determinista de DEMO (no hay IA real).
- Lo que no está en el alcance local o no está terminado, en la matriz (v23, «Estado final por criterio»).

## Decisiones necesarias del propietario y qué bloquea cada una

| Decisión | Bloquea |
|---|---|
| Aceptar o pedir cambios sobre esta DEMO | el cierre local de la Fase 4 |
| Registrar las integraciones de Google Ads, Meta y Canva (cuentas de prueba, revisión de distribución; secciones de cada proveedor en PHASE4_EXTERNAL_REQUIREMENTS) | implementar y verificar los adaptadores reales; ninguna campaña ni diseño real hasta entonces |
| Autorizar un entorno de ensayo con HTTPS para callbacks OAuth (EXT-REQ-09) | flujos OAuth reales de las tres integraciones |
| Dominio de publicación de sitios y alojamiento con certificados por dominio (EXT-REQ-07, EXT-REQ-14) | publicación real, HTTPS y DNS de dominios propios |
| Política y texto de consentimiento y privacidad definitivos (EXT-REQ-13) | medición real con etiquetas y el formulario fuera de DEMO |
| Proveedor de correo o mantener el enlace de un solo uso (EXT-REQ-08) | invitaciones y avisos por correo |
| Clave de IA introducida por el propietario (EXT-REQ-10) | Brando con IA real en las superficies nuevas |
| Aplicaciones de destino para verificar exportaciones (EXT-REQ-12) | cerrar EXP-001 |
| Activación y gasto reales: autorización concreta por operación cuando existan cuentas | cualquier gasto real |
| Adoptar o no ADR-0035 (Clientes y Resultados); Atomic y Chatwoot siguen sin adoptar | el núcleo comercial de la Fase 5 |

## Informe de riesgos

| Riesgo | Situación y mitigación |
|---|---|
| Compatibilidad real con Google, Meta y Canva | El simulador sólo prueba la lógica local. Los adaptadores reales **no están implementados**: hay que escribirlos contra la versión de API vigente, con sus pruebas, antes de cualquier verificación real |
| Envío tardío de un intento suspendido | Riesgo residual declarado en ADR-0031: nunca hay reenvío automático y la repetición exige evidencia; se mantiene |
| Proveedores sin registro de cambios o sin confirmación de credencial | Sin ellos, un paso incierto sólo se resuelve con evidencia de proceso terminado; depende de cada proveedor y se verificará al implementar |
| Medición de captación | Sólo simulada; la evidencia real del destino (EXT-REQ-05) está pendiente |
| Datos de la DEMO | Bases aisladas locales; las migraciones 0028–0032 no se aplicaron fuera de ellas |
| Producción | Congelada (CLAUDE.md); este candidato no se ha desplegado ni debe desplegarse sin una autorización explícita |
| Incidencia en observación | El 503 de `phase3.spec.ts:58`, sin causa confirmada |

## Siguiente paso para la verificación real

1. Tu aceptación (o cambios) sobre esta DEMO.
2. Registrar las integraciones y autorizar un entorno de ensayo con HTTPS.
3. Implementar los adaptadores reales de Google Ads, Meta y Canva detrás del contrato existente, con OAuth y
   cifrado de credenciales.
4. Verificar cada operación con cuentas de prueba, sin gasto: crear en pausa, consultar, conciliar, pausar.
5. Sólo después, y con autorización concreta por operación, activar.
