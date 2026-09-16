import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Encabezado } from './componentes/encabezado/encabezado';
import { Auth } from './services/auth';

@Component({
  imports: [RouterOutlet, Encabezado],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  private auth = inject(Auth);

  constructor() {
    // La sesión queda guardada en el navegador: al abrir la app recuperamos el perfil.
    void this.auth.cargarPerfil();
  }
}
