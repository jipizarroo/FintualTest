# Verificación del MVP

Las comprobaciones se ejecutaron el 25 de octubre de 2026 en Node.js 24 y Chrome sin interfaz gráfica. Se probaron tanto el servidor de desarrollo como la vista previa del build.

## Dominio y compilación

`npm run test -- src/domain/portfolio.test.ts` pasó las seis pruebas del dominio. Se verificaron compras y ventas con acciones fraccionarias, compras de acciones nuevas, liquidación de una posición, valor cero, datos inválidos y límites numéricos.

`npm run typecheck` terminó sin errores. `npm run build` produjo los paquetes del cliente y del servidor.

## Recorrido en el navegador

- El ejemplo produjo cinco operaciones mediante una petición POST de TanStack Start.
- La propuesta incluyó vender toda la posición de GOOGL y comprar AMZN, que no tenía posición inicial.
- Editar y guardar una asignación eliminó la propuesta anterior.
- Una asignación total de 95 % produjo el mensaje de error esperado.
- Restablecer recuperó el ejemplo y permitió calcular otra vez.
- La vista móvil de 390 píxeles no desbordó el ancho de la página. Las tablas tienen desplazamiento horizontal dentro de su contenedor.
- Chrome no registró errores de JavaScript en estos recorridos.

Las herramientas de la vista integrada de T3 agotaron su tiempo de espera dos veces. La verificación se completó con Playwright y Chrome, sin agregar dependencias de navegador al proyecto.

## Persistencia

`npm run test -- src/features/portfolio/storage.test.ts` pasó las diez pruebas del almacenamiento. Se comprobaron guardado y lectura, borrado, datos ausentes, JSON malformado, formato incorrecto, números no finitos, versión desconocida y errores al leer, escribir o borrar.

El recorrido de navegador confirmó estos casos.

- Cantidad, precio y objetivo conservaron sus nuevos valores después de recargar.
- Un borrador con objetivos que sumaban 95 % se recuperó y el servidor rechazó su rebalanceo.
- Restablecer eliminó la clave guardada y otra recarga mantuvo el ejemplo.
- Una copia con JSON dañado mostró un aviso y permaneció sin cambios.
- Al bloquear `localStorage`, la aplicación mostró un aviso y permitió conservar cambios en memoria.
- Al bloquear el borrado, la pantalla informó el fallo y la copia anterior permaneció guardada.
- El build compilado recuperó un portafolio en móvil y permitió rebalancearlo después de recargar.
- Un portafolio vacío guardado siguió vacío después de recargar.
- No se registraron errores de hidratación ni de JavaScript durante estos recorridos.

El build y TypeScript se verificaron otra vez después de incorporar la persistencia.

Estas comprobaciones iniciales cubrieron el simulador. La siguiente iteración agregó compras, temas y consultas de mercado.

## Compras, temas y cotizaciones

Las 28 pruebas de `src/domain/portfolio.test.ts` y `src/features/portfolio/storage.test.ts` pasaron. Cubren el promedio ponderado, costos desconocidos, límites numéricos y migración del formato v1 a v2. Las 12 pruebas de `src/server/market.test.ts` también pasaron. No se ejecutó la suite completa.

TypeScript y el build del cliente y servidor terminaron sin errores después de integrar los cambios.

El navegador confirmó estos recorridos.

- Un portafolio v1 conservó su cantidad y precio actual. Cargarlo no reescribió la copia guardada ni inventó un costo de compra.
- Dos compras de AAPL, 2 acciones a USD 100 y 3 a USD 120, mostraron cantidad 5, costo promedio USD 112 y valor USD 750 con precio actual USD 150.
- Guardar convirtió el formato a v2. Recargar conservó ambas compras. Quitar una compra actualizó el almacenamiento.
- La consulta real de AAPL devolvió USD 347,725 con fecha de referencia del 23 de octubre de 2026. Las compras y su costo promedio permanecieron intactos. El rebalanceo utilizó la nueva valoración.
- Una consulta conjunta de AAPL y ZZZZZZ actualizó AAPL y conservó el precio previo de ZZZZZZ con un aviso de error.
- El tema respetó la preferencia del sistema. Una elección manual se conservó después de recargar.
- La tabla completa cabe en su contenedor de escritorio a 1440 píxeles. A 390 píxeles, el editor no desborda el ancho del documento.
- Los botones habilitados mostraron cursor de mano. Se inspeccionaron las vistas clara y oscura.

Yahoo Finance se consultó desde el servidor. El paquete del cliente no contiene la dirección del proveedor ni su User-Agent. Estas pruebas no acreditan disponibilidad continua del endpoint ni ejecución de órdenes. Los límites del proveedor están en [mercado.md](mercado.md).
