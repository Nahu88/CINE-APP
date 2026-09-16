# Cine Paraíso

Aplicación web para la gestión y la venta de entradas de un cine: cartelera pública, compra de entradas con selección de butacas, panel de administración y validación de entradas por parte de los empleados.

Trabajo práctico 1 de Programación IV (UTN, 2026 C2).

- **Aplicación publicada:** https://cine-53d39.web.app

## Tecnologías

- **Angular 22**: componentes standalone, señales, rutas con carga diferida y formularios reactivos.
- **Supabase**: base de datos PostgreSQL, autenticación y almacenamiento de imágenes, con Row Level Security activo en todas las tablas del negocio.
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

## Estado del proyecto

Implementado:

- Registro de usuarios, que crea la cuenta de autenticación y su perfil.
- Inicio y cierre de sesión, con la sesión persistida entre recargas.
- Control de acceso por rol sobre las rutas de administración y de empleados, con tests.
- Página principal con estreno destacado, las más vistas, cartelera con buscador y filtro por género, y próximos estrenos.
- Aplicación instalable como PWA y publicada en Firebase Hosting.
