# QA móvil

**Resultado:** ISSUES  
**SHA probado:** `c1b5c0afebe7fef76535656099f7e0259c8c51c9`  
**URL:** `http://localhost:3000`  
**Navegador:** Chrome headless con Playwright, contexto aislado por tamaño y espera `networkidle`  
**Viewports:** 390×844 y 320×568

## ISSUES

### MOBILE-01. "Rebalancear" genera una propuesta fuera del viewport

**Severidad:** P3, baja. La propuesta se calcula y aparece al desplazarse manualmente.

**Pasos para reproducir:**

1. Abrir la app en 320×568 con la cartera del fixture de navegación descrito abajo y dejar la página arriba, en `scrollY = 0`.
2. Tocar **Rebalancear**.

**Esperado:** la pantalla muestra la propuesta generada o da una confirmación visual que indique dónde verla.

**Actual:** la app calcula las dos operaciones y actualiza la sección "Tu próximo movimiento", pero mantiene `scrollY = 0`. La sección empieza en `y = 1732`, fuera de los 568 px visibles. En el viewport quedan el encabezado y el botón "Rebalancear", sin cambio visual que confirme el resultado. Desplazarse hacia abajo permite verlo.

**Evidencia:** [captura del viewport después del toque](320-rebalancear-top.png) y [captura de la página completa con la propuesta](320-after-rebalancear.png). También se reprodujo en 390×844: [390-after-rebalancear.png](390-after-rebalancear.png).

## PASS

- Revisé las vistas iniciales en 390×844 y 320×568, en tema claro y oscuro. El tema oscuro se guardó en `balance.theme` y siguió activo después de recargar. Evidencia: [390-initial.png](390-initial.png), [320-initial.png](320-initial.png), [390-dark.png](390-dark.png), [320-dark.png](320-dark.png).
- La página no tiene desbordamiento horizontal: su ancho desplazable coincide con el viewport en ambos tamaños. La tabla queda en un contenedor propio `overflow-x: auto` con 800 px de contenido. No reporté la tabla desplazable como defecto.
- Abrí el editor en ambos tamaños. A 320 px, el documento conserva 320 px de ancho; los campos miden 40 px de alto y reciben foco con toque. Los controles de guardar, cancelar, agregar y quitar respondieron a toques. Los botones y controles de quitar miden 36×36 px. Evidencia: [390-edit-open.png](390-edit-open.png), [320-edit-open.png](320-edit-open.png).
- Cancelé un cambio al nombre de Apple y confirmé que se descartó, tanto en pantalla como en almacenamiento.
- Quité la segunda compra de AAPL, agregué otra y guardé dos compras. La tabla mostró el costo promedio ponderado de `$205,67`.
- Quité MSFT, agregué TSLA y guardé la cartera. Tras recargar, persistieron las posiciones, las compras y los objetivos en el envelope de versión 2. Evidencia: [390-saved-portfolio.png](390-saved-portfolio.png).
- Guardé una cartera con objetivo total de 60 %. La vista mostró "Los objetivos deben sumar el 100%" y la indicación para ajustar los objetivos antes de rebalancear. Evidencia: [390-invalid-allocation.png](390-invalid-allocation.png).
- Restablecí la cartera. La app volvió a las posiciones iniciales y limpió `balance.portfolio.v1`. Evidencia: [390-after-reset.png](390-after-reset.png).
- Revisé nombres accesibles de los botones usados y etiquetas de los campos. No hice una auditoría completa de contraste ni pruebas con lector de pantalla.

## Fixtures

Para editar, agregar y quitar se inició con este valor bajo `balance.portfolio.v1`:

```json
{
  "version": 2,
  "input": {
    "positions": [
      {
        "symbol": "AAPL",
        "name": "Apple",
        "currentPrice": 227,
        "lots": [
          { "quantity": 0.8, "purchasePrice": 200 },
          { "quantity": 0.6, "purchasePrice": 230 }
        ]
      },
      {
        "symbol": "MSFT",
        "name": "Microsoft",
        "currentPrice": 418,
        "lots": [
          { "quantity": 0.7, "purchasePrice": null }
        ]
      }
    ],
    "allocations": [
      { "symbol": "AAPL", "targetPercent": 60 },
      { "symbol": "MSFT", "targetPercent": 40 }
    ],
    "quotes": []
  }
}
```

Para reproducir MOBILE-01 se usó la cartera guardada después de las ediciones: AAPL a 227 USD con compras de 1 acción a 201 USD y 0.5 a 215 USD; TSLA a 250 USD con 0.4 acciones a 240 USD; objetivos de 60 % y 40 %; `quotes: []`.

## BLOCKED

Ninguno.
