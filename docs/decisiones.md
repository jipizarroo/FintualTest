# Decisiones del MVP

## Alcance

Balance calcula una propuesta de rebalanceo para un portafolio de acciones. El usuario ingresa cantidades, precios simulados y porcentajes objetivo. La aplicación indica qué comprar o vender sin ejecutar operaciones.

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
    { symbol: 'META', name: 'Meta', quantity: 10, currentPrice: 100 },
    { symbol: 'AAPL', name: 'Apple', quantity: 5, currentPrice: 200 },
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

- Todos los precios están en USD y son datos de simulación editables.
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
