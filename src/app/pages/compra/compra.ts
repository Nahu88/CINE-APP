import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MapaButacas } from '../../componentes/mapa-butacas/mapa-butacas';
import { Butaca } from '../../models/sala.model';
import { Funcion } from '../../models/funcion.model';
import { Pelicula } from '../../models/pelicula.model';
import { Auth } from '../../services/auth';
import { ComprasService } from '../../services/compra';
import { FuncionesService } from '../../services/funciones';
import { PeliculasService } from '../../services/peliculas';
import { SalasService } from '../../services/salas';

@Component({
  imports: [RouterLink, DatePipe, MapaButacas],
  selector: 'app-compra',
  styleUrl: './compra.css',
  templateUrl: './compra.html',
})
export class Compra implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private auth = inject(Auth);
  private comprasService = inject(ComprasService);
  private funcionesService = inject(FuncionesService);
  private peliculasService = inject(PeliculasService);
  private salasService = inject(SalasService);

  funcion = signal<Funcion | null>(null);
  pelicula = signal<Pelicula | null>(null);
  salaNombre = signal('');
  butacas = signal<Butaca[]>([]);
  ocupadas = signal<number[]>([]);
  seleccionadas = signal<Butaca[]>([]);

  cargando = signal(true);
  confirmando = signal(false);
  error = signal<string | null>(null);
  exito = signal(false);

  // El mapa solo necesita los ids de las seleccionadas.
  idsSeleccionados = computed(() => this.seleccionadas().map((b) => b.id));

  total = computed(() => {
    const funcion = this.funcion();
    if (!funcion) return 0;
    let total = 0;
    for (const butaca of this.seleccionadas()) {
      total += this.comprasService.precioDe(funcion, butaca);
    }
    return total;
  });

  async ngOnInit() {
    const funcionId = this.route.snapshot.paramMap.get('funcionId');
    try {
      const funciones = await this.funcionesService.listar();
      const funcion = funciones.find((f) => f.id === funcionId) ?? null;
      if (!funcion) {
        this.error.set('Función no encontrada.');
        return;
      }
      this.funcion.set(funcion);

      const peliculas = await this.peliculasService.listarTodas();
      this.pelicula.set(peliculas.find((p) => p.id === funcion.pelicula_id) ?? null);

      const salas = await this.salasService.listar();
      this.salaNombre.set(salas.find((s) => s.id === funcion.sala_id)?.nombre ?? '');

      this.butacas.set(await this.comprasService.listarButacas(funcion.sala_id));
      this.ocupadas.set(await this.comprasService.listarOcupadas(funcion.id));

      // Realtime: cada vez que cambia la tabla `entradas`, se actualiza el mapa.
      this.comprasService.escucharEntradas(() => this.actualizarOcupadas());
    } catch {
      this.error.set('No se pudo cargar la función.');
    } finally {
      this.cargando.set(false);
    }
  }

  // Al salir de la pantalla se cierra el canal de realtime.
  ngOnDestroy() {
    this.comprasService.dejarDeEscuchar();
  }

  // Vuelve a pedir las butacas vendidas y saca de la selección las que ya no están libres.
  private async actualizarOcupadas() {
    const funcion = this.funcion();
    if (!funcion) return;

    const ocupadas = await this.comprasService.listarOcupadas(funcion.id);
    this.ocupadas.set(ocupadas);
    this.seleccionadas.update((actual) => actual.filter((b) => !ocupadas.includes(b.id)));
  }

  precioDe(butaca: Butaca): number {
    const funcion = this.funcion();
    return funcion ? this.comprasService.precioDe(funcion, butaca) : 0;
  }

  // Lo llama el mapa con su output(): si ya estaba elegida la saca, si no la agrega.
  alternarButaca(butaca: Butaca) {
    this.exito.set(false);
    this.seleccionadas.update((actual) =>
      actual.some((b) => b.id === butaca.id)
        ? actual.filter((b) => b.id !== butaca.id)
        : [...actual, butaca]
    );
  }

  async confirmar() {
    const perfil = this.auth.perfil();
    const funcion = this.funcion();
    const pelicula = this.pelicula();
    if (!perfil || !funcion || !pelicula) return;

    if (!this.seleccionadas().length) {
      this.error.set('Elegí al menos una butaca.');
      return;
    }

    if (pelicula.restriccion_edad && this.edadDe(perfil.fecha_nacimiento) < pelicula.restriccion_edad) {
      this.error.set(`Esta película es para mayores de ${pelicula.restriccion_edad} años.`);
      return;
    }

    this.confirmando.set(true);
    this.error.set(null);
    try {
      await this.comprasService.confirmar(perfil.id, funcion, this.seleccionadas());
      this.seleccionadas.set([]);
      this.exito.set(true);
    } catch (error) {
      // 23505 = la base rechazó una butaca repetida (unique funcion_id + butaca_id).
      const codigo = (error as { code?: string }).code;
      this.error.set(
        codigo === '23505'
          ? 'Alguien compró una de esas butacas recién. Elegí otra.'
          : 'No se pudo confirmar la compra.'
      );
      this.seleccionadas.set([]);
    } finally {
      this.ocupadas.set(await this.comprasService.listarOcupadas(funcion.id));
      this.confirmando.set(false);
    }
  }

  // Edad a partir de 'YYYY-MM-DD', sin depender de la zona horaria.
  private edadDe(fechaIso: string): number {
    const partes = fechaIso.split('-');
    const anio = Number(partes[0]);
    const mes = Number(partes[1]) - 1;
    const dia = Number(partes[2]);
    const hoy = new Date();

    let edad = hoy.getFullYear() - anio;
    const yaCumplio = hoy.getMonth() > mes || (hoy.getMonth() === mes && hoy.getDate() >= dia);
    if (!yaCumplio) edad--;
    return edad;
  }
}