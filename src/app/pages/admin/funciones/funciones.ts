import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Pelicula } from '../../../models/pelicula.model';
import { Sala } from '../../../models/sala.model';
import { Funcion } from '../../../models/funcion.model';
import { ActividadService } from '../../../services/actividad';
import { Auth } from '../../../services/auth';
import { DatosFuncion, FuncionesService, SIN_SALA_DISPONIBLE } from '../../../services/funciones';
import { PeliculasService } from '../../../services/peliculas';
import { SalasService } from '../../../services/salas';
import { DIAS_SEMANA, dosDigitos, MESES, numeros } from '../../../utils/fechas';
import { fechaFuturaValidator } from '../../../validators/fecha.validators';

@Component({
  imports: [ReactiveFormsModule, DatePipe, RouterLink],
  selector: 'app-funciones',
  styleUrl: './funciones.css',
  templateUrl: './funciones.html',
})
export class Funciones implements OnInit {
  private peliculasService = inject(PeliculasService);
  private salasService = inject(SalasService);
  private funcionesService = inject(FuncionesService);
  private actividad = inject(ActividadService);
  private auth = inject(Auth);

  peliculas = signal<Pelicula[]>([]);
  salas = signal<Sala[]>([]);
  funciones = signal<Funcion[]>([]);

  cargando = signal(true);
  guardando = signal(false);
  error = signal<string | null>(null);
  resultado = signal<string | null>(null);

  // RF-24: días de la semana en que se repite la función (vacío = solo la fecha elegida).
  diasElegidos = signal<number[]>([]);

  // Opciones de los <select> de fecha y hora (RNF-07: sin calendario del navegador).
  readonly meses = MESES;
  readonly diasSemana = DIAS_SEMANA;
  readonly dias = numeros(1, 31);
  readonly anios = numeros(new Date().getFullYear(), new Date().getFullYear() + 1);
  readonly horas = numeros(8, 23);
  readonly minutos = [0, 15, 30, 45];
  readonly dosDigitos = dosDigitos;

  form = new FormGroup({
    pelicula_id: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    fecha: new FormGroup(
      {
        dia: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
        mes: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
        anio: new FormControl(String(new Date().getFullYear()), { nonNullable: true, validators: [Validators.required] }),
      },
      { validators: [fechaFuturaValidator()] }
    ),
    hora: new FormControl('20', { nonNullable: true }),
    minutos: new FormControl('0', { nonNullable: true }),
    semanas: new FormControl('1', { nonNullable: true }),
    formato: new FormControl<'2D' | '3D' | '4D' | '5D'>('2D', { nonNullable: true }),
    idioma: new FormControl<'castellano' | 'subtitulada'>('castellano', { nonNullable: true }),
    precio_normal: new FormControl<number | null>(null, { validators: [Validators.required, Validators.min(1)] }),
    precio_vip: new FormControl<number | null>(null, { validators: [Validators.required, Validators.min(1)] }),
    con_preventa: new FormControl(false, { nonNullable: true }),
    precio_preventa: new FormControl<number | null>(null),
  });

  // La preventa solo tiene sentido si la película se estrena en el futuro.
  peliculaElegida = signal<Pelicula | null>(null);
  admitePreventa = computed(() => {
    const pelicula = this.peliculaElegida();
    if (!pelicula?.fecha_estreno) return false;
    return new Date(pelicula.fecha_estreno + 'T00:00:00') > new Date();
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

  elegirPelicula(evento: Event) {
    const id = (evento.target as HTMLSelectElement).value;
    this.peliculaElegida.set(this.peliculas().find((p) => p.id === id) ?? null);
  }

  alternarDia(numero: number) {
    this.diasElegidos.update((dias) => (dias.includes(numero) ? dias.filter((d) => d !== numero) : [...dias, numero]));
  }

  tieneError(campo: string, error: string): boolean {
    const control = this.form.get(campo);
    return !!control && control.touched && control.hasError(error);
  }

  // Todas las fechas en que hay que crear la función. Sin días elegidos es
  // solo la fecha del formulario; con días, se recorren las semanas pedidas
  // día por día y se guardan los que coinciden.
  private fechasACrear(): Date[] {
    const valores = this.form.getRawValue();
    const primera = new Date(
      Number(valores.fecha.anio),
      Number(valores.fecha.mes) - 1,
      Number(valores.fecha.dia),
      Number(valores.hora),
      Number(valores.minutos)
    );

    const elegidos = this.diasElegidos();
    if (elegidos.length === 0) {
      return [primera];
    }

    const fechas: Date[] = [];
    const totalDias = Number(valores.semanas) * 7;
    for (let i = 0; i < totalDias; i++) {
      const fecha = new Date(primera);
      fecha.setDate(primera.getDate() + i);
      if (elegidos.includes(fecha.getDay())) {
        fechas.push(fecha);
      }
    }
    return fechas;
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

    // RN-11: la butaca VIP siempre cuesta más que la normal.
    if (Number(valores.precio_vip) <= Number(valores.precio_normal)) {
      this.error.set('El precio VIP tiene que ser mayor que el precio normal.');
      return;
    }

    // RF-53: la preventa arranca 7 días antes del estreno.
    let preventaDesde: string | null = null;
    let precioPreventa: number | null = null;
    if (valores.con_preventa && this.admitePreventa()) {
      if (!valores.precio_preventa || valores.precio_preventa <= 0) {
        this.error.set('Ingresá el precio de preventa.');
        return;
      }
      const desde = new Date(pelicula.fecha_estreno + 'T00:00:00');
      desde.setDate(desde.getDate() - 7);
      preventaDesde = desde.toISOString();
      precioPreventa = Number(valores.precio_preventa);
    }

    this.guardando.set(true);
    this.error.set(null);
    this.resultado.set(null);

    let creadas = 0;
    const sinSala: string[] = [];

    for (const fecha of this.fechasACrear()) {
      const datos: DatosFuncion = {
        pelicula_id: valores.pelicula_id,
        inicio: fecha.toISOString(),
        formato: valores.formato,
        idioma: valores.idioma,
        precio_normal: Number(valores.precio_normal),
        precio_vip: Number(valores.precio_vip),
        precio_preventa: precioPreventa,
        preventa_desde: preventaDesde,
        creadoPor: this.auth.perfil()?.id,
      };

      try {
        const id = await this.funcionesService.crear(datos, pelicula.duracion_minutos);
        await this.actividad.registrar('crear_funcion', 'funciones', id, pelicula.nombre + ', ' + fecha.toLocaleString('es-AR'));
        creadas++;
      } catch (error) {
        const esSinSala = error instanceof Error && error.message === SIN_SALA_DISPONIBLE;
        if (esSinSala) {
          sinSala.push(fecha.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }));
        } else {
          this.error.set('No se pudo crear la función del ' + fecha.toLocaleDateString('es-AR') + '.');
        }
      }
    }

    let mensaje = creadas === 1 ? 'Se creó 1 función.' : 'Se crearon ' + creadas + ' funciones.';
    if (sinSala.length) {
      mensaje += ' No había sala libre para: ' + sinSala.join(', ') + '.';
    }
    this.resultado.set(mensaje);

    if (creadas > 0) {
      this.diasElegidos.set([]);
      this.form.patchValue({ semanas: '1', con_preventa: false, precio_preventa: null });
    }
    await this.cargarTodo();
    this.guardando.set(false);
  }

  async eliminar(funcion: Funcion) {
    if (!confirm('¿Eliminar esta función?')) return;

    try {
      await this.funcionesService.eliminar(funcion.id);
      await this.actividad.registrar('eliminar_funcion', 'funciones', funcion.id, this.nombrePelicula(funcion.pelicula_id) + ', ' + new Date(funcion.inicio).toLocaleString('es-AR'));
      await this.cargarTodo();
    } catch {
      this.error.set('No se pudo eliminar la función. Puede que ya tenga entradas vendidas.');
    }
  }
}
