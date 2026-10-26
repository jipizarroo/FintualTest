# Pruebas de la versión publicada

Los informes de `desktop/` y `mobile/` corresponden al commit `c1b5c0afebe7fef76535656099f7e0259c8c51c9` de `main`. Los agentes probaron esa versión en `http://localhost:3000`, con contextos de navegador aislados.

Las mejoras de interfaz y herramientas se desarrollan en `feat/portfolio-ux-quality` y se verifican por separado en `http://localhost:3001`. Las capturas de estos informes muestran la base, antes de esas mejoras.

Cada defecto publicado en GitHub incluye pasos de reproducción y un enlace a su evidencia. Un cambio de diseño solicitado, como reducir las tarjetas o agregar paginación, no se clasifica como defecto de la versión anterior.

## Resultados

- Escritorio: [informe](desktop/qa-report.md), sin defectos reproducibles en el recorrido del agente.
- Móvil: [informe](mobile/informe.md), propuesta de rebalanceo fuera de la vista sin confirmación visible. Registrado en [issue #2](https://github.com/jipizarroo/FintualTest/issues/2).
- Casos de borde adicionales: [informe](edge-cases/qa-report.md), actualización de precios rechazada para una cartera de 23 acciones. Registrado en [issue #1](https://github.com/jipizarroo/FintualTest/issues/1).
- Segunda ronda, recuperación: mensaje técnico de error de red sin explicación en español. Registrado en [issue #5](https://github.com/jipizarroo/FintualTest/issues/5).
