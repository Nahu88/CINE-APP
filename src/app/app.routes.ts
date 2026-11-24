import { Routes } from '@angular/router';
import { permisoGuard } from './guards/permiso.guard';
import { rolGuard } from './guards/rol.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'home',
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
  },
  {
    path: 'pelicula/:id',
    loadComponent: () =>
      import('./pages/pelicula-detalle/pelicula-detalle').then((m) => m.PeliculaDetalle),
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
  },
  {
    path: 'registro',
    loadComponent: () => import('./pages/registro/registro').then((m) => m.Registro),
  },

  // Sin guard: se puede comprar sin cuenta.
  {
    path: 'compra/:funcionId',
    loadComponent: () => import('./pages/compra/compra').then((m) => m.Compra),
  },
  {
    path: 'mis-entradas',
    loadComponent: () => import('./pages/mis-entradas/mis-entradas').then((m) => m.MisEntradas),
    canActivate: [rolGuard(['cliente', 'empleado', 'administrador'])],
  },
  {
    path: 'mis-peliculas',
    loadComponent: () => import('./pages/mis-peliculas/mis-peliculas').then((m) => m.MisPeliculas),
    canActivate: [rolGuard(['cliente', 'empleado', 'administrador'])],
  },
  {
    path: 'notificaciones',
    loadComponent: () => import('./pages/notificaciones/notificaciones').then((m) => m.NotificacionesPagina),
    canActivate: [rolGuard(['cliente', 'empleado', 'administrador'])],
  },
  {
    path: 'perfil',
    loadComponent: () => import('./pages/perfil/perfil').then((m) => m.PerfilPagina),
    canActivate: [rolGuard(['cliente', 'empleado', 'administrador'])],
  },

  {
    path: 'empleado/validar',
    loadComponent: () => import('./pages/empleado/validar/validar').then((m) => m.Validar),
    canActivate: [permisoGuard('validar')],
  },

  {
    path: 'admin',
    loadComponent: () => import('./pages/admin/inicio/inicio').then((m) => m.AdminInicio),
    canActivate: [permisoGuard('panel')],
  },
  {
    path: 'admin/peliculas',
    loadComponent: () => import('./pages/admin/peliculas/peliculas').then((m) => m.Peliculas),
    canActivate: [permisoGuard('peliculas')],
  },
  {
    path: 'admin/generos',
    loadComponent: () => import('./pages/admin/generos/generos').then((m) => m.Generos),
    canActivate: [permisoGuard('generos')],
  },
  {
    path: 'admin/propuestas',
    loadComponent: () => import('./pages/admin/propuestas/propuestas').then((m) => m.AdminPropuestas),
    canActivate: [permisoGuard('propuestas')],
  },
  {
    path: 'admin/salas',
    loadComponent: () => import('./pages/admin/salas/salas').then((m) => m.Salas),
    canActivate: [permisoGuard('salas')],
  },
  {
    path: 'admin/salas/:id',
    loadComponent: () => import('./pages/admin/sala-butacas/sala-butacas').then((m) => m.SalaButacas),
    canActivate: [permisoGuard('salas')],
  },
  {
    path: 'admin/funciones',
    loadComponent: () => import('./pages/admin/funciones/funciones').then((m) => m.Funciones),
    canActivate: [permisoGuard('funciones')],
  },
  {
    path: 'admin/productos',
    loadComponent: () => import('./pages/admin/productos/productos').then((m) => m.Productos),
    canActivate: [permisoGuard('productos')],
  },
  {
    path: 'admin/combos',
    loadComponent: () => import('./pages/admin/combos/combos').then((m) => m.Combos),
    canActivate: [permisoGuard('combos')],
  },
  {
    path: 'admin/cupones',
    loadComponent: () => import('./pages/admin/cupones/cupones').then((m) => m.Cupones),
    canActivate: [permisoGuard('cupones')],
  },
  {
    path: 'admin/recompensas',
    loadComponent: () => import('./pages/admin/recompensas/recompensas').then((m) => m.Recompensas),
    canActivate: [permisoGuard('recompensas')],
  },
  {
    path: 'admin/reportes',
    loadComponent: () => import('./pages/admin/reportes/reportes').then((m) => m.Reportes),
    canActivate: [permisoGuard('reportes')],
  },
  {
    path: 'admin/actividad',
    loadComponent: () => import('./pages/admin/actividad/actividad').then((m) => m.Actividad),
    canActivate: [permisoGuard('actividad')],
  },
  {
    path: 'admin/roles',
    loadComponent: () => import('./pages/admin/roles/roles').then((m) => m.AdminRoles),
    canActivate: [rolGuard(['administrador'])],
  },

  {
    path: '**',
    loadComponent: () => import('./not-found/not-found').then((m) => m.NotFoundComponent),
  },
];
