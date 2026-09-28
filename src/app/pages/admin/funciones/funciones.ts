import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Pelicula } from '../../../models/pelicula.model';
import { Sala } from '../../../models/sala.model';
import { Funcion } from '../../../models/funcion.model';
import { PeliculasService } from '../../../services/peliculas';
import { SalasService } from '../../../services/salas';
import { DatosFuncion, FuncionesService, SIN_SALA_DISPONIBLE } from '../../../services/funciones';
import { Auth } from '../../../services/auth';

@Component({
  imports: [ReactiveFormsModule, DatePipe],
  selector: 'app-funciones',
  styleUrl: './funciones.css',
  templateUrl: './funciones.html',
})
export class Funciones implements OnInit {
  private peliculasService = inject(PeliculasService);
  private salasService = inject(SalasService);
  private funcionesService = inject(FuncionesService);
  private auth = inject(Auth);

  peliculas = signal<Pelicula[]>([]);
  salas = signal<Sala[]>([]);
  funciones = signal<Funcion[]>([]);

  cargando = signal(true);
  guardando = signal(false);
  error = signal<string | null>(null);

  form = new FormGroup({
    pelicula_id: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    fecha: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    hora: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    formato: new FormControl<'2D' | '3D' | '4D' | '5D'>('2D', { nonNullable: true }),
    idioma: new FormControl<'castellano' | 'subtitulada'>('castellano', { nonNullable: true }),
    precio_normal: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(1)],
    }),
    precio_vip: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(1)],
    }),
  });

  async ngOnInit() {
    await this.cargarTodo();
  }

  async cargarTodo() {
    this.cargando.set(true);
    this.error.set(null);
    try {
      // Una consulta atrás de la otra, no todas juntas: más simple de leer.
      const peliculas = await this.peliculasService.listarTodas();
      const salas = await this.salasService.listar();
      const funciones = await this.funcionesService.listar();

      this.peliculas.set(peliculas);
      this.salas.set(salas);
      this.funciones.set(funciones);
    } catch {
      this.error.set('No se pudo cargar la información.');
    } finally {
      this.cargando.set(false);
    }
  }

  // Para mostrar nombres en la tabla sin pedirle un join a Supabase:
  // se buscan en los arrays que ya están cargados en memoria.
  nombrePelicula(id: string): string {
    return this.peliculas().find((p) => p.id === id)?.nombre ?? '(película eliminada)';
  }

  nombreSala(id: number): string {
    return this.salas().find((s) => s.id === id)?.nombre ?? '(sala eliminada)';
  }

  async crear() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const valores = this.form.getRawValue();
    const pelicula = this.peliculas().find((p) => p.id === valores.pelicula_id);
    if (!pelicula) {
      this.error.set('Elegí una película válida.');
      return;
    }

    const datos: DatosFuncion = {
      pelicula_id: valores.pelicula_id,
      inicio: `${valores.fecha}T${valores.hora}`,
      formato: valores.formato,
      idioma: valores.idioma,
      precio_normal: Number(valores.precio_normal),
      precio_vip: Number(valores.precio_vip),
      creadoPor: this.auth.perfil()?.id,
    };

    this.guardando.set(true);
    this.error.set(null);
    try {
      await this.funcionesService.crear(datos, pelicula.duracion_minutos);
      this.form.reset({
        pelicula_id: '',
        fecha: '',
        hora: '',
        formato: '2D',
        idioma: 'castellano',
        precio_normal: null,
        precio_vip: null,
      });
      await this.cargarTodo();
    } catch (error) {
      const esSinSala = error instanceof Error && error.message === SIN_SALA_DISPONIBLE;
      this.error.set(
        esSinSala
          ? 'No hay ninguna sala libre en ese horario. Probá otra fecha u hora.'
          : 'No se pudo crear la función.'
      );
    } finally {
      this.guardando.set(false);
    }
  }

  async eliminar(funcion: Funcion) {
    if (!confirm('¿Eliminar esta función?')) return;

    try {
      await this.funcionesService.eliminar(funcion.id);
      await this.cargarTodo();
    } catch {
      this.error.set('No se pudo eliminar la función.');
    }
  }
}