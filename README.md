# Control de Taller Karen Vargas

Reconstrucción completa inspirada en la arquitectura de `1deved/sysposcff`: inicio de sesión local inmediato y Google Apps Script usado únicamente como API JSONP para los datos.

## Accesos

- Karen: `karen` / `vargas26` — administración completa.
- Taller: `taller` / `taller26` — consulta y registro de vestidos.

## Despliegue

1. Copiar `appscript/Code.gs` en una hoja de cálculo nueva.
2. Ejecutar `setup()` una vez.
3. Implementar como aplicación web, ejecutando como propietario y con acceso para cualquier usuario.
4. Copiar la URL `/exec` en `config.js` y cambiar `DEMO_MODE` a `false`.
5. Publicar `main` con GitHub Pages.
