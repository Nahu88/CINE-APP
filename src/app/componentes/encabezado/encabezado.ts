import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';

@Component({
  imports: [RouterLink],
  selector: 'app-encabezado',
  styleUrl: './encabezado.css',
  templateUrl: './encabezado.html',
})
export class Encabezado {
  // El template lee auth.perfil() para saber si mostrar "Ingresar" o el nombre del usuario.
  protected auth = inject(Auth);
  private router = inject(Router);

  async cerrarSesion() {
    await this.auth.cerrarSesion();
    this.router.navigate(['/home']);
  }
}
