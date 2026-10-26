# Balance

Simulador de rebalanceo de portafolios para la postulación a Fintual. Permite editar posiciones y precios, definir la distribución objetivo y obtener una propuesta de compra y venta.

## Ejecutar la aplicación

Requiere Node.js 22.12 o posterior y npm.

```sh
npm install
npm run dev
```

Abre la URL que muestra Vite en la terminal.

## Probar el rebalanceo

1. Carga el ejemplo de la pantalla.
2. Cambia cantidades, precios o porcentajes objetivo.
3. Mantén la suma de los objetivos en 100 %.
4. Calcula la propuesta y revisa las compras y ventas.

Los precios son simulados y editables. Las operaciones son propuestas, sin conexión a un intermediario ni envío de órdenes.

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
npm run test -- src/domain/portfolio.test.ts src/features/portfolio/storage.test.ts
npm run typecheck
npm run build
```

El comando de pruebas selecciona únicamente los archivos del dominio y del almacenamiento del portafolio.

Para revisar el build localmente, ejecuta `npm run build` y después `npm start`. Vite muestra la dirección de la vista previa compilada.

## Decisiones y uso de IA

Lee [las decisiones y los supuestos del cálculo](docs/decisiones.md), [los resultados de verificación](docs/verificacion.md) y [el registro de uso de IA](docs/uso-de-ia.md). La consigna solicita compartir las conversaciones utilizadas durante el desarrollo.
