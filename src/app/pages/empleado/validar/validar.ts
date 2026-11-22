import { Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Html5Qrcode } from 'html5-qrcode';
import { OrdenItem } from '../../../models/candy.model';
import { EntradaDetalle } from '../../../models/entrada.model';
import { ActividadService } from '../../../services/actividad';
import { Auth } from '../../../services/auth';
import { CandyService } from '../../../services/candy';
import { EntradasService } from '../../../services/entradas';
import { codigoEntradaValidator } from '../../../validators/entrada.validators';

@Component({
  imports: [ReactiveFormsModule, DatePipe],
  selector: 'app-validar',
  styleUrl: './validar.css',
  templateUrl: './validar.html',
})
export class Validar implements OnDestroy {
  private auth = inject(Auth);
  private entradasService = inject(EntradasService);
  private candyService = inject(CandyService);
  private actividad = inject(ActividadService);

  form = new FormGroup({
    codigo: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, codigoEntradaValidator()],
    }),
  });

  detalle = signal<EntradaDetalle | null>(null);
  itemsCandy = signal<OrdenItem[]>([]);
  buscando = signal(false);
  error = signal<string | null>(null);
  exito = signal<string | null>(null);

  // html5-qrcode dibuja el video dentro del div #lector.
  leyendo = signal(false);
  private lector: Html5Qrcode | null = null;

  esValida = computed(() => this.detalle()?.entrada.estado === 'valida');
  candyPendiente = computed(() => this.itemsCandy().filter((i) => !i.entregado).length > 0);
  candyEntregadoEl = computed(() => this.itemsCandy().find((i) => i.entregado)?.entregado_at ?? null);

  tieneError(error: string): boolean {
    const control = this.form.controls.codigo;
    return control.touched && control.hasError(error);
  }

  async buscar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.exito.set(null);
    await this.cargarEntrada(this.form.getRawValue().codigo.trim());
  }

  private async cargarEntrada(codigo: string) {
    this.buscando.set(true);
    this.error.set(null);
    this.detalle.set(null);
    this.itemsCandy.set([]);
    try {
      const entrada = await this.entradasService.buscarPorCodigo(codigo);

      if (!entrada) {
        this.error.set('No existe ninguna entrada con ese código.');
        return;
      }

      const detalles = await this.entradasService.armarDetalles([entrada]);
      this.detalle.set(detalles[0]);
      this.itemsCandy.set(await this.candyService.listarItemsDeOrden(entrada.orden_id));
    } catch {
      this.error.set('No se pudo buscar la entrada.');
    } finally {
      this.buscando.set(false);
    }
  }

  async marcarUsada() {
    const detalle = this.detalle();
    const perfil = this.auth.perfil();
    if (!detalle || !perfil) return;

    try {
      await this.entradasService.marcarUsada(detalle.entrada.id, perfil.id);
      await this.actividad.registrar('validar_qr', 'entradas', detalle.entrada.id, detalle.pelicula + ', ' + detalle.butaca);
      this.exito.set('Ingreso registrado: ' + detalle.pelicula + '. ' + detalle.butaca + '.');
      await this.cargarEntrada(detalle.entrada.codigo_qr);
    } catch {
      this.error.set('No se pudo marcar la entrada como usada.');
    }
  }

  async entregarCandy() {
    const detalle = this.detalle();
    const perfil = this.auth.perfil();
    if (!detalle || !perfil) return;

    try {
      await this.candyService.marcarEntregados(detalle.entrada.orden_id, perfil.id);
      await this.actividad.registrar('entregar_candy', 'orden_items', detalle.entrada.orden_id, detalle.candy.join(', '));
      this.exito.set('Candy entregado: ' + detalle.candy.join(', ') + '.');
      await this.cargarEntrada(detalle.entrada.codigo_qr);
    } catch {
      this.error.set('No se pudo marcar el candy como entregado.');
    }
  }

  limpiar() {
    this.detalle.set(null);
    this.itemsCandy.set([]);
    this.exito.set(null);
    this.error.set(null);
    this.form.reset({ codigo: '' });
  }

  async abrirCamara() {
    this.error.set(null);
    this.leyendo.set(true);
    try {
      this.lector = new Html5Qrcode('lector');
      // 'environment' = cámara trasera del celular.
      await this.lector.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 220 },
        (textoLeido) => this.alLeer(textoLeido),
        () => {} // cuadros sin QR: se ignoran
      );
    } catch {
      this.leyendo.set(false);
      this.lector = null;
      this.error.set('No se pudo abrir la cámara. Ingresá el código a mano.');
    }
  }

  private async alLeer(texto: string) {
    await this.cerrarCamara();
    this.form.setValue({ codigo: texto });
    await this.buscar();
  }

  async cerrarCamara() {
    if (this.lector) {
      await this.lector.stop();
      this.lector = null;
    }
    this.leyendo.set(false);
  }

  ngOnDestroy() {
    this.cerrarCamara();
  }
}
