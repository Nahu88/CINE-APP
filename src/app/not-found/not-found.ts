import { Component } from '@angular/core';

@Component({
  selector: 'app-not-found',
  standalone: true,
  template: `
    <div style="text-align: center; padding: 50px;">
      <h1 style="font-size: 4rem; margin: 0;">404</h1>
      <h2>Página no encontrada.</h2>
      <p>La dirección que ingresaste no existe.</p>
    </div>
  `
})
export class NotFoundComponent {}