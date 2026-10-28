import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardPelicula } from '../../componentes/card-pelicula/card-pelicula';
import { DuracionPipe } from '../../pipes/duracion.pipe';
import { PeliculaConGeneros } from '../../models/pelicula.model';
import { AlertasService } from '../../services/alertas';
import { Auth } from '../../services/auth';
import { ComprasService } from '../../services/compra';
import { FuncionesService } from '../../services/funciones';
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
  private funcionesService = inject(FuncionesService);
  private comprasService = inject(ComprasService);
  private alertasService = inject(AlertasService);
  private auth = inject(Auth);

  // Películas que el usuario pidió que le avisen y que ya salieron a la venta.
  avisos = signal<PeliculaConGeneros[]>([]);

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
      this.masVistas = await this.calcularMasVistas();
      this.generos = this.generosDeLaCartelera();

      await this.cargarAvisos(todas);
    } catch {
      this.error.set('No se pudo cargar la cartelera. Probá recargar la página.');
    } finally {
      this.cargando.set(false);
    }
  }

  // Los géneros de todas las películas de la cartelera, sin repetir y ordenados.
  private generosDeLaCartelera(): string[] {
    const generos: string[] = [];
    for (const pelicula of this.cartelera) {
      for (const genero of pelicula.generos) {
        if (!generos.includes(genero)) generos.push(genero);
      }
    }
    return generos.sort();
  }

  // RF-13: las tres películas de la cartelera con más entradas vendidas.
  private async calcularMasVistas(): Promise<PeliculaConGeneros[]> {
    // Si el ranking no se puede leer, la home igual se muestra con las primeras tres.
    let ranking: { pelicula_id: string; entradas_vendidas: number }[] = [];
    try {
      ranking = await this.peliculasService.ranking();
    } catch {
      return this.cartelera.slice(0, 3);
    }

    // Cada película de la cartelera con sus ventas (0 si no vendió nada todavía).
    const conVentas = this.cartelera.map((pelicula) => ({
      pelicula: pelicula,
      vendidas: ranking.find((r) => r.pelicula_id === pelicula.id)?.entradas_vendidas ?? 0,
    }));
    conVentas.sort((a, b) => b.vendidas - a.vendidas);

    return conVentas.slice(0, 3).map((c) => c.pelicula);
  }

  // RF-15: si el usuario activó alertas, se fija cuáles de esas películas
  // ya se pueden comprar (estrenadas o en preventa) para avisarle.
  private async cargarAvisos(todas: PeliculaConGeneros[]) {
    // Si se entra directo a la home, el perfil puede no estar cargado todavía.
    const perfil = this.auth.perfil() ?? (await this.auth.cargarPerfil());
    if (!perfil || perfil.invitado) return;

    // Los avisos son un extra: si fallan, la home se muestra igual.
    let ids: string[] = [];
    try {
      ids = await this.alertasService.listarDelUsuario(perfil.id);
    } catch {
      return;
    }
    if (ids.length === 0) return;

    const funciones = await this.funcionesService.listar();
    const avisos: PeliculaConGeneros[] = [];
    for (const pelicula of todas) {
      if (!ids.includes(pelicula.id)) continue;

      const deLaPelicula = funciones.filter((f) => f.pelicula_id === pelicula.id);
      const algunaALaVenta =
        deLaPelicula.filter((f) => this.comprasService.estaALaVenta(f, pelicula)).length > 0;
      if (algunaALaVenta) avisos.push(pelicula);
    }
    this.avisos.set(avisos);
  }

  // "Listo": se borra la alerta, así no vuelve a aparecer.
  async descartarAviso(pelicula: PeliculaConGeneros) {
    const perfil = this.auth.perfil();
    if (!perfil) return;
    await this.alertasService.desactivar(perfil.id, pelicula.id);
    this.avisos.update((lista) => lista.filter((p) => p.id !== pelicula.id));
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