# Herramientas de calidad

Oxlint y React Doctor están fijados como dependencias de desarrollo. `package-lock.json` registra sus dependencias transitivas. Usa `npm ci` para instalar las versiones del lockfile.

## Oxlint

Ejecuta el análisis estático del proyecto con:

```sh
npm run lint
```

El script usa las reglas predeterminadas de Oxlint. Este proyecto no necesita un archivo de configuración para ejecutarlo.

## React Doctor

Ejecuta el análisis de React desde la raíz del proyecto con:

```sh
npm run doctor:react
```

React Doctor revisa problemas de corrección, rendimiento, seguridad, accesibilidad y mantenibilidad.

## Documentación oficial

- [Oxlint](https://oxc.rs/docs/guide/usage/linter)
- [React Doctor](https://www.react.doctor/docs)
