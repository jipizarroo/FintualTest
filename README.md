# Balance

Simulador de rebalanceo de portafolios para la postulación a Fintual. Permite registrar compras a distintos precios, consultar cotizaciones, definir la distribución objetivo y obtener una propuesta de compra y venta.

## Ejecutar la aplicación

Requiere Node.js 22.12 o posterior y npm.

```sh
npm install
npm run dev
```

Abre la URL que muestra Vite en la terminal.

## Probar el rebalanceo

1. Carga el ejemplo de la pantalla.
2. Edita una acción y agrega sus compras con cantidad y precio pagado.
3. Ajusta el precio actual o usa **Actualizar precios** para consultar Yahoo Finance.
4. Mantén la suma de los objetivos en 100 %.
5. Calcula la propuesta y revisa las compras y ventas.

La aplicación comienza con datos de ejemplo. El precio actual determina el valor de la posición. El precio pagado determina el costo de compra. Las operaciones son propuestas, sin conexión a un intermediario ni envío de órdenes.

La cantidad total y el costo promedio se calculan a partir de las compras. Las posiciones guardadas con la versión anterior conservan su cantidad y aparecen con costo pendiente hasta que completes el precio pagado.

## Revisar tus posiciones

La tabla permite ordenar las acciones por el valor de la posición, de mayor a menor o de menor a mayor. Si hay más de diez acciones, muestra diez por página. El valor total del portafolio siempre incluye todas las posiciones.

La ganancia o pérdida estimada compara el valor actual con el costo de las compras registradas. Es un resultado no realizado, antes de comisiones e impuestos. Si falta el costo de alguna compra, aparece como pendiente. Una acción sin posición no tiene un resultado de venta.

## Elegir el tema

Usa el control de tema del encabezado para cambiar entre claro y oscuro. La elección se conserva en el navegador. Si no has elegido uno, se usa la preferencia del sistema.

## Conservar tu portafolio

Pulsa **Guardar cambios** después de editar. La aplicación conserva posiciones, precios y objetivos en este navegador y los recupera al recargar. **Restablecer portafolio** elimina la copia guardada y vuelve al ejemplo.

Los cambios de un formulario que no has confirmado no se guardan. Las propuestas de operaciones se calculan de nuevo. Si el navegador bloquea el almacenamiento, la pantalla lo informa y permite seguir usando el simulador.

La copia pertenece al navegador y a la dirección del sitio. No se comparte entre dispositivos ni entre `localhost` y `127.0.0.1`.

## Estructura

- `src/domain` contiene las clases `Stock` y `Portfolio`, el cálculo y sus pruebas.
- `src/server` contiene la función de servidor de TanStack Start.
- `src/features/portfolio` contiene el formulario y la presentación en React.
- `src/components/ui` contiene los componentes shadcn.
- `src/routes` conecta la pantalla con TanStack Router.

El dominio no importa React ni TanStack. La interfaz envía datos al servidor y presenta la propuesta que devuelve.

## Verificación

```sh
npm run test -- src/domain/portfolio.test.ts src/features/portfolio/storage.test.ts src/server/market.test.ts
npm run typecheck
npm run build
```

El comando selecciona las pruebas del dominio, del almacenamiento y del adaptador de cotizaciones. Las pruebas del proveedor simulan respuestas HTTP y no necesitan acceso a Yahoo Finance.

Para revisar el build localmente, ejecuta `npm run build` y después `npm start`. Vite muestra la dirección de la vista previa compilada.

## Calidad del código

`npm run lint` ejecuta Oxlint y `npm run doctor:react` analiza el código React. Ambas herramientas están instaladas con versiones fijas. Consulta [los comandos y su alcance](docs/tooling.md).

## Decisiones y uso de IA

Lee [las decisiones y los supuestos del cálculo](docs/decisiones.md), [el proveedor de cotizaciones y sus límites](docs/mercado.md), [los resultados de verificación](docs/verificacion.md) y [el registro de uso de IA](docs/uso-de-ia.md). La consigna solicita compartir las conversaciones utilizadas durante el desarrollo.
