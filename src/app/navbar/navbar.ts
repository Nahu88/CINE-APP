import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink],
  template: `
    <nav class="navbar">
      <a routerLink="/home" routerLinkActive="active">Home</a>
      <a routerLink="/about" routerLinkActive="active">Sobre Nosotros</a>
    </nav>
  `,
  styles: [`
    .navbar { padding: 15px; background: #333; display: flex; gap: 20px; }
    .navbar a { color: white; text-decoration: none; font-weight: bold; }
    .navbar a:hover { text-decoration: underline; }
  `]
})
export class NavbarComponent {}