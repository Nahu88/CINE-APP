import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { RolUsuario } from '../models/perfil.model';
import { Auth } from '../services/auth';

// El rol se lee de la tabla perfiles y no de localStorage para que no se pueda falsear.
export function rolGuard(rolesPermitidos: RolUsuario[]): CanActivateFn {
  return async () => {
    const auth = inject(Auth);
    const router = inject(Router);

    // Si el perfil ya está en la señal no se vuelve a consultar la base.
    const perfil = auth.perfil() ?? (await auth.cargarPerfil());

    if (!perfil) {
      return router.createUrlTree(['/login']);
    }
    if (!rolesPermitidos.includes(perfil.rol)) {
      return router.createUrlTree(['/home']);
    }
    return true;
  };
}
