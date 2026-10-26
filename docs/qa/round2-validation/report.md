# QA ronda 2

- Resultado integrado: 10 PASS, 1 ISSUE de la app ya publicado como #6, sin pendientes.
- Base revisada: `main`, commit `c1b5c0afebe7fef76535656099f7e0259c8c51c9`, en `http://localhost:3000`.
- Método: Playwright con Chrome headless, un contexto aislado por caso, `networkidle` y fixtures v2 en `localStorage`. No se ejecutaron suites ni se iniciaron servidores.
- Ejecución: 9 casos terminaron PASS en Playwright. Dos casos no se clasifican como defectos a partir de sus aserciones: root verificó el guardado con objetivo incompleto y el bloqueo de precio subcentavo. El primero es PASS según el contrato de borrador. El segundo confirma el ISSUE #6.
- El primer intento tuvo un selector de encabezado ambiguo. Sus capturas se movieron a `/tmp` y esos resultados se descartaron. No cuentan como defectos de la app.
- Las capturas anteriores `initial.png`, `add-form.png` y `add-action-fields.png` se conservaron.

## Resultados

### PASS: ticker duplicado y guardado normalizado

` acme ` y `ACME` se rechazaron como duplicados sin guardar. Tras corregir el segundo ticker a ` xyz `, quedaron guardados `ACME` y `XYZ`.

Evidencia: [duplicado rechazado](duplicate-ticker-rejected.png), [tickers guardados](normalized-tickers-saved.png).

### PASS: precio actual vacío y cero

Vacío se bloqueó por requerido, 0 por el mínimo 0.01, y 10 se guardó.

Evidencia: [precio vacío](current-price-empty.png), [precio cero](current-price-zero.png).

### PASS: objetivo vacío y cero

Vacío se bloqueó. El objetivo 0 se guardó cuando el otro activo completó el 100%.

Evidencia: [objetivo vacío](target-empty.png), [objetivo cero guardado](target-zero-saved.png).

### PASS: cantidad de compra vacía y cero

Cantidad vacía se bloqueó. Cantidad 0 con precio pagado se rechazó. Cantidad 0 sin precio se guardó como cotización, sin posición.

Evidencia: [cantidad vacía](purchase-quantity-empty.png), [cero con precio rechazado](zero-quantity-with-price-rejected.png), [cero guardado como cotización](zero-quantity-saved-as-quote.png).

### PASS: precio pagado vacío y cero

El precio pagado vacío se guardó como costo pendiente (`null`). El valor 0 quedó bloqueado por el mínimo 0.01 y no cambió el almacenamiento.

Evidencia: [costo pendiente guardado](purchase-price-empty-saved.png), [precio pagado cero](purchase-price-zero.png).

### ISSUE #6: precio subcentavo aceptado al cargar y bloqueado al editar

Root confirmó que un registro válido con `currentPrice=0.005` y `purchasePrice=0.004` carga, pero Guardar cambios bloquea ambos campos por `min=0.01`, incluso sin editarlos. El defecto ya está publicado como #6.

Reproducción: cargar esos valores válidos desde el almacenamiento, abrir la edición y pulsar Guardar cambios. Evidencia: [bloqueo de precios subcentavo confirmado por root](subcent-price-blocked-confirmed.png).

### PASS: acción con objetivo y sin compras

`TARGET` se guardó como cotización con objetivo 100% y sin posición.

Evidencia: [acción solo con objetivo](target-only-action-saved.png).

### PASS: suma decimal exacta

33.3333%, 33.3333% y 33.3334% se guardaron y la interfaz indicó que la asignación estaba completa.

Evidencia: [objetivos que suman 100%](decimal-targets-total-100.png).

### PASS: suma 99.9999% al rebalancear

Root guardó un portafolio con objetivo AAPL de 24.9999%. Rebalancear mostró la alerta `No pudimos calcular la propuesta. Los objetivos deben sumar 100%.` Este rechazo ocurre al rebalancear, como define el borrador.

Evidencia: [alerta de rebalanceo confirmada por root](incomplete-target-rebalance-confirmed.png).

### PASS: nombre largo

El nombre de 248 caracteres se guardó completo. La tabla truncó la vista y conservó el texto completo en `title`.

Evidencia: [nombre largo](long-name-truncated.png).

### PASS: visibilidad del error en formulario largo

Con 12 filas, el duplicado se rechazó y el mensaje quedó visible en el viewport.

Evidencia: [error visible al final del formulario](long-form-error-viewport.png).
