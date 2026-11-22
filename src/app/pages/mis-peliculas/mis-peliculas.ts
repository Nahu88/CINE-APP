import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Pelicula } from '../../models/pelicula.model';
import { Auth } from '../../services/auth';
import { EntradasService } from '../../services/entradas';
import { FuncionesService } from '../../services/funciones';
import { PeliculasService } from '../../services/peliculas';
import { ReseniasService } from '../../services/resenias';

interface PeliculaVista {
  pelicula: Pelicula;
  fecha: string;
  estrellas: number | null; // null si no la calificó
}

@Component({
  imports: [RouterLink, DatePipe],
  selector: 'app-mis-peliculas',
  styleUrl: './mis-peliculas.css',
  templateUrl: './mis-peliculas.html',
})
export class MisPeliculas implements OnInit {
  private auth = inject(Auth);
  private entradasService = inject(EntradasService);
  private funcionesService = inject(FuncionesService);
  private peliculasService = inject(PeliculasService);
  private reseniasService = inject(ReseniasService);

  vistas = signal<PeliculaVista[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);

  readonly estrellas = [1, 2, 3, 4, 5];

  async ngOnInit() {
    const perfil = this.auth.perfil();
    if (!perfil) return;

    try {
      const entradas = await this.entradasService.listarDelUsuario(perfil.id);
      const funciones = await this.funcionesService.listar();
      const peliculas = await this.peliculasService.listarTodas();
      const resenias = await this.reseniasService.listarDelUsuario(perfil.id);
      const ahora = new Date();

      const vistas: PeliculaVista[] = [];
      for (const entrada of entradas) {
        const funcion = funciones.find((f) => f.id === entrada.funcion_id);
        if (!funcion) continue;

        // Vista = validada en la puerta, o función pasada y no cancelada.
        const yaPaso = new Date(funcion.inicio) < ahora;
        const laVio = entrada.estado === 'usada' || (yaPaso && entrada.estado !== 'cancelada');
        if (!laVio) continue;

        if (vistas.find((v) => v.pelicula.id === funcion.pelicula_id)) continue;

        const pelicula = peliculas.find((p) => p.id === funcion.pelicula_id);
        if (!pelicula) continue;

        const resenia = resenias.find((r) => r.pelicula_id === pelicula.id);
        vistas.push({ pelicula: pelicula, fecha: funcion.inicio, estrellas: resenia?.estrellas ?? null });
      }

      // Las fechas ISO se pueden comparar como texto.
      vistas.sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
      this.vistas.set(vistas);
    } catch {
      this.error.set('No se pudo cargar tu historial.');
    } finally {
      this.cargando.set(false);
    }
  }
}
