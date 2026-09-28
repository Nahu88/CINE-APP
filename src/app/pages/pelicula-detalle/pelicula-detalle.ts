import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DuracionPipe } from '../../pipes/duracion.pipe';
import { Pelicula } from '../../models/pelicula.model';
import { Funcion } from '../../models/funcion.model';
import { Sala } from '../../models/sala.model';
import { PeliculasService } from '../../services/peliculas';
import { FuncionesService } from '../../services/funciones';
import { SalasService } from '../../services/salas';

@Component({
  imports: [RouterLink, DatePipe, DuracionPipe],
  selector: 'app-pelicula-detalle',
  styleUrl: './pelicula-detalle.css',
  templateUrl: './pelicula-detalle.html',
})
export class PeliculaDetalle implements OnInit {
  private route = inject(ActivatedRoute);
  private peliculasService = inject(PeliculasService);
  private funcionesService = inject(FuncionesService);
  private salasService = inject(SalasService);

  pelicula = signal<Pelicula | null>(null);
  funciones = signal<Funcion[]>([]);
  salas = signal<Sala[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Película no encontrada.');
      this.cargando.set(false);
      return;
    }

    try {
      const todas = await this.peliculasService.listarCartelera();
      const pelicula = todas.find((p) => p.id === id) ?? null;

      if (!pelicula) {
        this.error.set('Película no encontrada.');
        return;
      }
      this.pelicula.set(pelicula);

      // Sin join: se filtran acá las funciones de esta película nomás.
      const funciones = await this.funcionesService.listar();
      this.funciones.set(funciones.filter((f) => f.pelicula_id === id));

      const salas = await this.salasService.listar();
      this.salas.set(salas);
    } catch {
      this.error.set('No se pudo cargar la película.');
    } finally {
      this.cargando.set(false);
    }
  }

  nombreSala(id: number): string {
    return this.salas().find((s) => s.id === id)?.nombre ?? '';
  }
}