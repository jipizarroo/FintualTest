# QA de escritorio

**Resultado general: PASS.** No encontré fallos reproducibles en el alcance probado.

- Base probada: `c1b5c0afebe7fef76535656099f7e0259c8c51c9`.
- URL: `http://localhost:3000/`.
- Navegador: Chrome con Playwright, usando contextos aislados y espera `networkidle`.
- Viewports: 1440 × 900 y 1280 × 800.
- No ejecuté suites de pruebas.

## PASS

### Compras múltiples, decimales y persistencia

- Pasos: en un contexto limpio, abrí "Editar portafolio", agregué a AAPL una compra de 0,25 acciones a USD 240, guardé y recargué la página.
- Esperado: sumar la cantidad y calcular el costo promedio ponderado; conservar las compras tras recargar.
- Actual: AAPL mostró 1,65 acciones y costo promedio USD 216,97. Después de recargar, ambos valores se conservaron. `balance.portfolio.v1` mantuvo el envelope `version: 2`; los precios de compra desconocidos siguieron como `null` y la UI mostró "Pendiente".
- Fixture: AAPL inició con 0,8 acciones a USD 200 y 0,6 a USD 230. MSFT, NVDA y GOOGL tenían costo de compra incompleto.
- Severidad: N/A, sin fallo.
- Capturas: [editor con compra nueva](multi-purchase-edited.png), [resultado guardado](multi-purchase-saved.png).

### Cantidad cero y costo incompleto

- Pasos: agregué a AAPL una compra con cantidad 0 y precio pagado vacío, guardé y recargué.
- Esperado: no alterar cantidad ni costo promedio; el dato de costo desconocido debe seguir distinguiéndose de USD 0.
- Actual: la compra de cantidad 0 no se guardó. AAPL conservó 1,4 acciones y costo promedio USD 212,86. Las compras incompletas existentes siguieron en `null` y se mostraron como "Pendiente".
- Severidad: N/A, sin fallo.
- Captura: [resultado con cantidad cero](zero-incomplete-lot-saved.png).

### Validación de cantidad negativa

- Pasos: abrí el editor, cambié la primera compra de AAPL a -0,1 y pulsé "Guardar cambios".
- Esperado: rechazar la cantidad negativa y no guardar el cambio.
- Actual: Chrome indicó "Value must be greater than or equal to 0". El editor siguió abierto y la cantidad no se guardó.
- Severidad: N/A, sin fallo.
- Captura: [validación de cantidad negativa](negative-quantity-validation.png).

### Actualización de precios y error parcial

- Pasos: actualicé precios en el portafolio inicial. En un contexto separado, agregué el ticker de prueba `ZZQX`, con precio actual USD 10, objetivo 0%, una acción y sin cotización disponible, guardé y actualicé precios.
- Esperado: actualizar las cotizaciones disponibles, informar cuál falló y conservar el último precio conocido del ticker sin cotización.
- Actual: la primera actualización informó 5 precios y mostró fuente y hora junto a cada cotización. Con el fixture parcial, actualizó 5 cotizaciones, mostró "ZZQX: Yahoo Finance no devolvió una cotización" y conservó USD 10 para `ZZQX`.
- Fixture: `ZZQX`, sin cotización en Yahoo Finance.
- Severidad: N/A, sin fallo.
- Capturas: [actualización exitosa](price-refresh-result.png), [fixture parcial](partial-quote-fixture.png), [resultado parcial](partial-quote-result.png).

### Rebalanceo

- Pasos: con las cotizaciones actualizadas, pulsé "Rebalancear" y "Calcular propuesta".
- Esperado: mostrar operaciones sugeridas según asignaciones, sin ejecutar transacciones.
- Actual: la propuesta mostró 5 operaciones de compra y venta y señaló que no se ejecutaron operaciones.
- Severidad: N/A, sin fallo.
- Captura: [propuesta de rebalanceo](rebalance-proposal.png).

### Teclado y nombres accesibles

- Pasos: enfoqué "Editar portafolio" y usé Enter; enfoqué "Agregar compra" y usé Enter; enfoqué "Quitar compra 3 de AAPL" y usé Espacio.
- Esperado: poder abrir el editor, agregar y quitar una compra con teclado; controles con nombres que permitan identificarlos.
- Actual: las tres acciones funcionaron. Los campos y botones expusieron nombres accesibles, por ejemplo "Cantidad de la compra 1 de AAPL" y "Quitar compra 3 de AAPL".
- Severidad: N/A, sin fallo.
- Captura: [flujo de teclado en el editor](keyboard-editor.png).

### Viewports y tema

- Pasos: revisé la página a 1440 × 900 y 1280 × 800; abrí el editor a 1280 × 800. En un contexto separado, activé el tema oscuro y recargué.
- Esperado: mostrar el portafolio y el editor sin desbordamiento horizontal; conservar el tema después de recargar.
- Actual: `document.documentElement.scrollWidth` fue 1280 px en el viewport de 1280 px. El tema oscuro continuó activo tras recargar y quedó guardado en `balance.theme`.
- Severidad: N/A, sin fallo.
- Capturas: [portafolio 1440 × 900](desktop-1440x900.png), [portafolio 1280 × 800](laptop-1280x800.png), [editor 1280 × 800](laptop-editor-1280x800.png), [tema oscuro después de recargar](dark-theme-persisted.png).

## ISSUES

Ninguno reproducible en el alcance asignado.

## BLOCKED

Ninguno. La app quedó accesible en `localhost:3000` durante la prueba.
