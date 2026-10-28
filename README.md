# Cine Paraíso

Aplicación web para la gestión y la venta de entradas de un cine: cartelera pública, compra de entradas con selección de butacas en tiempo real, candy bar, cupones, puntos y crédito, entrada con código QR en PDF, reseñas, panel de administración con reportes y validación de entradas por parte de los empleados.

Trabajo práctico 1 de Programación IV (UTN, 2026 C2), versión del recuperatorio.

- **Aplicación publicada:** https://cine-53d39.web.app
- **Código:** https://github.com/Nahu88/CINE-APP

## Tecnologías

- **Angular 22**: componentes standalone, señales, rutas con carga diferida, formularios reactivos con validadores propios, pipes y directivas propias.
- **Supabase**: base de datos PostgreSQL, autenticación (con sesión anónima para comprar sin cuenta), Realtime y Row Level Security en todas las tablas del negocio.
- **PWA**: service worker de `@angular/service-worker`, instalable desde el navegador.
- **Firebase Hosting**: publicación de la aplicación.
- **Tres librerías externas**, cada una encerrada en un solo archivo:
  - `qrcode`: dibuja el código QR de cada entrada.
  - `jspdf`: arma el PDF de la entrada y el de los reportes.
  - `html5-qrcode`: lee el QR con la cámara en la pantalla del empleado.

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

### Configuración de Supabase

1. Ejecutar `supabase/migracion_recuperatorio.sql` en el SQL Editor. Agrega las columnas, vistas y políticas de los módulos nuevos.
2. Habilitar **Authentication → Sign In / Providers → Allow anonymous sign-ins**. Es lo que permite comprar sin registrarse.

### Usuarios de prueba

| Rol | Email | Contraseña |
|---|---|---|
| Administrador | nahuel@cine.com | demo1234 |
| Cliente | axel@cine.com | demo1234 |

El administrador también puede entrar a la pantalla de validación de entradas. Los usuarios nuevos se registran siempre como cliente; el rol de empleado o administrador se asigna desde la base de datos.

## Recorrido principal

1. El administrador carga películas y géneros, crea las salas y programa las funciones (una o varias a la vez). Carga también los productos y combos del candy, los cupones y las recompensas.
2. El cliente busca una película en la cartelera, lee las reseñas y elige una función. Si la película todavía no se estrenó, puede pedir que le avisen cuando salga a la venta.
3. En el mapa de la sala elige sus butacas, que se actualizan en tiempo real, y suma productos o combos del candy.
4. Se le aplica solo el cupón que le corresponde (bienvenida o mayores de 50), puede canjear puntos y usar su crédito. Confirma la compra (el pago es simulado). Un visitante sin cuenta también puede comprar.
5. En "Mis entradas" ve cada compra con el QR de cada entrada, la descarga en PDF y puede cancelarla hasta 2 horas antes, lo que le devuelve crédito.
6. En el ingreso, el empleado escanea el QR (o escribe el código), marca la entrada como usada y entrega el candy de esa compra.
7. El administrador consulta la facturación diaria, los rankings y el registro de actividad, y exporta los reportes a PDF y Excel.

## Arquitectura

```
src/app/
  componentes/   componentes reutilizables (encabezado, card de película, mapa de butacas,
                   candy bar de la compra)
  pages/         páginas asociadas a una ruta:
                   home, login, registro, pelicula-detalle, compra, mis-entradas,
                   mis-peliculas, perfil, empleado/validar y admin/ (inicio del panel,
                   peliculas, generos, salas, sala-butacas, funciones, productos,
                   combos, cupones, recompensas, reportes y actividad)
  services/      un servicio por tema:
                   supabase, auth, peliculas, generos, salas, funciones, compra,
                   entradas, candy, fidelizacion, resenias, alertas, reportes,
                   actividad y qr-pdf
  directivas/    directiva de atributo que da estilo a cada butaca según su tipo
  guards/        control de acceso a las rutas según el rol
  models/        interfaces TypeScript que reflejan las tablas
  pipes/         transformaciones de presentación (duración en horas y minutos)
  validators/    validadores propios de los formularios
  utils/         ayudas para cargar fechas y horas sin calendario
supabase/        migración SQL con las tablas, vistas y políticas del recuperatorio
```

La regla que ordena el proyecto: **las pantallas nunca consultan Supabase directamente, siempre pasan por un servicio**. Si cambia la forma de guardar los datos, se toca el servicio y ninguna pantalla se entera.

Cada página se carga con `loadComponent`, de modo que el código del panel de administración y las librerías del PDF y de la cámara no forman parte de la carga inicial de la aplicación.

### Modelo de datos

| Tema | Tablas |
|---|---|
| Usuarios | `perfiles` |
| Cartelera | `peliculas`, `generos`, `salas`, `butacas`, `funciones` |
| Ventas | `ordenes`, `entradas`, `orden_items` |
| Candy bar | `categorias_productos`, `productos`, `combos`, `combo_items` |
| Beneficios | `cupones`, `recompensas`, `canjes`, `puntos_movimientos`, `creditos_movimientos` |
| Comunidad | `resenias`, `alertas_estreno` |
| Auditoría | `logs_actividad` |

Y dos vistas: `butacas_vendidas` (función y butaca de cada entrada vendida, sin el código QR) y `ranking_peliculas` (entradas vendidas por película).

Decisiones del modelo que conviene destacar:

- **Los géneros de cada película se guardan como un arreglo de texto dentro de `peliculas`.** La tabla `generos` es el catálogo de donde se eligen: el formulario los muestra como casillas, así no se escribe el mismo nombre de dos maneras. Si se borra un género del catálogo, las películas que lo tenían lo conservan.
- **Cada función guarda su horario de fin**, calculado al crearla como inicio más la duración de la película más 30 minutos de margen. Así, para saber si una sala está libre alcanza con comparar dos fechas ya guardadas.
- **La base impide vender dos veces la misma butaca** con un índice único sobre `(funcion_id, butaca_id)` que cuenta solo las entradas no canceladas. Así, cuando se cancela una compra, la butaca vuelve a estar disponible.
- **Puntos y crédito se guardan como movimientos**, no como un número que se pisa: cada compra, canje o cancelación agrega una fila positiva o negativa, y el saldo es la suma. Así el historial sale solo.

## Decisiones técnicas

### Usuarios y seguridad

**Un único cliente de Supabase.** `SupabaseService` lo crea una sola vez y el resto de los servicios lo reutilizan. Con más de un cliente, cada uno manejaría su propia sesión y las consultas protegidas por Row Level Security podrían viajar sin el usuario autenticado.

**La sesión vive en una señal.** `Auth` expone `perfil`, una señal con el perfil del usuario o `null`. El encabezado y el guard la leen, y la vista se actualiza sola cuando cambia. Como la sesión queda guardada en el navegador, la aplicación vuelve a pedir el perfil al iniciar.

**El rol se lee de la base de datos.** `rolGuard(['administrador'])` es una función parametrizable: la misma sirve para cualquier combinación de roles y obtiene el rol de la tabla `perfiles`, no de `localStorage`. De todas formas, el guard es una comodidad de interfaz: lo que realmente protege los datos son las políticas de la base.

**Seguridad del perfil en dos niveles.** Row Level Security decide qué filas puede tocar cada usuario y los permisos por columna deciden qué columnas. Un usuario puede editar sus datos personales, pero no `rol` ni `fecha_nacimiento`. `fecha_nacimiento` queda fuera a propósito: de ella dependen la restricción por edad y el cupón para mayores de 50.

**Compra sin registrarse con una sesión anónima.** Cuando un visitante confirma una compra, Supabase le crea una sesión anónima (un usuario sin email) y se le guarda un perfil mínimo marcado como invitado, con la fecha de nacimiento que declaró. Así el invitado compra con las mismas políticas de seguridad que un cliente, sin abrir permisos especiales para usuarios sin sesión. No recibe cupones, puntos ni crédito, y no puede cancelar porque no tiene una cuenta donde acreditarlo.

**Las políticas de escritura se agregan módulo por módulo.** El administrador escribe sobre películas, géneros, salas, butacas, funciones, productos, combos, cupones y recompensas; cada cliente sobre sus propias órdenes, entradas, reseñas, alertas, canjes y movimientos; el empleado y el administrador marcan entradas como usadas y el candy como entregado.

### Panel de administración

**Una página de inicio del panel.** El encabezado tiene un solo link "Panel" que lleva a una pantalla con una tarjeta por sección, en vez de once links sueltos.

**Estilos compartidos.** Todas las pantallas del panel usan las mismas clases (`panel`, `caja`, tablas, botones chicos) definidas una vez en `src/styles.css`.

**Las fechas se cargan sin el calendario del navegador.** El cliente lo descartó expresamente (RNF-07). La fecha de una función y la de estreno se cargan con selectores de día, mes y año, y la hora con selectores de hora y minutos. Validadores de grupo comprueban que la fecha exista y que la de la función no sea pasada.

**Varias funciones de una vez.** Al programar se pueden tildar días de la semana y una cantidad de semanas: se crea una función por cada día, a la misma hora, y cada una busca su propia sala libre. Al terminar se informa cuántas se crearon y para qué horarios no hubo sala.

**El admin puede cambiar la distribución de una sala.** La pantalla de butacas reutiliza el mismo mapa de la compra: el mapa avisa qué butaca se tocó y la página le cambia el tipo. La directiva de las butacas repinta el borde en `ngOnChanges`, porque el botón es el mismo y solo cambia su tipo.

**Registro de actividad.** `ActividadService.registrar()` se llama después de cada acción sensible: crear o eliminar funciones, películas y salas, cambiar butacas, crear productos, combos, cupones y recompensas, cambiar cualquier precio, porcentaje o puntos, validar un QR y entregar candy. Se guarda quién, qué, cuándo y un detalle (por ejemplo, el precio anterior y el nuevo).

### Compra de entradas

**La compra está partida en componentes.** El mapa de butacas recibe las butacas, las vendidas y las elegidas, y sólo avisa cuál se tocó. El candy bar carga su catálogo, recibe el carrito y devuelve el carrito actualizado. La página de compra mantiene la selección y los beneficios, y calcula el total. El color de cada butaca según su tipo lo pone una directiva de atributo propia.

**Butacas en tiempo real.** La pantalla de compra se suscribe con Supabase Realtime a los cambios de la tabla `entradas`. Cuando otra persona compra, el mapa vuelve a pedir las butacas vendidas, las marca sin recargar y las saca de la selección si estaban elegidas. Al salir de la pantalla se cierra el canal en `ngOnDestroy`.

**Las butacas vendidas se leen de una vista sin códigos.** `butacas_vendidas` expone solo la función y la butaca de cada entrada no cancelada. Así un visitante sin cuenta puede ver qué butacas están ocupadas sin leer los códigos QR de nadie.

**La base es la que impide la venta doble.** Si dos personas confirman la misma butaca al mismo tiempo, el índice único rechaza a la segunda. En ese caso el servicio borra la orden que había creado, y la pantalla avisa y actualiza el mapa.

**El total se arma paso a paso con señales calculadas.** Subtotal de entradas, subtotal del candy, descuento por canje, descuento por cupón, crédito usado y total son cada uno un `computed` que depende del anterior. Cualquier cambio en la selección recalcula todo solo.

**Un solo cupón por compra, el mejor.** Si al cliente le corresponden varios (bienvenida, mayores de 50, generales), se aplica automáticamente el de mayor porcentaje. El de bienvenida se usa una sola vez: se consulta si el cliente ya tiene una compra no cancelada con ese cupón.

**Puntos.** Cada compra de un cliente registrado suma 1 punto por cada peso pagado. Al comprar, el cliente puede elegir una recompensa: si es un producto, se agrega gratis a la compra; si es una entrada gratis, se descuenta la butaca más barata de las elegidas.

**Preventa.** Si una película se estrena en el futuro, sus funciones pueden tener un precio de preventa que rige desde 7 días antes del estreno. Las butacas normales y accesibles usan ese precio; las VIP mantienen el suyo, que siempre es mayor. Cuando llega el estreno, el precio vuelve solo al normal. Las funciones de una película no estrenada y sin preventa todavía no se pueden comprar.

**Cancelación con crédito.** Una compra se puede cancelar si faltan más de 2 horas para la función y ninguna entrada se usó. La orden y sus entradas pasan a canceladas (eso libera las butacas), todo lo pagado, en plata y en crédito, se acredita como crédito, y se revierten los puntos de esa compra. Nunca se devuelve dinero.

**La restricción por edad se controla antes de guardar nada.** Si la película es para mayores de 13 o de 18 años, se calcula la edad a partir de la fecha de nacimiento del perfil, o de la que declara el invitado. Toda entrada de esas películas indica que el espectador debe asistir acompañado por un adulto.

### Entrada con QR y validación

**El QR sólo contiene un código.** Cada entrada se guarda con un código único generado al azar. El QR lleva ese código y nada más: los datos de la entrada se buscan en la base en el momento de validarla.

**El candy se retira con el mismo QR.** Al validar una entrada, la pantalla del empleado muestra también el candy de esa compra. La entrada y el candy tienen estados separados: se puede entrar a la sala y retirar el candy en momentos distintos, y cada uno se marca una sola vez.

**El QR y el PDF se generan en el navegador.** El PDF incluye los datos de la función, la butaca, el QR, el aviso de edad si corresponde y el candy a retirar.

**Lector con la cámara o código a mano.** El empleado puede escanear el QR con la cámara del celular o escribir el código. Si la cámara no está disponible, se avisa y se sigue con el ingreso manual. La cámara se apaga al leer un código o al salir de la pantalla.

### Contenido para el cliente

**Reseñas.** Cada cliente registrado puede dejar una reseña por película, con estrellas y un comentario corto, y editarla o borrarla. El detalle de la película muestra el promedio, calculado en el cliente, y todas las reseñas antes de comprar. Cualquier cliente registrado puede reseñar.

**Alertas de estreno.** En una película de "Próximamente" el cliente puede pedir que le avisen. El aviso se muestra dentro de la aplicación, en la página principal, cuando la película ya se puede comprar (estrenada o en preventa). Al tocar "Listo", la alerta se borra.

**Perfil y "Mis películas".** El perfil muestra los puntos, el crédito, el historial de canjes y los movimientos. "Mis películas" muestra los pósters de lo que el cliente vio (entradas usadas o funciones ya pasadas), con la fecha y su calificación.

**"Las más vistas" es un ranking real.** La página principal muestra las tres películas de la cartelera con más entradas vendidas, leídas de la vista `ranking_peliculas`.

### Reportes

**Facturación diaria y rankings.** Se traen las compras pagadas y se agrupan en el cliente: facturación y entradas por día (últimos 30 días), películas con más entradas vendidas y productos del candy más vendidos (última semana o último mes). Las compras canceladas no suman.

**Gráficos sin librería.** Las barras de los rankings son elementos con un ancho en porcentaje: la más vendida ocupa el 100 % y las demás, en proporción.

**Exportación.** El reporte de facturación se exporta a PDF con `jspdf` y a Excel como archivo CSV, que Excel abre directamente. Se eligió CSV para no sumar otra librería.

## Estado del proyecto

Implementado, con los requerimientos de la versión 1.0 del documento:

- Usuarios: registro, inicio y cierre de sesión, compra sin registrarse, control de acceso por rol, perfil con puntos, crédito e historial (RF-01 a RF-06).
- Cartelera: ABM de películas con géneros elegidos del catálogo, ABM de géneros, buscador y filtro, ranking de más vendidas, "Próximamente" y alertas de estreno (RF-07 a RF-15).
- Salas y butacas: generación automática, cambio de tipo por butaca, mapa diferenciado y en tiempo real, aviso de VIP (RF-16 a RF-22).
- Funciones: asignación automática de sala con 30 minutos de margen, programación de varios días a la vez (RF-23 a RF-28).
- Compra: butacas, control de edad con aviso de adulto acompañante, candy en la misma compra, cancelación con crédito, crédito combinable, PDF con QR (RF-29 a RF-36).
- Validación: escaneo con cámara o código manual, entrada y candy con el mismo QR, cada uno de un solo uso (RF-37 a RF-40).
- Candy bar: productos, categorías y combos destacados (RF-41 a RF-44).
- Beneficios: cupón de bienvenida configurable, cupones para mayores de 50, puntos, recompensas configurables, canjes y preventa (RF-45 a RF-54).
- Reseñas con promedio y "Mis películas" (RF-55 a RF-58).
- Reportes de facturación, exportación a PDF y Excel, gráfico de películas más vistas, producto más vendido y registro de actividad (RF-59 a RF-63).
- Aplicación instalable como PWA y publicada en Firebase Hosting.

### Limitaciones conocidas

- **Los importes los calcula el cliente.** Precios, descuentos, puntos y crédito se calculan en Angular y la base los guarda. Como el pago es simulado no hay dinero en juego, pero un usuario podría alterarlos desde la consola del navegador. En producción, esos cálculos irían a una función de la base.
- **Una compra se guarda en varios pasos.** Orden, entradas, candy y movimientos son inserciones separadas. Si falla un paso intermedio, los anteriores quedan guardados (la única excepción cubierta es la butaca repetida, que deshace la orden).
- **Cualquier usuario con sesión puede leer la tabla de entradas.** Hace falta para que Realtime avise los cambios, pero incluye los códigos de entradas ajenas. El mapa ya usa la vista sin códigos; la mejora pendiente es avisar los cambios sin exponer la tabla.
- **El invitado pierde sus entradas si cierra la sesión.** No tiene email para recuperarla: se le pide que descargue las entradas apenas compra.
- **Dos validaciones simultáneas de la misma entrada no se distinguen.** Si dos empleados la confirman en el mismo instante, queda registrada la segunda.
- **La reserva temporal de butacas no está implementada.** Una butaca elegida no se bloquea mientras se paga: si otro la confirma antes, la base rechaza la segunda compra y se avisa.

## Supuestos adoptados

El enunciado deja algunos puntos abiertos. Mientras no haya respuesta del cliente, se asumió lo siguiente:

- **Filas accesibles:** el cliente dice que se quitaron las filas J y K para dar lugar a una fila adaptada, pero después menciona "las filas J y K adaptadas". Se toma la segunda lectura: dos filas accesibles de 14 butacas cada una (2, 10 y 2 por columna), con lo que la sala mantiene las 20 filas del primer correo.
- **Butacas VIP:** el precio se guarda en una columna propia de cada función, separada del precio normal, y siempre tiene que ser mayor.
- **Clasificaciones:** el enunciado sólo menciona 13 y 18 años, así que las películas clasificadas +16 se cargan como +13 o +18.
- **Medio de pago:** no está definido en el enunciado, por lo que el pago se simula.
- **Mayores de 50:** el cupón alcanza a quienes tienen 50 años cumplidos o más.
- **Descuentos acumulables:** se aplica un solo cupón por compra (el de mayor porcentaje), que sí se combina con el canje de puntos y con el crédito.
- **Cancelación y puntos:** al cancelar una compra se restan los puntos que había otorgado y se devuelven los que se habían canjeado en ella.
- **Reseñas:** cualquier cliente registrado puede reseñar una película, sin necesidad de haber comprado una entrada.
- **Compras de invitados:** no se pueden cancelar, porque no hay una cuenta donde acreditar el crédito.
- **Películas más vistas:** se cuentan las entradas vendidas en la última semana o el último mes.
- **Mapa general del cine:** queda fuera de alcance, ya que el cliente aclara que todavía no está aprobado.
- **Imágenes:** las películas y los productos se cargan indicando la URL de la imagen.
- **Datos personales:** se piden el tipo de sangre, el color de ojos y los días de vacaciones porque el cliente los solicita expresamente, aunque no se usen en ninguna funcionalidad. El tipo de sangre es un dato sensible según la Ley 25.326 de Protección de Datos Personales, de modo que corresponde consultar con el cliente para qué los necesita.
