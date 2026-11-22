import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CandyBar } from '../../componentes/candy-bar/candy-bar';
import { MapaButacas } from '../../componentes/mapa-butacas/mapa-butacas';
import { ItemCarrito } from '../../models/candy.model';
import { Cupon, Recompensa } from '../../models/fidelizacion.model';
import { Funcion } from '../../models/funcion.model';
import { Pelicula } from '../../models/pelicula.model';
import { Butaca } from '../../models/sala.model';
import { Auth } from '../../services/auth';
import { ComprasService } from '../../services/compra';
import { FidelizacionService } from '../../services/fidelizacion';
import { FuncionesService } from '../../services/funciones';
import { PeliculasService } from '../../services/peliculas';
import { SalasService } from '../../services/salas';
import { aFechaIso, edadDe, MESES } from '../../utils/fechas';
import { fechaNacimientoValidator } from '../../validators/registro.validators';

@Component({
  imports: [RouterLink, DatePipe, ReactiveFormsModule, MapaButacas, CandyBar],
  selector: 'app-compra',
  styleUrl: './compra.css',
  templateUrl: './compra.html',
})
export class Compra implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  protected auth = inject(Auth);
  private comprasService = inject(ComprasService);
  private funcionesService = inject(FuncionesService);
  private peliculasService = inject(PeliculasService);
  private salasService = inject(SalasService);
  private fidelizacion = inject(FidelizacionService);

  funcion = signal<Funcion | null>(null);
  pelicula = signal<Pelicula | null>(null);
  salaNombre = signal('');
  butacas = signal<Butaca[]>([]);
  ocupadas = signal<number[]>([]);
  seleccionadas = signal<Butaca[]>([]);

  carrito = signal<ItemCarrito[]>([]);

  cupones = signal<Cupon[]>([]);
  recompensas = signal<Recompensa[]>([]);
  puntos = signal(0);
  creditoDisponible = signal(0);
  recompensaElegida = signal<Recompensa | null>(null);
  usarCredito = signal(false);

  cargando = signal(true);
  confirmando = signal(false);
  error = signal<string | null>(null);
  exito = signal(false);

  readonly meses = MESES;

  // Fecha de nacimiento del que compra sin cuenta, para controlar la edad.
  formInvitado = new FormGroup(
    {
      dia: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      mes: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      anio: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^\d{4}$/)] }),
    },
    { validators: [fechaNacimientoValidator()] }
  );

  idsSeleccionados = computed(() => this.seleccionadas().map((b) => b.id));

  hayVip = computed(() => this.seleccionadas().filter((b) => b.tipo === 'vip').length > 0);

  aLaVenta = computed(() => {
    const funcion = this.funcion();
    const pelicula = this.pelicula();
    if (!funcion || !pelicula) return false;
    return this.comprasService.estaALaVenta(funcion, pelicula);
  });

  enPreventa = computed(() => {
    const funcion = this.funcion();
    const pelicula = this.pelicula();
    if (!funcion || !pelicula) return false;
    return this.comprasService.estaEnPreventa(funcion, pelicula);
  });

  subtotal = computed(() => {
    let total = 0;
    for (const butaca of this.seleccionadas()) total += this.precioDe(butaca);
    for (const item of this.carrito()) total += item.precio * item.cantidad;
    return total;
  });

  // Entrada gratis: descuenta la butaca más barata.
  descuentoCanje = computed(() => {
    const recompensa = this.recompensaElegida();
    if (!recompensa || recompensa.producto_id || this.seleccionadas().length === 0) return 0;

    let masBarata = this.precioDe(this.seleccionadas()[0]);
    for (const butaca of this.seleccionadas()) {
      if (this.precioDe(butaca) < masBarata) masBarata = this.precioDe(butaca);
    }
    return masBarata;
  });

  // Un solo cupón: el de mayor porcentaje.
  cuponAplicado = computed(() => {
    let mejor: Cupon | null = null;
    for (const cupon of this.cupones()) {
      if (!mejor || cupon.porcentaje > mejor.porcentaje) mejor = cupon;
    }
    return mejor;
  });

  descuentoCupon = computed(() => {
    const cupon = this.cuponAplicado();
    if (!cupon) return 0;
    return Math.round(((this.subtotal() - this.descuentoCanje()) * cupon.porcentaje) / 100);
  });

  descuento = computed(() => this.descuentoCanje() + this.descuentoCupon());

  creditoUsado = computed(() => {
    if (!this.usarCredito()) return 0;
    const falta = this.subtotal() - this.descuento();
    if (this.creditoDisponible() < falta) return this.creditoDisponible();
    return falta;
  });

  total = computed(() => this.subtotal() - this.descuento() - this.creditoUsado());

  async ngOnInit() {
    const funcionId = this.route.snapshot.paramMap.get('funcionId');
    try {
      // La ruta no tiene guard, así que el perfil puede no estar cargado.
      if (!this.auth.perfil()) await this.auth.cargarPerfil();

      const funciones = await this.funcionesService.listar();
      const funcion = funciones.find((f) => f.id === funcionId) ?? null;
      if (!funcion) {
        this.error.set('Función no encontrada.');
        return;
      }
      if (funcion.cancelada) {
        this.error.set('Esta función fue cancelada. Elegí otra función de la película.');
        return;
      }
      this.funcion.set(funcion);

      const peliculas = await this.peliculasService.listarTodas();
      this.pelicula.set(peliculas.find((p) => p.id === funcion.pelicula_id) ?? null);

      const salas = await this.salasService.listar();
      this.salaNombre.set(salas.find((s) => s.id === funcion.sala_id)?.nombre ?? '');

      this.butacas.set(await this.comprasService.listarButacas(funcion.sala_id));
      this.ocupadas.set(await this.comprasService.listarOcupadas(funcion.id));

      await this.cargarBeneficios();

      this.comprasService.escucharEntradas(() => this.actualizarOcupadas());
    } catch {
      this.error.set('No se pudo cargar la función.');
    } finally {
      this.cargando.set(false);
    }
  }

  ngOnDestroy() {
    this.comprasService.dejarDeEscuchar();
  }

  private async cargarBeneficios() {
    const perfil = this.auth.perfil();
    if (!perfil || perfil.invitado) return;

    const cupones = await this.fidelizacion.listarCupones();
    const bienvenida = cupones.find((c) => c.tipo === 'bienvenida');
    const yaUso = bienvenida ? await this.fidelizacion.yaUsoCupon(perfil.id, bienvenida.id) : true;
    this.cupones.set(this.fidelizacion.cuponesPara(perfil, cupones, yaUso));

    const recompensas = await this.fidelizacion.listarRecompensas();
    this.recompensas.set(recompensas.filter((r) => r.activa));
    this.puntos.set(await this.fidelizacion.saldoPuntos(perfil.id));
    this.creditoDisponible.set(await this.fidelizacion.saldoCredito(perfil.id));
  }

  private async actualizarOcupadas() {
    const funcion = this.funcion();
    if (!funcion) return;

    const ocupadas = await this.comprasService.listarOcupadas(funcion.id);
    this.ocupadas.set(ocupadas);
    this.seleccionadas.update((actual) => actual.filter((b) => !ocupadas.includes(b.id)));
  }

  precioDe(butaca: Butaca): number {
    const funcion = this.funcion();
    const pelicula = this.pelicula();
    if (!funcion || !pelicula) return 0;
    return this.comprasService.precioDe(funcion, butaca, pelicula);
  }

  alternarButaca(butaca: Butaca) {
    this.exito.set(false);
    this.seleccionadas.update((actual) =>
      actual.find((b) => b.id === butaca.id)
        ? actual.filter((b) => b.id !== butaca.id)
        : [...actual, butaca]
    );
  }

  elegirRecompensa(recompensa: Recompensa) {
    this.recompensaElegida.update((actual) => (actual?.id === recompensa.id ? null : recompensa));
  }

  tieneErrorInvitado(error: string): boolean {
    return this.formInvitado.touched && this.formInvitado.hasError(error);
  }

  async confirmar() {
    const funcion = this.funcion();
    const pelicula = this.pelicula();
    if (!funcion || !pelicula) return;

    if (!this.seleccionadas().length) {
      this.error.set('Elegí al menos una butaca.');
      return;
    }

    let perfil = this.auth.perfil();
    let fechaNacimiento = perfil?.fecha_nacimiento ?? '';
    if (!perfil) {
      if (this.formInvitado.invalid) {
        this.formInvitado.markAllAsTouched();
        this.error.set('Completá tu fecha de nacimiento para comprar sin cuenta.');
        return;
      }
      const valores = this.formInvitado.getRawValue();
      fechaNacimiento = aFechaIso(valores.dia, valores.mes, valores.anio);
    }

    // La edad se controla antes de guardar nada.
    if (pelicula.restriccion_edad && edadDe(fechaNacimiento) < pelicula.restriccion_edad) {
      this.error.set(`Esta película es para mayores de ${pelicula.restriccion_edad} años.`);
      return;
    }

    this.confirmando.set(true);
    this.error.set(null);
    try {
      if (!perfil) {
        const { error } = await this.auth.ingresarComoInvitado(fechaNacimiento);
        perfil = this.auth.perfil();
        if (error || !perfil) {
          this.error.set('No se pudo iniciar la compra sin cuenta. Probá de nuevo o creá una cuenta.');
          return;
        }
      }

      await this.comprasService.confirmar({
        usuarioId: perfil.id,
        esInvitado: perfil.invitado,
        funcion: funcion,
        pelicula: pelicula,
        butacas: this.seleccionadas(),
        candy: this.carrito(),
        cupon: this.cuponAplicado(),
        recompensa: this.recompensaElegida(),
        subtotal: this.subtotal(),
        descuento: this.descuento(),
        creditoUsado: this.creditoUsado(),
        total: this.total(),
      });

      this.seleccionadas.set([]);
      this.carrito.set([]);
      this.recompensaElegida.set(null);
      this.usarCredito.set(false);
      this.exito.set(true);
      await this.cargarBeneficios();
    } catch (error) {
      // 23505: otra persona compró una de esas butacas.
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
}
