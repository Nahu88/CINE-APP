import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Pelicula } from '../../../models/pelicula.model';
import { Sala } from '../../../models/sala.model';
import { Funcion } from '../../../models/funcion.model';
import { EsperaPorFuncion } from '../../../models/lista-espera.model';
import { ActividadService } from '../../../services/actividad';
import { Auth } from '../../../services/auth';
import { DatosFuncion, FuncionesService, SIN_SALA_DISPONIBLE } from '../../../services/funciones';
import { ListaEsperaService } from '../../../services/lista-espera';
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
  private listaEspera = inject(ListaEsperaService);

  peliculas = signal<Pelicula[]>([]);
  salas = signal<Sala[]>([]);
  funciones = signal<Funcion[]>([]);
  espera = signal<EsperaPorFuncion[]>([]);

  cargando = signal(true);
  guardando = signal(false);
  error = signal<string | null>(null);
  resultado = signal<string | null>(null);

  // Días en que se repite la función (vacío = solo la fecha elegida).
  diasElegidos = signal<number[]>([]);

  // Sin calendario del navegador (RNF-07).
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
      const peliculas = await this.peliculasService.listarTodas();
      const salas = await this.salasService.listar();
      const funciones = await this.funcionesService.listar();

      this.peliculas.set(peliculas);
      this.salas.set(salas);
      this.funciones.set(funciones);
      this.espera.set(await this.listaEspera.porFuncion());
    } catch {
      this.error.set('No se pudo cargar la información.');
    } finally {
      this.cargando.set(false);
    }
  }

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

  // Una fecha por cada día elegido dentro de las semanas pedidas.
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

    // La VIP siempre cuesta más que la normal.
    if (Number(valores.precio_vip) <= Number(valores.precio_normal)) {
      this.error.set('El precio VIP tiene que ser mayor que el precio normal.');
      return;
    }

    // La preventa arranca 7 días antes del estreno.
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

  async cancelarFuncion(funcion: Funcion) {
    const descripcion = this.nombrePelicula(funcion.pelicula_id) + ', ' + new Date(funcion.inicio).toLocaleString('es-AR');
    const confirmado = confirm(
      `¿Cancelar la función de ${descripcion}? A cada comprador se le acredita todo lo que pagó y recibe un aviso. No se puede deshacer.`
    );
    if (!confirmado) return;

    this.error.set(null);
    this.resultado.set(null);
    try {
      const afectadas = await this.funcionesService.cancelar(funcion.id);
      await this.actividad.registrar('cancelar_funcion', 'funciones', funcion.id, descripcion + ' (' + afectadas + ' compras acreditadas)');
      this.resultado.set(
        afectadas === 0
          ? 'Función cancelada. No tenía entradas vendidas.'
          : `Función cancelada. Se acreditó el total a ${afectadas} ${afectadas === 1 ? 'compra' : 'compras'} y se avisó a cada comprador.`
      );
      await this.cargarTodo();
    } catch (error) {
      console.error('No se pudo cancelar la función:', error);
      // Si falla, la transacción se deshace entera: nadie queda acreditado a medias.
      this.error.set('No se pudo cancelar la función. No se acreditó a nadie; probá de nuevo.');
    }
  }

  // Los que esperan en la fila más los que tienen el turno en curso.
  enEspera(funcion: Funcion): number {
    const fila = this.espera().find((e) => e.funcion_id === funcion.id);
    return fila ? fila.en_espera + fila.con_turno : 0;
  }

  sePuedeCancelar(funcion: Funcion): boolean {
    return !funcion.cancelada && new Date(funcion.inicio) > new Date();
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
