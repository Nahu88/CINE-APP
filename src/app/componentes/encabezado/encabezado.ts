import { Component, effect, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';
import { NotificacionesService } from '../../services/notificaciones';

@Component({
  imports: [RouterLink],
  selector: 'app-encabezado',
  styleUrl: './encabezado.css',
  templateUrl: './encabezado.html',
})
export class Encabezado {
  protected auth = inject(Auth);
  protected notificaciones = inject(NotificacionesService);
  private router = inject(Router);

  constructor() {
    // Al iniciar sesión empieza a escuchar los avisos del usuario; al cerrarla, deja de escuchar.
    effect(() => {
      const perfil = this.auth.perfil();
      if (perfil) {
        void this.notificaciones.iniciar(perfil.id);
      } else {
        this.notificaciones.detener();
      }
    });
  }

  async cerrarSesion() {
    await this.auth.cerrarSesion();
    this.router.navigate(['/home']);
  }
}
