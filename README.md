# Cine Paraíso

Aplicación web para la gestión y la venta de entradas de un cine: cartelera pública, compra de entradas con selección de butacas, panel de administración y validación de entradas por parte de los empleados.

Trabajo práctico 1 de Programación IV (UTN, 2026 C2).

- **Aplicación publicada:** https://cine-53d39.web.app
- **Código:** https://github.com/Nahu88/CINE-APP

## Tecnologías

- **Angular 22**: componentes standalone, señales, rutas con carga diferida y formularios reactivos.
- **Supabase**: base de datos PostgreSQL y autenticación, con Row Level Security activo en todas las tablas del negocio.
- **PWA**: service worker de `@angular/service-worker`, instalable desde el navegador.
- **Firebase Hosting**: publicación de la aplicación.

## Cómo ejecutar el proyecto

```bash
npm install     # instala las dependencias
npm start       # servidor de desarrollo en http://localhost:4200
npm test        # tests unitarios
npm run build   # compilación de producción
npm run deploy  # compila y publica en Firebase Hosting
```

Las credenciales públicas de Supabase están en `src/environments/`. Son claves publicables: no dan acceso a los datos por sí solas, porque el acceso lo controlan las políticas de Row Level Security de la base.

El service worker sólo se activa en la compilación de producción. Es intencional: si se activara en desarrollo, el navegador serviría versiones cacheadas y no se verían los cambios.

### Usuarios de prueba

| Rol | Email | Contraseña |
|---|---|---|
| Administrador | nahuel@cine.com | demo1234 |
| Cliente | axel@cine.com | demo1234 |

## Arquitectura

```
src/app/
  componentes/   componentes reutilizables (encabezado, card de película)
  pages/         páginas asociadas a una ruta (home, login, registro, admin, empleado)
  services/      un servicio por entidad (supabase, auth, peliculas)
  guards/        control de acceso a las rutas según el rol
  models/        interfaces TypeScript que reflejan las tablas
  pipes/         transformaciones de presentación (duración en horas y minutos)
  validators/    validadores propios de los formularios
```

La regla que ordena el proyecto: **las pantallas nunca consultan Supabase directamente, siempre pasan por un servicio**. Si cambia la forma de guardar los datos, se toca el servicio y ninguna pantalla se entera.

Cada página se carga con `loadComponent`, de modo que el panel de administración no se descarga para un cliente que nunca va a entrar.

### Modelo de datos

Las tablas del negocio son `perfiles`, `peliculas`, `salas` y `butacas`, `funciones`, `ordenes`, `entradas` y `orden_items`, `productos`, `categorias_productos`, `combos`, `cupones`, `recompensas`, `puntos_movimientos`, `creditos_movimientos`, `resenias`, `alertas_estreno` y `logs_actividad`.

Tres decisiones del modelo que conviene destacar:

- **Los géneros se guardan como un arreglo de texto dentro de `peliculas`**, en lugar de una tabla de géneros con su tabla puente. Se eligió la forma simple porque una película tiene pocos géneros y el filtro del catálogo los consulta siempre juntos. La contrapartida es que no hay un catálogo único de géneros que impida escribir el mismo nombre de dos maneras.
- **Los puntos y el crédito se registran como historial de movimientos**, no como un contador que se sobrescribe. El saldo queda cacheado en `perfiles`, pero cada suma y cada resta se guarda, que es lo que permite mostrarle al usuario el historial de sus canjes.
- **`entradas` tiene una restricción única sobre `(funcion_id, butaca_id)`**, de manera que es la base la que impide vender dos veces la misma butaca para una función, sin depender de la validación del cliente.

## Decisiones técnicas

**Un único cliente de Supabase.** `SupabaseService` lo crea una sola vez y el resto de los servicios lo reutilizan. Con más de un cliente, cada uno manejaría su propia sesión y las consultas protegidas por Row Level Security podrían viajar sin el usuario autenticado.

**La sesión vive en una señal.** `Auth` expone `perfil`, una señal con el perfil del usuario o `null`. El encabezado y el guard la leen, y la vista se actualiza sola cuando cambia, sin suscripciones que haya que liberar. Como la sesión queda guardada en el navegador, la aplicación vuelve a pedir el perfil al iniciar.

**El rol se lee de la base de datos.** `rolGuard(['administrador'])` es una función parametrizable: la misma sirve para cualquier combinación de roles y obtiene el rol de la tabla `perfiles`, no de `localStorage`, donde el usuario podría modificarlo. De todas formas, el guard es una comodidad de interfaz: lo que realmente protege los datos son las políticas de la base.

**Seguridad del perfil en dos niveles.** Row Level Security decide qué filas puede tocar cada usuario y los permisos por columna deciden qué columnas. Un usuario puede editar sus datos personales, pero no `rol`, `puntos`, `credito` ni `fecha_nacimiento`, porque esas columnas no están incluidas en el `GRANT UPDATE`. Sin esa segunda barrera, cualquiera podría convertirse en administrador desde la consola del navegador. `fecha_nacimiento` queda fuera a propósito: de ella dependen la restricción por edad de las películas y los cupones para mayores de 50 años.

**Validadores propios, y dos de ellos a nivel de grupo.** La coincidencia de contraseñas y la validez de la fecha de nacimiento se validan sobre el `FormGroup` y no sobre un control: ningún campo por separado sabe si las dos contraseñas coinciden, ni si el 31 de febrero existe.

**La fecha de nacimiento se carga en tres campos.** El cliente pidió expresamente no tener que buscar fechas navegando un calendario. Para una fecha de nacimiento, un selector de calendario obliga a retroceder año por año, así que se usan día, mes y año por separado.

**Las películas se dan de baja, no se borran.** El panel permite ocultar una película, que deja de verse en la cartelera sin perder sus datos. El borrado definitivo sigue disponible, pero la base lo rechaza si la película ya tiene funciones asociadas.

**Estilo visual propio, sin librerías de interfaz.** La paleta, los radios y las tipografías son variables CSS definidas en `src/styles.css`, de modo que el aspecto de toda la aplicación se cambia desde un único lugar.

**Formato regional.** Se registra el locale `es-AR` para que las fechas y los importes se muestren como se escriben en Argentina.

## Estado del proyecto

Implementado:

- Registro de usuarios, que crea la cuenta de autenticación y su perfil.
- Inicio y cierre de sesión, con la sesión persistida entre recargas.
- Control de acceso por rol sobre las rutas de administración y de empleados, con tests unitarios.
- Alta, edición, baja lógica y borrado de películas desde el panel de administración.
- Página principal alimentada desde la base: estreno destacado, cartelera con buscador y filtro por género, y próximos estrenos.
- Aplicación instalable como PWA y publicada en Firebase Hosting.

Pendiente: salas y generación de butacas; funciones con asignación automática de sala; productos del candy bar; compra con selección de butacas en tiempo real; entradas en PDF con código QR y su validación; programa de puntos, cupones y crédito; reseñas; y los reportes del panel de administración.

## Supuestos adoptados

El enunciado deja algunos puntos abiertos. Mientras no haya respuesta del cliente, se asumió lo siguiente:

- **Filas accesibles:** el cliente dice que se quitaron las filas J y K para dar lugar a una fila adaptada, pero después menciona "las filas J y K adaptadas". Se toma la segunda lectura: dos filas accesibles de 14 butacas cada una (2, 10 y 2 por columna), con lo que la sala mantiene las 20 filas del primer correo.
- **Butacas VIP:** el precio se guarda en una columna propia de cada función, separada del precio normal, para no atarse a que sea un monto fijo o un porcentaje.
- **Clasificaciones:** el enunciado sólo menciona 13 y 18 años, así que las películas clasificadas +16 se cargan como +13 o +18.
- **Medio de pago:** no está definido en el enunciado, por lo que el pago se simula.
- **Mapa general del cine:** queda fuera de alcance, ya que el cliente aclara que todavía no está aprobado.
- **Imágenes de las películas:** por ahora se cargan indicando la URL del póster; queda pendiente subirlas a Supabase Storage.
- **Datos personales:** se piden el tipo de sangre, el color de ojos y los días de vacaciones porque el cliente los solicita expresamente, aunque no se los use en ninguna funcionalidad. El tipo de sangre es un dato sensible según la Ley 25.326 de Protección de Datos Personales, de modo que corresponde consultar con el cliente para qué los necesita.
