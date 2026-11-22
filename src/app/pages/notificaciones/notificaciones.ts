import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';
import { NotificacionesService } from '../../services/notificaciones';

@Component({
  imports: [RouterLink, DatePipe],
  selector: 'app-notificaciones',
  styleUrl: './notificaciones.css',
  templateUrl: './notificaciones.html',
})
export class NotificacionesPagina implements OnInit {
  private auth = inject(Auth);
  protected notificaciones = inject(NotificacionesService);

  permiso = signal(false);

  async ngOnInit() {
    this.permiso.set(this.notificaciones.permisoConcedido());

    // Al entrar a ver los avisos, se marcan como leídos.
    const perfil = this.auth.perfil();
    if (perfil && this.notificaciones.sinLeer() > 0) {
      try {
        await this.notificaciones.marcarTodasLeidas(perfil.id);
      } catch (error) {
        console.error('No se pudieron marcar como leídos:', error);
      }
    }
  }

  async activarAvisos() {
    this.permiso.set(await this.notificaciones.pedirPermiso());
  }
}
