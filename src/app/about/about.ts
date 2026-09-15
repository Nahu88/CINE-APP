import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../navbar/navbar';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, NavbarComponent],
  template: `
    <div [ngClass]="{'dark-theme': isDarkMode}" class="page-wrapper">
      <app-navbar></app-navbar>
      <div class="content">
        <h1>Sobre Nosotros</h1>
        <p>Somos un equipo dedicado al desarrollo de soluciones tecnológicas.</p>
      </div>
    </div>
  `,
  styles: [`
    .page-wrapper { min-height: 100vh; transition: background-color 0.3s, color 0.3s; }
    .content { padding: 20px; }
    .dark-theme { background-color: black; color: white; }
  `]
})
export class AboutComponent implements OnInit {
  isDarkMode = false;

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.isDarkMode = params['dark'] === 'true';
    });
  }
}