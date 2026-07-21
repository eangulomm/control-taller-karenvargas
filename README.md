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
3. Crear un archivo HTML llamado `Index` y copiar `appscript/Index.html`.
4. Ejecutar `setup()` una vez únicamente si la hoja todavía no tiene las pestañas del sistema.
5. Desplegar como aplicación web: ejecutar como propietario y acceso para cualquier usuario.
6. Abrir directamente la URL `/exec`; la interfaz y el servidor funcionan dentro del mismo Apps Script.

Las contraseñas están incorporadas como huellas SHA-256, no como texto plano. Las sesiones vencen después de 30 días.
