import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardPelicula } from '../../componentes/card-pelicula/card-pelicula';
import { DuracionPipe } from '../../pipes/duracion.pipe';
import { PeliculaConGeneros } from '../../models/pelicula.model';
import { PeliculasService } from '../../services/peliculas';

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
export class Home implements OnInit {
  private peliculasService = inject(PeliculasService);

  cargando = signal(true);
  error = signal<string | null>(null);

  // Se llenan una vez, cuando responde Supabase.
  cartelera: PeliculaConGeneros[] = [];
  proximamente: PeliculaConGeneros[] = [];
  // Puede no haber ninguna: si solo hay estrenos futuros, el hero no se muestra.
  destacada?: PeliculaConGeneros;
  masVistas: PeliculaConGeneros[] = [];
  generos: string[] = [];

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

  async ngOnInit() {
    try {
      const todas = await this.peliculasService.listarCartelera();

      // Cartelera actual = sin fecha de estreno futura. Próximamente = con ella.
      this.cartelera = todas.filter((p) => !this.esFutura(p.fecha_estreno));
      this.proximamente = todas.filter((p) => this.esFutura(p.fecha_estreno));

      // Si no hay ninguna en cartelera, se destaca el próximo estreno marcado.
      this.destacada =
        this.cartelera.find((p) => p.destacada) ??
        this.cartelera[0] ??
        this.proximamente.find((p) => p.destacada);
      this.masVistas = this.cartelera.slice(0, 3); // top ventas real: semana 5
      this.generos = [...new Set(this.cartelera.flatMap((p) => p.generos))].sort();
    } catch {
      this.error.set('No se pudo cargar la cartelera. Probá recargar la página.');
    } finally {
      this.cargando.set(false);
    }
  }

  private esFutura(fechaEstreno: string | undefined): boolean {
    if (!fechaEstreno) return false;
    return new Date(fechaEstreno) > new Date();
  }

  buscar(evento: Event) {
    this.busqueda.set((evento.target as HTMLInputElement).value);
  }

  alternarGenero(genero: string) {
    this.generoSeleccionado.update((actual) => (actual === genero ? null : genero));
  }
}