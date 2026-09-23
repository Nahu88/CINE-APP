import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Pelicula } from '../../../models/pelicula.model';
import { DuracionPipe } from '../../../pipes/duracion.pipe';
import { DatosPelicula, PeliculasService } from '../../../services/peliculas';

@Component({
  imports: [ReactiveFormsModule, DuracionPipe],
  selector: 'app-peliculas',
  styleUrl: './peliculas.css',
  templateUrl: './peliculas.html',
})
export class Peliculas implements OnInit {
  private peliculasService = inject(PeliculasService);

  peliculas = signal<Pelicula[]>([]);
  cargando = signal(true);
  guardando = signal(false);
  error = signal<string | null>(null);

  // null = está creando una nueva; con valor = está editando esa película.
  editandoId = signal<string | null>(null);

  form = new FormGroup({
    nombre: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    sinopsis: new FormControl('', { nonNullable: true }),
    imagen_url: new FormControl('', { nonNullable: true }),
    duracion_minutos: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(1)],
    }),
    restriccion_edad: new FormControl<string>('sin_restriccion', { nonNullable: true }),
    fecha_estreno: new FormControl('', { nonNullable: true }), // vacío = ya está en cartelera
    generos: new FormControl('', { nonNullable: true }), // "Acción, Drama"
    destacada: new FormControl(false, { nonNullable: true }),
    activa: new FormControl(true, { nonNullable: true }),
  });

  async ngOnInit() {
    await this.cargarPeliculas();
  }

  // Muestra el error solo si el usuario ya pasó por el campo
  tieneError(campo: string, error: string): boolean {
    const control = this.form.get(campo);
    return !!control && control.touched && control.hasError(error);
  }

  async cargarPeliculas() {
    this.cargando.set(true);
    this.error.set(null);
    try {
      this.peliculas.set(await this.peliculasService.listarTodas());
    } catch (error) {
      console.error('No se pudo cargar el listado:', error);
      this.error.set('No se pudo cargar el listado. Probá recargar la página.');
    } finally {
      this.cargando.set(false);
    }
  }

  editar(pelicula: Pelicula) {
    this.editandoId.set(pelicula.id);
    this.form.setValue({
      nombre: pelicula.nombre,
      sinopsis: pelicula.sinopsis ?? '',
      imagen_url: pelicula.imagen_url ?? '',
      duracion_minutos: pelicula.duracion_minutos,
      restriccion_edad: pelicula.restriccion_edad ? String(pelicula.restriccion_edad) : 'sin_restriccion',
      fecha_estreno: pelicula.fecha_estreno ?? '',
      generos: pelicula.generos.join(', '),
      destacada: pelicula.destacada,
      activa: pelicula.activa,
    });
  }

  cancelarEdicion() {
    this.editandoId.set(null);
    this.form.reset({
      nombre: '',
      sinopsis: '',
      imagen_url: '',
      duracion_minutos: null,
      restriccion_edad: 'sin_restriccion',
      fecha_estreno: '',
      generos: '',
      destacada: false,
      activa: true,
    });
  }

  async guardar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    this.error.set(null);

    const valores = this.form.getRawValue();
    const datos: DatosPelicula = {
      // trim para los espacios en nombres
      nombre: valores.nombre.trim(),
      sinopsis: valores.sinopsis.trim(),
      imagen_url: valores.imagen_url.trim(),
      duracion_minutos: Number(valores.duracion_minutos),
      restriccion_edad: valores.restriccion_edad === 'sin_restriccion' ? null : Number(valores.restriccion_edad),
      fecha_estreno: valores.fecha_estreno || null,
      destacada: valores.destacada,
      activa: valores.activa,
      // "Acción, Drama" -> ["Acción", "Drama"], sacando espacios y vacíos.
      generos: valores.generos
        .split(',')
        .map((g) => g.trim())
        .filter(Boolean),
    };

    try {
      const id = this.editandoId();
      if (id) {
        await this.peliculasService.actualizar(id, datos);
      } else {
        await this.peliculasService.crear(datos);
      }
      this.cancelarEdicion();
      await this.cargarPeliculas();
    } catch (error) {
      console.error('No se pudo guardar la película:', error);
      this.error.set('No se pudo guardar la película. Revisá los datos e intentá de nuevo.');
    } finally {
      this.guardando.set(false);
    }
  }

  // Baja lógica: sacar una película de la cartelera sin borrarla.
  async alternarVisibilidad(pelicula: Pelicula) {
    this.error.set(null);
    try {
      await this.peliculasService.cambiarVisibilidad(pelicula.id, !pelicula.activa);
      await this.cargarPeliculas();
    } catch (error) {
      console.error('No se pudo cambiar la visibilidad:', error);
      this.error.set('No se pudo cambiar la visibilidad de la película.');
    }
  }

  async eliminar(pelicula: Pelicula) {
    const confirmado = confirm(
      `¿Eliminar "${pelicula.nombre}" para siempre? Si solo querés sacarla de la cartelera, usá "Ocultar".`
    );
    if (!confirmado) return;

    this.error.set(null);
    try {
      await this.peliculasService.eliminar(pelicula.id);
      await this.cargarPeliculas();
    } catch (error) {
      console.error('No se pudo eliminar la película:', error);

      // 23503 = la base rechaza el borrado porque hay funciones que apuntan a esta película.
      const codigo = (error as { code?: string }).code;
      this.error.set(
        codigo === '23503'
          ? 'No se puede eliminar: la película ya tiene funciones cargadas. Ocultala en su lugar.'
          : 'No se pudo eliminar la película.'
      );
    }
  }
}
