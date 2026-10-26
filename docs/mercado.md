# Cotizaciones de mercado

Balance consulta la última cotización disponible de Yahoo Finance desde una función de servidor de TanStack Start. La actualización es manual. El cliente no necesita claves y no consulta al proveedor directamente.

## Precio actual y precio pagado

**Actualizar precios** modifica el precio actual de las acciones consultadas. Las cantidades y los precios pagados de las compras no cambian. El rebalanceo usa los precios actuales y se vuelve a calcular después de una actualización.

Cada cotización incluye el símbolo, el precio, la moneda, la fuente y la hora del dato. La hora del dato procede de `regularMarketTime`. La hora de descarga se mantiene separada. Si el mercado está cerrado, la cotización puede corresponder a una sesión anterior.

No se promete tiempo real ni una demora fija. La pantalla identifica los errores de cada símbolo y conserva los precios anteriores cuando una consulta falla.

## Proveedor

Se utiliza el endpoint público `https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1d&range=1d`. El adaptador extrae `regularMarketPrice` y `regularMarketTime`, valida la moneda USD y rechaza valores inválidos.

La investigación probó AAPL, MSFT, NVDA, GOOGL, AMZN y META el 25 de octubre de 2026. Un símbolo inexistente devolvió un error. También se observó HTTP 429 durante las pruebas.

Este endpoint no tiene documentación oficial de API, cuota publicada ni garantía de disponibilidad. La integración corresponde a una demo local personal. La [ayuda oficial de Yahoo](https://help.yahoo.com/kb/finance-for-web/SLN2310.html) indica que no se deben redistribuir sus datos. Esta implementación no acredita permiso para publicar un servicio que los distribuya.

## Alternativas evaluadas

- [Finnhub](https://finnhub.io/docs/api/quote) tiene una API documentada y requiere una clave propia. No se verificó acceso autenticado en esta sesión.
- [Alpha Vantage](https://www.alphavantage.co/documentation/#latestprice) requiere una clave propia para consultar toda la cartera. Su [oferta gratuita](https://www.alphavantage.co/support/) declara 25 consultas diarias. Los datos US en tiempo real o con demora de 15 minutos requieren un plan premium.
- Las consultas a Stooq no devolvieron un CSV utilizable durante la investigación.

Para cambiar de proveedor se reemplaza el adaptador de servidor. El dominio del portafolio y los precios históricos de compra mantienen su significado.
