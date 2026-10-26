# Casos de borde de la versión publicada

Base probada: `c1b5c0afebe7fef76535656099f7e0259c8c51c9`, en `http://localhost:3000`. Chrome con Playwright y contexto aislado.

## ISSUE: actualizar una cartera con más de 20 acciones

Severidad media. El formulario permite guardar más de 20 acciones, pero el botón de actualización envía todos los símbolos en una sola consulta. El servidor rechaza la consulta completa y no actualiza ningún precio.

Pasos de reproducción:

1. Guardar un portafolio de 23 acciones mediante el editor, o cargar [el fixture](23-stocks.json) como JSON en la clave `balance.portfolio.v1` de `localStorage` y recargar.
2. Pulsar **Actualizar precios**.
3. Observar el aviso: "Se admiten hasta 20 símbolos por consulta."

Esperado: poder actualizar las acciones de una cartera que la aplicación permite guardar, mediante consultas por grupos, o recibir una restricción clara antes de registrar una cartera incompatible.

Actual: se rechaza toda la actualización antes de consultar al proveedor. Los precios anteriores permanecen intactos. El problema no depende de que los símbolos del fixture existan en Yahoo Finance, porque la validación falla por cantidad antes de hacer las solicitudes.

Viewport: 1440 × 900. Evidencia: [captura del error](23-stocks-refresh.png).

## PASS: encabezado móvil durante la actualización

En un viewport de 320 × 568, se demoró la petición POST durante 2,5 segundos para inspeccionar el estado "Actualizando...". El documento mantuvo un ancho de 320 píxeles, sin desborde del encabezado. Evidencia: [estado de carga](mobile-loading-320.png).
