import { Component, computed, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { PeliculaConGeneros } from '../../models/pelicula.model';
import { DuracionPipe } from '../../pipes/duracion.pipe';

@Component({
  imports: [DatePipe, DuracionPipe],
  selector: 'app-card-pelicula',
  styleUrl: './card-pelicula.css',
  templateUrl: './card-pelicula.html',
})
export class CardPelicula {
  pelicula = input.required<PeliculaConGeneros>();
  proximamente = input(false);
  mostrarInfo = input(true);

  etiquetaEdad = computed(() => {
    const edad = this.pelicula().restriccion_edad;
    return edad ? `+${edad}` : 'ATP';
  });
}
