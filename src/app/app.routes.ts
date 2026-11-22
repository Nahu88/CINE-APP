import { Routes } from '@angular/router';
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

  // ---------- Cliente ----------
  // La compra no tiene guard: un visitante puede comprar sin registrarse (RF-03).
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
    path: 'perfil',
    loadComponent: () => import('./pages/perfil/perfil').then((m) => m.PerfilPagina),
    canActivate: [rolGuard(['cliente', 'empleado', 'administrador'])],
  },

  // ---------- Empleado ----------
  {
    path: 'empleado/validar',
    loadComponent: () => import('./pages/empleado/validar/validar').then((m) => m.Validar),
    canActivate: [rolGuard(['empleado', 'administrador'])],
  },

  // ---------- Administrador ----------
  {
    path: 'admin',
    loadComponent: () => import('./pages/admin/inicio/inicio').then((m) => m.AdminInicio),
    canActivate: [rolGuard(['administrador'])],
  },
  {
    path: 'admin/peliculas',
    loadComponent: () => import('./pages/admin/peliculas/peliculas').then((m) => m.Peliculas),
    canActivate: [rolGuard(['administrador'])],
  },
  {
    path: 'admin/generos',
    loadComponent: () => import('./pages/admin/generos/generos').then((m) => m.Generos),
    canActivate: [rolGuard(['administrador'])],
  },
  {
    path: 'admin/propuestas',
    loadComponent: () => import('./pages/admin/propuestas/propuestas').then((m) => m.AdminPropuestas),
    canActivate: [rolGuard(['administrador'])],
  },
  {
    path: 'admin/salas',
    loadComponent: () => import('./pages/admin/salas/salas').then((m) => m.Salas),
    canActivate: [rolGuard(['administrador'])],
  },
  {
    path: 'admin/salas/:id',
    loadComponent: () => import('./pages/admin/sala-butacas/sala-butacas').then((m) => m.SalaButacas),
    canActivate: [rolGuard(['administrador'])],
  },
  {
    path: 'admin/funciones',
    loadComponent: () => import('./pages/admin/funciones/funciones').then((m) => m.Funciones),
    canActivate: [rolGuard(['administrador'])],
  },
  {
    path: 'admin/productos',
    loadComponent: () => import('./pages/admin/productos/productos').then((m) => m.Productos),
    canActivate: [rolGuard(['administrador'])],
  },
  {
    path: 'admin/combos',
    loadComponent: () => import('./pages/admin/combos/combos').then((m) => m.Combos),
    canActivate: [rolGuard(['administrador'])],
  },
  {
    path: 'admin/cupones',
    loadComponent: () => import('./pages/admin/cupones/cupones').then((m) => m.Cupones),
    canActivate: [rolGuard(['administrador'])],
  },
  {
    path: 'admin/recompensas',
    loadComponent: () => import('./pages/admin/recompensas/recompensas').then((m) => m.Recompensas),
    canActivate: [rolGuard(['administrador'])],
  },
  {
    path: 'admin/reportes',
    loadComponent: () => import('./pages/admin/reportes/reportes').then((m) => m.Reportes),
    canActivate: [rolGuard(['administrador'])],
  },
  {
    path: 'admin/actividad',
    loadComponent: () => import('./pages/admin/actividad/actividad').then((m) => m.Actividad),
    canActivate: [rolGuard(['administrador'])],
  },

  {
    path: '**',
    loadComponent: () => import('./not-found/not-found').then((m) => m.NotFoundComponent),
  },
];
