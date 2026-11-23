import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth';

// Protege una sección del panel por permiso, no por rol fijo: permisoGuard('reportes').
export function permisoGuard(seccion: string): CanActivateFn {
  return async () => {
    const auth = inject(Auth);
    const router = inject(Router);

    const perfil = await auth.cargarPerfil();

    if (!perfil) {
      return router.createUrlTree(['/login']);
    }
    if (!auth.tienePermiso(seccion)) {
      return router.createUrlTree(['/home']);
    }
    return true;
  };
}
