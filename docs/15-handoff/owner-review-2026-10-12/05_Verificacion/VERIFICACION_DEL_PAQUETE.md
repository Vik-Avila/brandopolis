# Verificación del paquete

## Comprobaciones posteriores en Windows

El propietario reportó bundle con historial completo y restauración al mismo HEAD 6c4756b; cuatro copias con cero errores/discrepancias; arranque y parada de una copia aislada de la base mediante los binarios respaldados. Detalle en `04_Migracion/04_RESPALDO_REAL_Y_RESTAURACION.md`. La revisión de enlaces, transporte a otro dispositivo y DEMO con datos en el nuevo equipo siguen pendientes.

## Realizada aquí

- Captura nueva inspeccionada; referencia utilizada en la guía visual.
- Documentos revisados para conservar R12B, el estado no release-ready y las exploraciones de Fases 5/6.
- Originales de plantillas, capturas y documentos de referencia copiados sin modificar su contenido.
- Utilidades Node comprobadas sintácticamente y ejecutadas con un repositorio temporal ficticio en Linux: exportación, restauración de rama, HEAD, contenido y etiqueta.
- Casos de rechazo comprobados: destino existente, árbol con cambios, salida dentro del repositorio y bundle alterado.
- Inventario y SHA-256 de cada archivo; integridad del ZIP y verificación de sus entradas.

El resultado detallado de las utilidades figura en PRUEBA_TRASPASO.json. No se probó Windows ni se tuvo acceso al repositorio de Brandopolis. Esto no sustituye sus pruebas de producto.

## No realizada aquí

Implementación de R12B/R12C, pruebas de la DEMO actual desde este entorno, inspección del código de los commits locales, pruebas con proveedores reales, despliegue y actualización de capturas canónicas. No se verificó todavía el traslado al equipo nuevo ni se revisaron los datos recuperados en la aplicación. Las comprobaciones locales de respaldo comunicadas por el propietario están recogidas arriba con sus límites.

## Comprobar después de extraer

Desde la carpeta raíz Brandopolis_Traspaso_2026-10-12:

```powershell
node .\05_Verificacion\verificar_paquete.mjs
```

El resultado debe indicar que todos los archivos del manifiesto coinciden. El manifiesto describe este ZIP documental; el paquete Git, cuando se exporte en la PC original, lleva su propia huella en TRASPASO_CODIGO.json.
