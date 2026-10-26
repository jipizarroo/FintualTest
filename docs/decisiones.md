# Decisiones del MVP

## Alcance

Balance calcula una propuesta de rebalanceo para un portafolio de acciones. El usuario registra compras, define precios actuales y asigna porcentajes objetivo. La aplicación indica qué comprar o vender sin ejecutar operaciones.

La consigna pide una clase `Portfolio`, una colección de acciones, una colección de asignaciones objetivo y un método de rebalanceo. Las posiciones actuales y las asignaciones se modelan por separado para mantener esa distinción.

## Cálculo

Para cada acción, el valor actual es su cantidad multiplicada por su precio. El valor total del portafolio es la suma de esos valores.

```text
valorActual = cantidad × precio
valorObjetivo = valorTotal × porcentajeObjetivo / 100
diferencia = valorObjetivo − valorActual
accionesAOperar = diferencia / precio
```

Una diferencia positiva significa comprar. Una diferencia negativa significa vender. El cálculo no modifica las posiciones originales.

El cálculo recorre la unión de los símbolos de las posiciones y las asignaciones. Una acción sin asignación tiene objetivo cero. Una acción objetivo sin posición tiene cantidad cero y necesita un precio conocido.

Por ejemplo, un portafolio tiene 10 acciones de META a USD 100 y 5 de AAPL a USD 200. Su valor es USD 2.000. Para llegar a 40 % META y 60 % AAPL, debe vender 2 META por USD 200 y comprar 1 AAPL por USD 200.

El mismo ejemplo se expresa directamente con la clase del dominio.

```ts
import { Portfolio } from '../src/domain/portfolio'

const portfolio = new Portfolio({
  positions: [
    {
      symbol: 'META', name: 'Meta', currentPrice: 100,
      lots: [{ quantity: 10, purchasePrice: 90 }],
    },
    {
      symbol: 'AAPL', name: 'Apple', currentPrice: 200,
      lots: [{ quantity: 5, purchasePrice: 180 }],
    },
  ],
  allocations: [
    { symbol: 'META', targetPercent: 40 },
    { symbol: 'AAPL', targetPercent: 60 },
  ],
  quotes: [],
})

portfolio.positions[0].currentPrice()
portfolio.rebalance()
```

## Supuestos

- Todos los precios están en USD. Los precios actuales se pueden editar o consultar al proveedor de cotizaciones.
- Se permiten acciones fraccionarias.
- Los porcentajes objetivo suman 100 %.
- No hay comisiones, impuestos, efectivo adicional ni restricciones de liquidez.
- Los precios permanecen constantes durante el cálculo.
- La propuesta no se envía a un intermediario financiero.

Estos supuestos permiten distribuir todo el valor entre las acciones objetivo. Las compras se financian con las ventas en el modelo matemático.

## Precisión

El MVP usa números de JavaScript y conserva decimales durante el cálculo. La presentación redondea los montos y cantidades. Por eso los importes visibles pueden tener diferencias pequeñas de redondeo. Una versión que ejecutara operaciones necesitaría reglas explícitas de precisión, lotes, comisiones y conciliación de efectivo.

## Separación del código

El dominio contiene `Stock` y `Portfolio`, sin dependencias de React ni de TanStack. La función de servidor valida la entrada y llama al dominio. La interfaz administra el formulario y presenta la respuesta.

Se comparó esta estructura con una única instantánea normalizada por símbolo. Se eligieron colecciones separadas porque reflejan la consigna y permiten probar posiciones y objetivos de forma independiente. Se mantuvo un DTO JSON para comunicar el cliente y el servidor.

No se agregó base de datos ni autenticación. El objetivo inicial es poder editar un portafolio y verificar el rebalanceo en una sola pantalla.

## Persistencia en el navegador

La segunda iteración conserva el portafolio confirmado en `localStorage`. Guarda posiciones, precios y objetivos. Cada navegador y dirección del sitio tienen su propia copia. No hay sincronización entre dispositivos.

El primer render usa el ejemplo para coincidir con el HTML del servidor. Después de la hidratación, la interfaz recupera los datos guardados. Guardar cambios escribe la nueva cartera. Restablecer elimina la copia guardada y vuelve al ejemplo.

Se eligieron escrituras explícitas porque hay dos acciones que modifican el portafolio. Un efecto de autoguardado habría agregado coordinación para evitar que el estado inicial sobrescribiera los datos guardados.

El formato tiene una versión para detectar datos incompatibles. Si falla la lectura o la escritura, la pantalla informa el problema. Los cambios pueden seguir usándose en memoria. La aplicación no sobrescribe datos inválidos al cargar.

Se conservan los objetivos que todavía no suman 100 % como un borrador editable. El servidor exige una distribución válida antes de calcular el rebalanceo. Las propuestas de operaciones no se guardan y deben calcularse otra vez.

## Compras a distintos precios

Cada posición contiene una lista de compras con cantidad y precio pagado. La cantidad total se deriva de esa lista para evitar dos valores que puedan divergir.

```text
cantidadTotal = suma de las cantidades de las compras
costoPromedio = suma de cantidad × precioPagado / cantidadTotal
```

Comprar 2 acciones a USD 100 y 3 a USD 120 produce 5 acciones con costo promedio de USD 112. Si el precio actual es USD 150, el valor de esa posición es USD 750. El rebalanceo utiliza USD 750, sin depender del costo histórico.

Los datos de la primera versión no contienen precios de compra. Al recuperarlos, cada posición se convierte en una compra con su cantidad original y costo desconocido. Ese costo se representa con `null`, nunca con el precio actual. El usuario puede completarlo después.

El costo promedio no se muestra como conocido mientras alguna compra con cantidad positiva carezca de precio pagado. La aplicación guarda el nuevo formato con versión 2 y conserva la clave anterior para recuperar las posiciones ya guardadas. La migración ocurre en memoria y se escribe al confirmar cambios.

## Tema e interacción

La interfaz ofrece tema claro y oscuro. La elección se conserva en el navegador. Si todavía no hay una elección, se usa la preferencia del sistema.

Los botones y enlaces tienen cursor de acción, respuesta visual al pasar el puntero y foco visible con teclado. Los campos de texto conservan el cursor de edición y los controles deshabilitados se distinguen de los disponibles.

## Actualización de cotizaciones

La consulta de mercado devuelve éxitos y errores por símbolo. Los éxitos reemplazan únicamente el precio actual. Las compras y sus costos se conservan. Los errores mantienen el precio anterior y se muestran al usuario.

La hora de la cotización pertenece al proveedor. La hora de la consulta no la reemplaza. La aplicación guarda los precios actualizados, pero no conserva los metadatos de la consulta entre recargas. Después de recargar, identifica los valores como precios guardados hasta una nueva consulta.

Las consultas están aisladas en el adaptador de servidor. [mercado.md](mercado.md) explica la fuente, la disponibilidad y los límites de uso del proveedor.

## Lectura de posiciones y resultado estimado

El valor total es la única tarjeta de resumen. La tabla, la distribución objetivo y la propuesta se presentan como secciones para reducir contenedores repetidos.

El orden se aplica a todas las filas antes de dividirlas en páginas de diez. El criterio es el valor de la posición, cantidad por precio actual. La página visible no modifica las posiciones, los objetivos ni el total usado para rebalancear.

Se comparó una tabla con estado local frente a TanStack Table. Para un criterio de orden y páginas de tamaño fijo, el estado local evita una dependencia y la configuración de columnas. El cálculo financiero permanece en el dominio y la presentación de la tabla se separa del formulario.

La ganancia o pérdida no realizada usa el costo de todas las compras con cantidad positiva. Una compra sin costo conocido mantiene el resultado pendiente. No se usa el precio actual como sustituto del costo histórico.

```text
costoTotal = suma de cantidad × precioPagado
resultado = valorActual − costoTotal
resultadoPorcentual = resultado / costoTotal × 100
```

El cálculo supone vender toda la posición al precio actual registrado. No incluye comisiones, impuestos ni diferencias entre el precio mostrado y un precio de ejecución. Las acciones objetivo sin posición no muestran rentabilidad.
