import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { RolUsuario } from '../models/perfil.model';
import { Auth } from '../services/auth';

export function rolGuard(rolesPermitidos: RolUsuario[]): CanActivateFn {
  return async () => {
    const auth = inject(Auth);
    const router = inject(Router);

    // Se lee de la base y no de localStorage para que no se pueda falsear.
    const perfil = await auth.cargarPerfil();

    if (!perfil) {
      return router.createUrlTree(['/login']);
    }
    if (!rolesPermitidos.includes(perfil.rol)) {
      return router.createUrlTree(['/home']);
    }
    return true;
  };
}
