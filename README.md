# Cine Paraíso

Aplicación web para la gestión y la venta de entradas de un cine: cartelera pública, compra de entradas con selección de butacas, panel de administración y validación de entradas por parte de los empleados.

Trabajo práctico 1 de Programación IV (UTN, 2026 C2).

- **Aplicación publicada:** https://cine-53d39.web.app
- **Código:** https://github.com/Nahu88/CINE-APP

## Tecnologías

- **Angular 22**: componentes standalone, señales, rutas con carga diferida y formularios reactivos.
- **Supabase**: base de datos PostgreSQL, autenticación y almacenamiento de imágenes, con Row Level Security activo en todas las tablas del negocio.
- **PWA**: service worker de `@angular/service-worker`, instalable desde el navegador.
- **Firebase Hosting**: publicación de la aplicación.

## Cómo ejecutar el proyecto

```bash
npm install     # instala las dependencias
npm start       # servidor de desarrollo en http://localhost:4200
npm test        # tests unitarios (Vitest)
npm run build   # compilación de producción
npm run deploy  # compila y publica en Firebase Hosting
```

Las credenciales públicas de Supabase están en `src/environments/`. Son claves publicables: no dan acceso a los datos por sí solas, porque el acceso lo controlan las políticas de Row Level Security de la base.

El service worker sólo se activa en la compilación de producción. Es intencional: si se activara en desarrollo, el navegador serviría versiones cacheadas y no se verían los cambios.

## Arquitectura

```
src/app/
  componentes/   componentes reutilizables (encabezado, card de película)
  pages/         páginas asociadas a una ruta (home, login, registro, admin, empleado)
  services/      un servicio por entidad (supabase, auth)
  guards/        control de acceso a las rutas según el rol
  models/        interfaces TypeScript que reflejan las tablas
  pipes/         transformaciones de presentación (duración en horas y minutos)
  validators/    validadores propios de los formularios
```

Cada página se carga con `loadComponent`, de modo que el panel de administración no se descarga para un cliente que nunca va a entrar.

### Modelo de datos

Las tablas principales son `perfiles`, `peliculas`, `generos` y `peliculas_generos`, `salas` y `butacas`, `funciones`, `ordenes`, `entradas` y `orden_items`, `productos`, `categorias_productos`, `combos`, `cupones`, `recompensas`, `puntos_movimientos`, `creditos_movimientos`, `resenias`, `alertas_estreno` y `logs_actividad`.

Dos decisiones del modelo que conviene destacar:

- **Los puntos y el crédito se guardan como historial de movimientos**, no como un contador que se sobrescribe. El saldo se cachea en `perfiles`, pero cada suma y cada resta queda registrada, que es lo que permite mostrarle al usuario el historial de sus canjes.
- **`entradas` tiene una restricción única sobre `(funcion_id, butaca_id)`**, de manera que la base impide vender dos veces la misma butaca para una función, sin depender de la validación del cliente.

## Decisiones técnicas

**Un único cliente de Supabase.** `SupabaseService` crea el cliente y el resto de los servicios lo reutilizan. Con más de un cliente, cada uno manejaría su propia sesión y las consultas protegidas por RLS podrían viajar sin el usuario autenticado.

**La sesión vive en una señal.** `Auth` expone `perfil`, una señal con el perfil del usuario o `null`. El encabezado y los guards leen esa señal en lugar de consultar la base en cada navegación, y la vista se actualiza sola cuando cambia. Como la sesión queda guardada en el navegador, la aplicación consulta el perfil una vez al iniciar. Esa consulta se comparte: si el arranque y un guard la piden a la vez, la segunda espera a la primera en lugar de disparar otra.

**El rol se lee de la base de datos.** `rolGuard(['administrador'])` es una función parametrizable que sirve para cualquier combinación de roles y obtiene el rol de la tabla `perfiles`, no de `localStorage`, donde el usuario podría modificarlo. De todas formas, el guard es una comodidad de interfaz: lo que realmente protege los datos son las políticas de la base.

**Seguridad del perfil en dos niveles.** RLS decide qué filas puede tocar cada usuario y los permisos por columna deciden qué columnas. Un usuario puede editar sus datos personales, pero no `rol`, `puntos`, `credito` ni `fecha_nacimiento`, porque esas columnas no están incluidas en el `GRANT UPDATE`. Sin esa segunda barrera, cualquiera podría convertirse en administrador o regalarse crédito desde la consola del navegador. `fecha_nacimiento` queda fuera a propósito: de ella dependen la restricción por edad de las películas y los cupones para mayores de 50 años.

**Validadores propios, y algunos a nivel de grupo.** La coincidencia de contraseñas y la validez de la fecha de nacimiento se validan sobre el `FormGroup` y no sobre un control: ningún campo por separado sabe si las dos contraseñas coinciden, ni si el 31 de febrero existe.

**La fecha de nacimiento se carga en tres campos.** El cliente pidió expresamente no tener que buscar fechas navegando un calendario. Para una fecha de nacimiento, un selector de calendario obliga a retroceder año por año, así que se usan día, mes y año por separado.

**Estilo visual propio, sin librerías de interfaz.** La paleta, los radios y las tipografías son variables CSS definidas en `src/styles.css`, de modo que el aspecto de toda la aplicación se cambia desde un único lugar.

**Formato regional.** Se registra el locale `es-AR` para que las fechas y los importes se muestren como se escriben en Argentina.

## Estado del proyecto

Implementado:

- Registro de usuarios, que crea la cuenta de autenticación y su perfil.
- Inicio y cierre de sesión, con la sesión persistida entre recargas.
- Control de acceso por rol sobre las rutas de administración y de empleados, con tests.
- Página principal con estreno destacado, las más vistas, cartelera con buscador y filtro por género, y próximos estrenos.
- Aplicación instalable como PWA y publicada en Firebase Hosting.

En desarrollo: la página principal se muestra con películas de ejemplo hasta que esté terminada la carga de películas desde el panel de administración.

Pendiente: gestión de películas, salas, funciones y productos; compra con selección de butacas en tiempo real; entradas en PDF con código QR y su validación; programa de puntos, cupones y crédito; reseñas; y los reportes del panel de administración.

## Supuestos adoptados

El enunciado deja algunos puntos abiertos. Mientras no haya respuesta del cliente, se asumió lo siguiente:

- **Filas accesibles:** se interpreta que las filas J y K quedaron adaptadas, con 2, 10 y 2 butacas por columna, es decir 14 butacas por fila.
- **Butacas VIP:** el precio se guarda en una columna propia de cada función, separada del precio normal, para no atarse a que sea un monto fijo o un porcentaje.
- **Clasificaciones:** el enunciado sólo menciona 13 y 18 años, así que las películas clasificadas +16 en la cartelera real se cargan como +13 o +18.
- **Medio de pago:** no está definido en el enunciado, por lo que el pago se simula.
- **Mapa general del cine:** queda fuera de alcance, ya que el cliente aclara que todavía no está aprobado.
- **Datos personales:** se piden el tipo de sangre, el color de ojos y los días de vacaciones porque el cliente los solicita expresamente, aunque no se los use en ninguna funcionalidad. El tipo de sangre es un dato sensible según la Ley 25.326 de Protección de Datos Personales, de modo que corresponde consultar con el cliente para qué los necesita.
