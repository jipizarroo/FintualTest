# QA de recuperación, ronda 2

## Alcance

Se probó `main` en `c1b5c0afebe7fef76535656099f7e0259c8c51c9` con la app en `http://localhost:3000`. Se usó Chrome 156 headless con Playwright. Las páginas navegaron con `networkidle` y cada escenario de almacenamiento usó un contexto aislado. Las capturas y este reporte están en el worktree `feat-portfolio-ux-quality`; no se modificó código.

Root completó los casos de interacción con el cálculo, continuidad de teclado y reintento de red. Este reporte incorpora sus observaciones y el método usado.

## Resultados

| Caso | Resultado y observación | Evidencia |
|---|---|---|
| POST demorado, doble clic y controles de edición | PASS. Root demoró el POST 1200 ms. Un doble clic real con `page.mouse.dblclick(delay: 40)` produjo una solicitud; Editar y Actualizar precios permanecieron deshabilitados durante la espera. | `01-delayed-post-pending.png` |
| `localStorage.getItem` bloqueado | PASS. La app siguió visible y avisó que no pudo recuperar el portafolio. | `02-storage-getitem-blocked.png` |
| `localStorage.setItem` bloqueado | PASS. Al guardar, la app avisó que los cambios podrían perderse al recargar. | `03-storage-setitem-blocked.png` |
| `localStorage.removeItem` bloqueado | PASS. La app avisó que no pudo borrar la copia y que podría volver al recargar. | `04-storage-removeitem-blocked.png` |
| JSON corrupto | PASS. La app mostró el aviso de recuperación y dejó intacto el valor corrupto de `balance.portfolio.v1`. | `05-storage-corrupt-json.png` |
| Agregar una compra | PASS. La cantidad pasó de dos a tres, el foco permaneció en el editor y el campo nuevo quedó visible. | `06-purchase-added-focus-scroll.png` |
| Quitar una compra y continuar con teclado | PASS. Tras quitarla, el foco inmediato quedó en `BODY`; la siguiente pulsación Tab enfocó `Agregar compra` de AAPL. | `07-purchase-removed-focus-scroll.png` |
| Reintentar precios tras fallo de red | PASS. El primer intento mostró `Failed to fetch`. Root quitó la ruta que provocaba el fallo y ejecutó un solo fetch real. Yahoo devolvió cotizaciones y la app mostró sus metadatos. | `04-network-error-desktop.png`, `08-refresh-network-error.png` |

## Hallazgo P3 ya registrado

La ronda anterior encontró que el aviso rojo muestra `Failed to fetch` en inglés. Se esperaba un mensaje claro en español con una indicación para reintentar. Es el hallazgo P3 ya reportado por root, no una incidencia nueva de esta ronda. La operación de reintento sí funcionó cuando la red respondió.

## Cobertura previa y exclusiones

No se repitieron las verificaciones previas que pasaron para persistencia al recargar, tema oscuro, valores negativos, cotizaciones parciales de Yahoo, flujo de teclado y viewports de 320 y 390 px. También se había verificado guardar o cancelar después de un error de red.

No se repitieron los hallazgos conocidos de más de 20 cotizaciones ni del resultado de rebalanceo fuera del viewport.

## Cierre

Los ocho casos pendientes terminaron PASS. No hay defectos adicionales ni casos pendientes. El hallazgo P3 de `Failed to fetch` está publicado como [issue #5](https://github.com/jipizarroo/FintualTest/issues/5). El detalle legible por máquina está en [results.json](results.json).
