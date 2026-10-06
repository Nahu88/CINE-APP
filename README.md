# Cine Paraíso

Aplicación web para la gestión y la venta de entradas de un cine: cartelera pública, compra de entradas con selección de butacas, entrada con código QR en PDF, panel de administración y validación de entradas por parte de los empleados.

Trabajo práctico 1 de Programación IV (UTN, 2026 C2).

- **Aplicación publicada:** https://cine-53d39.web.app
- **Código:** https://github.com/Nahu88/CINE-APP

## Tecnologías

- **Angular 22**: componentes standalone, señales, rutas con carga diferida, formularios reactivos, pipes y directivas propias.
- **Supabase**: base de datos PostgreSQL y autenticación, con Row Level Security activo en todas las tablas del negocio.
- **PWA**: service worker de `@angular/service-worker`, instalable desde el navegador.
- **Firebase Hosting**: publicación de la aplicación.
- **`qrcode` y `jspdf`**: las dos únicas librerías externas, para dibujar el código QR y armar el PDF de la entrada.

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

El administrador también puede entrar a la pantalla de validación de entradas. Los usuarios nuevos se registran siempre como cliente; el rol de empleado o administrador se asigna desde la base de datos.

## Recorrido principal

1. El administrador carga las películas, crea las salas y programa las funciones.
2. El cliente se registra, busca una película en la cartelera y elige una función.
3. En el mapa de la sala selecciona sus butacas y confirma la compra (el pago es simulado).
4. En "Mis entradas" ve cada entrada con su código QR y puede descargarla en PDF.
5. En el ingreso a la sala, el empleado busca la entrada por su código y la marca como usada.

## Arquitectura

```
src/app/
  componentes/   componentes reutilizables (encabezado, card de película, mapa de butacas)
  pages/         páginas asociadas a una ruta:
                   home, login, registro, pelicula-detalle, compra, mis-entradas,
                   admin (peliculas, salas, funciones) y empleado (validar)
  services/      un servicio por entidad:
                   supabase, auth, peliculas, salas, funciones, compras, entradas, qr-pdf
  directivas/    directiva de atributo que da estilo a cada butaca según su tipo
  guards/        control de acceso a las rutas según el rol
  models/        interfaces TypeScript que reflejan las tablas
  pipes/         transformaciones de presentación (duración en horas y minutos)
  validators/    validadores propios de los formularios
```

La regla que ordena el proyecto: **las pantallas nunca consultan Supabase directamente, siempre pasan por un servicio**. Si cambia la forma de guardar los datos, se toca el servicio y ninguna pantalla se entera.

Cada página se carga con `loadComponent`, de modo que el código del panel de administración y la librería del PDF no forman parte de la carga inicial de la aplicación.

### Modelo de datos

Las tablas que usa esta entrega son `perfiles`, `peliculas`, `salas`, `butacas`, `funciones`, `ordenes` y `entradas`.

El esquema inicial también incluye las tablas de los módulos que quedaron fuera de alcance (`productos`, `categorias_productos`, `combos`, `cupones`, `recompensas`, `puntos_movimientos`, `creditos_movimientos`, `resenias`, `alertas_estreno`, `logs_actividad` y `orden_items`). Están creadas, pero la aplicación todavía no las utiliza.

Tres decisiones del modelo que conviene destacar:

- **Los géneros se guardan como un arreglo de texto dentro de `peliculas`**, en lugar de una tabla de géneros con su tabla puente. Se eligió la forma simple porque una película tiene pocos géneros y el filtro del catálogo los consulta siempre juntos. La contrapartida es que no hay un catálogo único de géneros que impida escribir el mismo nombre de dos maneras.
- **Cada función guarda su horario de fin**, calculado al crearla como inicio más la duración de la película más 30 minutos de margen. Así, para saber si una sala está libre alcanza con comparar dos fechas ya guardadas.
- **`entradas` tiene una restricción única sobre `(funcion_id, butaca_id)`**, de manera que es la base la que impide vender dos veces la misma butaca para una función, sin depender de la validación del cliente.

## Decisiones técnicas

### Usuarios y seguridad

**Un único cliente de Supabase.** `SupabaseService` lo crea una sola vez y el resto de los servicios lo reutilizan. Con más de un cliente, cada uno manejaría su propia sesión y las consultas protegidas por Row Level Security podrían viajar sin el usuario autenticado.

**La sesión vive en una señal.** `Auth` expone `perfil`, una señal con el perfil del usuario o `null`. El encabezado y el guard la leen, y la vista se actualiza sola cuando cambia, sin suscripciones que haya que liberar. Como la sesión queda guardada en el navegador, la aplicación vuelve a pedir el perfil al iniciar.

**El rol se lee de la base de datos.** `rolGuard(['administrador'])` es una función parametrizable: la misma sirve para cualquier combinación de roles y obtiene el rol de la tabla `perfiles`, no de `localStorage`, donde el usuario podría modificarlo. De todas formas, el guard es una comodidad de interfaz: lo que realmente protege los datos son las políticas de la base.

**Seguridad del perfil en dos niveles.** Row Level Security decide qué filas puede tocar cada usuario y los permisos por columna deciden qué columnas. Un usuario puede editar sus datos personales, pero no `rol` ni `fecha_nacimiento`, porque esas columnas no están incluidas en el `GRANT UPDATE`. Sin esa segunda barrera, cualquiera podría convertirse en administrador desde la consola del navegador. `fecha_nacimiento` queda fuera a propósito: de ella depende la restricción por edad de las películas.

**Las políticas de escritura se agregan módulo por módulo.** Cada tabla permite escribir sólo al rol que corresponde: el administrador sobre películas, salas y funciones; cada cliente sobre sus propias órdenes y entradas; y el empleado o el administrador para marcar una entrada como usada.

### Formularios

**Validadores propios, y dos de ellos a nivel de grupo.** La coincidencia de contraseñas y la validez de la fecha de nacimiento se validan sobre el `FormGroup` y no sobre un control: ningún campo por separado sabe si las dos contraseñas coinciden, ni si el 31 de febrero existe.

**La fecha de nacimiento se carga en tres campos.** El cliente pidió expresamente no tener que buscar fechas navegando un calendario. Para una fecha de nacimiento, un selector de calendario obliga a retroceder año por año, así que se usan día, mes y año por separado.

### Películas, salas y funciones

**Las películas se dan de baja, no se borran.** El panel permite ocultar una película, que deja de verse en la cartelera sin perder sus datos. El borrado definitivo sigue disponible, pero la base lo rechaza si la película ya tiene funciones asociadas.

**Las butacas se generan solas al crear la sala.** Toda sala tiene 532 butacas: 20 filas de la A a la T, con las filas J y K accesibles de 14 butacas, las filas R, S y T VIP de 28 y el resto normales de 28. El administrador sólo escribe el nombre de la sala.

**La sala de cada función se asigna automáticamente.** El administrador elige película, fecha y hora. El servicio recorre las salas y toma la primera que no tenga ninguna función superpuesta con el horario nuevo, contando los 30 minutos de margen. Dos horarios se superponen cuando cada uno empieza antes de que el otro termine. Si no hay ninguna sala libre, la función no se crea y se avisa.

**Sin consultas combinadas.** Las tablas guardan identificadores, y los nombres de película y de sala se resuelven en el cliente buscando en las listas ya cargadas. Se prefirió esta forma por ser más simple de leer y de mantener que pedirle la combinación a la base.

### Compra de entradas

**El mapa de butacas es un componente separado de la página de compra.** El mapa recibe las butacas, las vendidas y las elegidas, y sólo avisa cuál se tocó. La página de compra es la que mantiene la selección, calcula el total y confirma. El color de cada butaca según su tipo lo pone una directiva de atributo propia.

**La base es la que impide la venta doble.** Si dos personas confirman la misma butaca al mismo tiempo, la restricción única de `entradas` rechaza a la segunda. En ese caso el servicio borra la orden que había creado, para no dejar una orden sin entradas, y la pantalla le avisa al usuario y actualiza el mapa.

**La restricción por edad se controla al comprar.** Si la película es para mayores de 13 o de 18 años, se calcula la edad del usuario a partir de su fecha de nacimiento y la compra se rechaza si no la alcanza.

### Entrada con QR y validación

**El QR sólo contiene un código.** Cada entrada se guarda con un código único generado al azar. El QR lleva ese código y nada más: no incluye datos del cliente, y los datos de la entrada se buscan en la base en el momento de validarla.

**El QR y el PDF se generan en el navegador.** No hace falta un servidor. Las dos librerías que se usan están encerradas en un único servicio (`qr-pdf`), de modo que ninguna pantalla depende de ellas directamente.

**La validación tiene dos pasos y funciona sin cámara.** El empleado escribe o pega el código, la pantalla le muestra la película, la función, la sala y la butaca, y recién entonces confirma el ingreso. Al confirmarlo, la entrada queda como usada, con la fecha y el empleado que la validó, y no se puede volver a usar. El campo también acepta el código cargado por un lector de QR, que funciona como un teclado.

## Estado del proyecto

Implementado:

- Registro de usuarios, que crea la cuenta de autenticación y su perfil.
- Inicio y cierre de sesión, con la sesión persistida entre recargas.
- Control de acceso por rol sobre las rutas, con tests unitarios.
- Página principal alimentada desde la base: estreno destacado, cartelera con buscador y filtro por género, y próximos estrenos.
- Alta, edición, baja lógica y borrado de películas.
- Alta y baja de salas, con generación automática de sus butacas.
- Alta y baja de funciones, con asignación automática de sala.
- Detalle de película con sus funciones.
- Compra de entradas con mapa de butacas, total calculado, control de edad y pago simulado.
- "Mis entradas", con el código QR de cada entrada y su descarga en PDF.
- Validación de entradas por parte del empleado, con ingreso manual del código.
- Aplicación instalable como PWA y publicada en Firebase Hosting.

Fuera del alcance de esta entrega:

- Candy bar: productos, categorías y combos.
- Cupones y descuentos.
- Programa de puntos y recompensas.
- Cancelación de compras y crédito a favor.
- Reseñas y calificaciones.
- Preventa y alertas de próximos estrenos.
- Historial de películas del usuario.
- Reportes, estadísticas y registro de actividad del panel de administración.

Se priorizó completar de punta a punta el recorrido central del cine (cartelera, funciones, compra con butacas, entrada y validación) antes que abrir módulos nuevos.

### Limitaciones conocidas

- **La compra requiere iniciar sesión.** La compra como visitante, sin registrarse, queda pendiente.
- **El mapa de butacas no se actualiza en tiempo real.** Las butacas vendidas se consultan al entrar a la compra y después de cada confirmación. Si otra persona compra la misma butaca en el medio, la base rechaza la segunda compra y se avisa.
- **La validación no usa la cámara.** El código se ingresa a mano o con un lector externo.
- **Cualquier usuario con sesión puede leer la tabla de entradas.** Hace falta para pintar las butacas ocupadas, pero incluye los códigos de las entradas ajenas. La mejora pendiente es exponer para ese uso sólo la función y la butaca.
- **Dos validaciones simultáneas de la misma entrada no se distinguen.** Si dos empleados la confirman en el mismo instante, queda registrada la segunda.
- **"Las más vistas" todavía no es un ranking por ventas.** Muestra las primeras películas de la cartelera.
