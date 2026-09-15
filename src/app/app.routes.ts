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
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
  },
  {
    path: 'registro',
    loadComponent: () => import('./pages/registro/registro').then((m) => m.Registro),
  },
  {
    path: 'admin/peliculas',
    loadComponent: () => import('./pages/admin/peliculas/peliculas').then((m) => m.Peliculas),
    canActivate: [rolGuard(['administrador'])],
  },
  {
    path: 'empleado/validar',
    loadComponent: () => import('./pages/empleado/validar/validar').then((m) => m.Validar),
    canActivate: [rolGuard(['empleado', 'administrador'])],
  },
  {
    path: '**',
    loadComponent: () => import('./not-found/not-found').then((m) => m.NotFoundComponent),
  },
];
