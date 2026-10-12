# Respaldo real preparado en Windows — 12-10-2026

Esta actualización prevalece sobre el procedimiento inicial de exportación para el respaldo ya realizado. No volver a generar el bundle ni repetir la copia completa por leer la guía antigua.

## Identidad del respaldo

- PC original: repositorio C:\Proyectos\brandopolis.
- Respaldo privado: **C:\Proyectos\Brandopolis_respaldo_20261012_132719**.
- Rama: feat/phase4-marketing-web-collaboration.
- Commit: **6c4756b590fc4c2ce0f53f98452029b481bfbbd3**, documentación del candidato de código c660124.
- SHA-256 del bundle: **C709D4847E8BD28D74460EE4E3C9AAC4B59402923456520A475400CB123DAF40**.
- El bundle registra historial completo y 42 referencias. Se clonó en verificacion_git y coincidieron HEAD y árbol limpio.
- Se creó TRASPASO_CODIGO.json, compatible con 03_restaurar_codigo.mjs.

## Archivos que acompañan al bundle

| Carpeta del respaldo | Archivos copiados | Tamaño mostrado por Robocopy | Resultado comunicado |
| --- | ---: | ---: | --- |
| archivos/brandopolis | 1.237.670 | 30,130 g | 0 errores, 0 discrepancias, 0 archivos omitidos. |
| archivos/brandopolis-brando-b1 | 103.998 | 2,840 g | 0 errores, 0 discrepancias, 0 archivos omitidos. |
| archivos/brandopolis-brando-sections | 27.428 | 850,47 m | 0 errores, 0 discrepancias, 0 archivos omitidos. |
| postgres_embebido | 1.479 | 96,88 m | 0 errores, 0 discrepancias, 0 archivos omitidos. |

Total: 1.370.575 archivos; unos 34 GB. Los tamaños son las unidades mostradas por Robocopy, no una suma de hashes de todos los archivos. Se excluyeron node_modules y junctions con /XJ. La revisión de enlaces excluidos sigue pendiente hasta recibir el resultado del inventario.

Las tres carpetas de desarrollo se comprobaron limpias antes de exportar. También se copiaron sus archivos ignorados y configuración local. Las copias contienen carpetas .git; usar el bundle para crear el checkout operativo nuevo, conservando las copias originales como respaldo.

**Este respaldo privado puede contener claves, sesiones, documentos y datos de prueba. No subirlo al chat, publicarlo ni incorporarlo al repositorio.** El ZIP documental de esta conversación contiene contexto y referencias, sin los bytes del respaldo privado.

## Base de la DEMO

- Datos activos originales: C:\Proyectos\brandopolis\.local\rc1-smoke\postgres\data.
- Puerto original: 55434, host 127.0.0.1.
- PostgreSQL embebido: paquete windows-x64; sus binarios, bibliotecas y recursos se conservaron en postgres_embebido.
- La parada smart agotó su espera. La parada fast posterior terminó correctamente y pg_ctl informó que el servidor no estaba ejecutándose.
- Se copió el proyecto con la base detenida.
- Se duplicó únicamente la base respaldada para una prueba aislada: 1.663 archivos, 200,77 m, 0 errores y 0 discrepancias.
- Copia de prueba: C:\Proyectos\Brandopolis_prueba_bd_20261012_143501\data.
- Esa copia arrancó en 127.0.0.1:55499, pg_ctl comprobó el proceso y se detuvo correctamente después.

Esto acredita arranque y parada de la copia física con los binarios guardados en la PC original. **Todavía no acredita una revisión de los registros dentro de la aplicación ni el funcionamiento en el equipo nuevo.** No se inicia la aplicación al probar PostgreSQL y no se ejecuta ningún proveedor.

La copia de prueba está fuera del respaldo y no hace falta trasladarla. No borrar los originales hasta validar el nuevo equipo. Una restauración física exige compatibilidad del sistema y PostgreSQL; estos binarios son Windows x64. Para cambiar de sistema operativo, preparar una exportación lógica adecuada antes de abandonar la PC original.

## Qué llevar

1. Toda la carpeta Brandopolis_respaldo_20261012_132719, incluido bundle, manifiesto, archivos, PostgreSQL y registros.
2. La versión actualizada de Brandopolis_Traspaso_Integral_2026-10-12.zip. Guardarla dentro o junto al respaldo.
3. El resultado de ENLACES_EXCLUIDOS.json y cualquier archivo externo que su revisión determine necesario.

Copiar a otro equipo/dispositivo y comprobar integridad allí. Hasta disponer de una segunda copia, este respaldo está en el mismo disco que el original y no protege frente a una falla de ese disco.

## Restauración en la nueva PC — encargo a Claude

Lee la guía R12C y este documento antes de implementar. El propósito inicial es recuperar el mismo estado; no aplicar el rediseño mientras se comprueba la restauración.

1. Confirmar el sistema operativo, espacio, Git y versiones Node/pnpm del candidato. Verificar el hash del bundle contra el valor anterior.
2. Usar 03_restaurar_codigo.mjs con el manifiesto y una carpeta nueva. No sobrescribir otro repositorio. Comprobar HEAD 6c4756b y árbol limpio.
3. Restaurar los archivos locales desde archivos/brandopolis al checkout operativo, conservando su estructura. Excluir las carpetas .git, las dependencias y cualquier copia de prueba para no sustituir el historial creado por el bundle. Los otros worktrees se conservan como respaldo; recrear sus checkouts desde Git si se necesitan.
4. Instalar dependencias con el lockfile. Preservar la base y los recursos restaurados antes de invocar scripts. **Inspeccionar demo:phase4 y sus dependencias para comprobar si reinicializan, limpian o siembran datos. No ejecutarlos a ciegas sobre la copia recuperada.** Ajustar únicamente la puesta en marcha local que permita usar los datos existentes, respetando los scripts del repositorio y dejando el respaldo sin cambios.
5. Revisar rutas absolutas de configuración, almacenamientos y enlaces. En especial, comprobar BRANDOPOLIS_DOCUMENT_ROOT y otros directorios externos desde la configuración real, sin imprimir secretos. Un inventario de junctions no identifica por sí solo todos los almacenamientos externos. Reautenticar o configurar claves por un canal seguro cuando corresponda.
6. Recuperar primero la base en una copia operativa aislada con binarios compatibles y host 127.0.0.1. No migrar bases compartidas ni conectar proveedores reales. No tratar el token DEMO como autenticación pública.
7. Arrancar app/sitio/vista previa/worker solo después de revisar su comportamiento de inicialización. Comprobar las marcas, decisiones, ofertas, precios, archivos/logo, materiales, comentarios, aprobaciones, calendario y escenarios realmente guardados. Contrastar con el respaldo y la revisión del propietario, no con datos sembrados nuevos.
8. Confirmar apertura de los archivos referenciados, capturas de aceptación y plantillas. Regenerar la sesión de DEMO y token por el mecanismo del candidato sin resetear los datos.
9. Repetir las comprobaciones del proyecto necesarias para verificar el entorno nuevo. Documentar lo que no se haya probado y detener los servicios al terminar.
10. Una vez aceptada la restauración, iniciar el bloque de simplificación visual R12B/R12C. La Fase 4 sigue abierta y not release-ready. No push, despliegue, proveedores ni gasto.

El historial menciona una migración 0033 en 6951684. No se verificó aquí su journal en la base; comprobarlo en el candidato y en la copia recuperada. No apoyarse únicamente en el estado anterior que hablaba de 0032.

## Evidencia disponible y límites

Los resultados de Windows fueron ejecutados y compartidos por el propietario en esta conversación; se incluyen para continuidad. No se accedió remotamente a su PC. No se efectuó un hash comparativo de los 1,37 millones de archivos ni una consulta completa de las tablas de la aplicación. La comprobación de arranque y los resúmenes de copia no justifican declarar todo el contenido de la DEMO aceptado.
