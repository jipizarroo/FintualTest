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
