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
    // Se vuelve a correr cada vez que cambia el perfil: al entrar empieza a escuchar
    // los avisos y al salir deja de escuchar. El encabezado está en todas las páginas.
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
