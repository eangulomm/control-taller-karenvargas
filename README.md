# Control de Taller · Karen Vargas

Aplicación móvil y web para controlar trabajos de corte y confección, abonos, saldos y cierres semanales.

## Roles

- **Karen (administradora):** acceso completo, registra abonos, consulta auditoría y cierra semanas.
- **Taller (operadora):** registra los trabajos y consulta producción, abonos y saldos.

Una semana cerrada no admite nuevos trabajos ni abonos. Los registros son de solo adición: no existen acciones para editar o eliminar movimientos.

## Prueba local

El proyecto inicia en modo demostración. Usuarios: `karen` y `taller`; contraseña temporal de ambos: `demo`.

## Conexión con Google Sheets

1. Crear una hoja de cálculo nueva.
2. Abrir **Extensiones → Apps Script** y reemplazar `Code.gs` con `appscript/Code.gs`.
3. Ejecutar `setup()` una vez y autorizar.
4. Ejecutar `setup()` una vez únicamente para crear las pestañas si la hoja está vacía. Las credenciales ya están incorporadas como huellas SHA-256 dentro de `Code.gs`.
5. Desplegar como aplicación web: ejecutar como propietario y acceso para cualquier usuario.
6. Copiar la URL `/exec` en `config.js` y cambiar `DEMO_MODE` a `false`.

La autenticación guarda únicamente una huella SHA-256 en las propiedades privadas del Apps Script. La contraseña no se almacena en texto plano. Las sesiones vencen después de 30 días.
