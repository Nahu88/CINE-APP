import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardPelicula } from '../../componentes/card-pelicula/card-pelicula';
import { DuracionPipe } from '../../pipes/duracion.pipe';
import { CARTELERA_EJEMPLO, PROXIMAMENTE_EJEMPLO } from './peliculas-ejemplo';

// Sin tildes ni mayúsculas, para que "ultimo" encuentre "Último".
function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

@Component({
  imports: [RouterLink, CardPelicula, DuracionPipe],
  selector: 'app-home',
  styleUrl: './home.css',
  templateUrl: './home.html',
})
export class Home {
  readonly cartelera = CARTELERA_EJEMPLO;
  readonly proximamente = PROXIMAMENTE_EJEMPLO;
  readonly destacada = this.cartelera.find((pelicula) => pelicula.destacada) ?? this.cartelera[0];
  readonly masVistas = this.cartelera.slice(0, 3);
  readonly generos = [...new Set(this.cartelera.flatMap((pelicula) => pelicula.generos))].sort();

  busqueda = signal('');
  generoSeleccionado = signal<string | null>(null);

  peliculasFiltradas = computed(() => {
    const texto = normalizar(this.busqueda());
    const genero = this.generoSeleccionado();

    return this.cartelera.filter(
      (pelicula) =>
        normalizar(pelicula.nombre).includes(texto) &&
        (!genero || pelicula.generos.includes(genero))
    );
  });

  buscar(evento: Event) {
    this.busqueda.set((evento.target as HTMLInputElement).value);
  }

  alternarGenero(genero: string) {
    this.generoSeleccionado.update((actual) => (actual === genero ? null : genero));
  }
}
