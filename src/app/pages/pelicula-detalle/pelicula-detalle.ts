import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DuracionPipe } from '../../pipes/duracion.pipe';
import { Pelicula } from '../../models/pelicula.model';
import { Funcion } from '../../models/funcion.model';
import { Resenia } from '../../models/resenia.model';
import { Sala } from '../../models/sala.model';
import { AlertasService } from '../../services/alertas';
import { Auth } from '../../services/auth';
import { ComprasService } from '../../services/compra';
import { FuncionesService } from '../../services/funciones';
import { PeliculasService } from '../../services/peliculas';
import { ReseniasService } from '../../services/resenias';
import { SalasService } from '../../services/salas';

@Component({
  imports: [RouterLink, DatePipe, DecimalPipe, DuracionPipe, ReactiveFormsModule],
  selector: 'app-pelicula-detalle',
  styleUrl: './pelicula-detalle.css',
  templateUrl: './pelicula-detalle.html',
})
export class PeliculaDetalle implements OnInit {
  private route = inject(ActivatedRoute);
  protected auth = inject(Auth);
  private peliculasService = inject(PeliculasService);
  private funcionesService = inject(FuncionesService);
  private salasService = inject(SalasService);
  private comprasService = inject(ComprasService);
  private reseniasService = inject(ReseniasService);
  private alertasService = inject(AlertasService);

  pelicula = signal<Pelicula | null>(null);
  funciones = signal<Funcion[]>([]);
  salas = signal<Sala[]>([]);
  resenias = signal<Resenia[]>([]);
  tieneAlerta = signal(false);
  cargando = signal(true);
  error = signal<string | null>(null);
  errorResenia = signal<string | null>(null);

  readonly estrellas = [1, 2, 3, 4, 5];

  promedio = computed(() => this.reseniasService.promedio(this.resenias()));

  miResenia = computed(() => {
    const perfil = this.auth.perfil();
    if (!perfil) return null;
    return this.resenias().find((r) => r.usuario_id === perfil.id) ?? null;
  });

  // Un invitado no puede reseñar ni pedir alertas.
  esClienteRegistrado = computed(() => {
    const perfil = this.auth.perfil();
    return !!perfil && !perfil.invitado;
  });

  esEstrenoFuturo = computed(() => {
    const pelicula = this.pelicula();
    if (!pelicula?.fecha_estreno) return false;
    return new Date(pelicula.fecha_estreno + 'T00:00:00') > new Date();
  });

  formResenia = new FormGroup({
    estrellas: new FormControl(0, { nonNullable: true, validators: [Validators.min(1)] }),
    comentario: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(280)] }),
  });

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Película no encontrada.');
      this.cargando.set(false);
      return;
    }

    try {
      // Si se entra por link, el perfil puede no estar cargado.
      if (!this.auth.perfil()) await this.auth.cargarPerfil();

      const todas = await this.peliculasService.listarCartelera();
      const pelicula = todas.find((p) => p.id === id) ?? null;

      if (!pelicula) {
        this.error.set('Película no encontrada.');
        return;
      }
      this.pelicula.set(pelicula);

      const funciones = await this.funcionesService.listar();
      const ahora = new Date();
      this.funciones.set(funciones.filter((f) => f.pelicula_id === id && !f.cancelada && new Date(f.inicio) > ahora));

      this.salas.set(await this.salasService.listar());
      this.resenias.set(await this.reseniasService.listarDePelicula(id));

      const perfil = this.auth.perfil();
      if (perfil && !perfil.invitado) {
        const alertas = await this.alertasService.listarDelUsuario(perfil.id);
        this.tieneAlerta.set(alertas.includes(id));

        const mia = this.miResenia();
        if (mia) {
          this.formResenia.setValue({ estrellas: mia.estrellas, comentario: mia.comentario ?? '' });
        }
      }
    } catch {
      this.error.set('No se pudo cargar la película.');
    } finally {
      this.cargando.set(false);
    }
  }

  nombreSala(id: number): string {
    return this.salas().find((s) => s.id === id)?.nombre ?? '';
  }

  aLaVenta(funcion: Funcion): boolean {
    const pelicula = this.pelicula();
    return !!pelicula && this.comprasService.estaALaVenta(funcion, pelicula);
  }

  enPreventa(funcion: Funcion): boolean {
    const pelicula = this.pelicula();
    return !!pelicula && this.comprasService.estaEnPreventa(funcion, pelicula);
  }

  elegirEstrellas(cantidad: number) {
    this.formResenia.controls.estrellas.setValue(cantidad);
  }

  async guardarResenia() {
    const perfil = this.auth.perfil();
    const pelicula = this.pelicula();
    if (!perfil || !pelicula) return;

    if (this.formResenia.invalid) {
      this.errorResenia.set('Elegí de 1 a 5 estrellas.');
      return;
    }

    const valores = this.formResenia.getRawValue();
    this.errorResenia.set(null);
    try {
      await this.reseniasService.guardar(this.miResenia(), {
        pelicula_id: pelicula.id,
        usuario_id: perfil.id,
        autor: perfil.nombre,
        estrellas: valores.estrellas,
        comentario: valores.comentario.trim(),
      });
      this.resenias.set(await this.reseniasService.listarDePelicula(pelicula.id));
    } catch {
      this.errorResenia.set('No se pudo guardar tu reseña.');
    }
  }

  async borrarResenia() {
    const mia = this.miResenia();
    const pelicula = this.pelicula();
    if (!mia || !pelicula) return;
    if (!confirm('¿Borrar tu reseña?')) return;

    try {
      await this.reseniasService.eliminar(mia.id);
      this.formResenia.reset({ estrellas: 0, comentario: '' });
      this.resenias.set(await this.reseniasService.listarDePelicula(pelicula.id));
    } catch {
      this.errorResenia.set('No se pudo borrar tu reseña.');
    }
  }

  async alternarAlerta() {
    const perfil = this.auth.perfil();
    const pelicula = this.pelicula();
    if (!perfil || !pelicula) return;

    try {
      if (this.tieneAlerta()) {
        await this.alertasService.desactivar(perfil.id, pelicula.id);
        this.tieneAlerta.set(false);
      } else {
        await this.alertasService.activar(perfil.id, pelicula.id);
        this.tieneAlerta.set(true);
      }
    } catch {
      this.error.set('No se pudo guardar la alerta.');
    }
  }
}
