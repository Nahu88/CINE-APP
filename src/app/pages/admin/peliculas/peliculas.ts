import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Pelicula } from '../../../models/pelicula.model';
import { DuracionPipe } from '../../../pipes/duracion.pipe';
import { ActividadService } from '../../../services/actividad';
import { Genero, GenerosService } from '../../../services/generos';
import { DatosPelicula, PeliculasService } from '../../../services/peliculas';
import { aFechaIso, MESES, numeros } from '../../../utils/fechas';
import { fechaOpcionalValidator } from '../../../validators/fecha.validators';

@Component({
  imports: [ReactiveFormsModule, DuracionPipe, RouterLink],
  selector: 'app-peliculas',
  styleUrl: './peliculas.css',
  templateUrl: './peliculas.html',
})
export class Peliculas implements OnInit {
  private peliculasService = inject(PeliculasService);
  private generosService = inject(GenerosService);
  private actividad = inject(ActividadService);

  peliculas = signal<Pelicula[]>([]);
  generos = signal<Genero[]>([]);

  // Los géneros tildados en el formulario.
  generosElegidos = signal<string[]>([]);

  // Los del catálogo más los que tenga la película y ya no estén en el catálogo.
  opcionesGeneros = computed(() => {
    const nombres: string[] = [];
    for (const genero of this.generos()) nombres.push(genero.nombre);
    for (const elegido of this.generosElegidos()) {
      if (!nombres.includes(elegido)) nombres.push(elegido);
    }
    return nombres;
  });

  // Opciones de la fecha de estreno (RNF-07: sin calendario del navegador).
  readonly meses = MESES;
  readonly dias = numeros(1, 31);
  readonly anios = numeros(new Date().getFullYear() - 5, new Date().getFullYear() + 2);
  cargando = signal(true);
  guardando = signal(false);
  error = signal<string | null>(null);

  // null = está creando una nueva y con valor = está editando esa película.
  editandoId = signal<string | null>(null);

  form = new FormGroup({
    nombre: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    sinopsis: new FormControl('', { nonNullable: true }),
    imagen_url: new FormControl('', { nonNullable: true }),
    duracion_minutos: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(1)],
    }),
    restriccion_edad: new FormControl<string>('sin_restriccion', { nonNullable: true }),
    // Vacía = ya está en cartelera. Tres campos en vez del calendario del navegador.
    fecha_estreno: new FormGroup(
      {
        dia: new FormControl('', { nonNullable: true }),
        mes: new FormControl('', { nonNullable: true }),
        anio: new FormControl('', { nonNullable: true }),
      },
      { validators: [fechaOpcionalValidator()] }
    ),
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
      this.generos.set(await this.generosService.listar());
    } catch (error) {
      console.error('No se pudo cargar el listado:', error);
      this.error.set('No se pudo cargar el listado. Probá recargar la página.');
    } finally {
      this.cargando.set(false);
    }
  }

  alternarGenero(nombre: string) {
    this.generosElegidos.update((lista) =>
      lista.includes(nombre) ? lista.filter((g) => g !== nombre) : [...lista, nombre]
    );
  }

  editar(pelicula: Pelicula) {
    this.editandoId.set(pelicula.id);
    this.generosElegidos.set(pelicula.generos);

    // '2026-03-09' -> dia 9, mes 3, año 2026
    const partes = pelicula.fecha_estreno ? pelicula.fecha_estreno.split('-') : ['', '', ''];
    this.form.setValue({
      nombre: pelicula.nombre,
      sinopsis: pelicula.sinopsis ?? '',
      imagen_url: pelicula.imagen_url ?? '',
      duracion_minutos: pelicula.duracion_minutos,
      restriccion_edad: pelicula.restriccion_edad ? String(pelicula.restriccion_edad) : 'sin_restriccion',
      fecha_estreno: {
        dia: partes[2] ? String(Number(partes[2])) : '',
        mes: partes[1] ? String(Number(partes[1])) : '',
        anio: partes[0],
      },
      destacada: pelicula.destacada,
      activa: pelicula.activa,
    });
  }

  cancelarEdicion() {
    this.editandoId.set(null);
    this.generosElegidos.set([]);
    this.form.reset({
      nombre: '',
      sinopsis: '',
      imagen_url: '',
      duracion_minutos: null,
      restriccion_edad: 'sin_restriccion',
      fecha_estreno: { dia: '', mes: '', anio: '' },
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
    const estreno = valores.fecha_estreno;
    const datos: DatosPelicula = {
      // trim para los espacios en nombres
      nombre: valores.nombre.trim(),
      sinopsis: valores.sinopsis.trim(),
      imagen_url: valores.imagen_url.trim(),
      duracion_minutos: Number(valores.duracion_minutos),
      restriccion_edad: valores.restriccion_edad === 'sin_restriccion' ? null : Number(valores.restriccion_edad),
      fecha_estreno: estreno.dia ? aFechaIso(estreno.dia, estreno.mes, estreno.anio) : null,
      destacada: valores.destacada,
      activa: valores.activa,
      generos: this.generosElegidos(),
    };

    try {
      const id = this.editandoId();
      if (id) {
        await this.peliculasService.actualizar(id, datos);
        await this.actividad.registrar('editar_pelicula', 'peliculas', id, datos.nombre);
      } else {
        await this.peliculasService.crear(datos);
        await this.actividad.registrar('crear_pelicula', 'peliculas', null, datos.nombre);
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
      await this.actividad.registrar('eliminar_pelicula', 'peliculas', pelicula.id, pelicula.nombre);
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
