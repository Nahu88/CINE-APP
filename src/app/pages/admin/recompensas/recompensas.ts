import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Producto } from '../../../models/candy.model';
import { Recompensa } from '../../../models/fidelizacion.model';
import { ActividadService } from '../../../services/actividad';
import { CandyService } from '../../../services/candy';
import { FidelizacionService } from '../../../services/fidelizacion';

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-recompensas',
  templateUrl: './recompensas.html',
})
export class Recompensas implements OnInit {
  private fidelizacion = inject(FidelizacionService);
  private candyService = inject(CandyService);
  private actividad = inject(ActividadService);

  recompensas = signal<Recompensa[]>([]);
  productos = signal<Producto[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);

  form = new FormGroup({
    descripcion: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    // 'entrada' = una entrada gratis; si no, el id del producto.
    premio: new FormControl('entrada', { nonNullable: true }),
    puntos: new FormControl<number | null>(null, { validators: [Validators.required, Validators.min(1)] }),
  });

  async ngOnInit() {
    await this.cargar();
  }

  async cargar() {
    this.cargando.set(true);
    try {
      this.recompensas.set(await this.fidelizacion.listarRecompensas());
      this.productos.set(await this.candyService.listarProductos());
    } catch {
      this.error.set('No se pudieron cargar las recompensas.');
    } finally {
      this.cargando.set(false);
    }
  }

  queSeLleva(recompensa: Recompensa): string {
    if (!recompensa.producto_id) return 'Una entrada gratis';
    return this.productos().find((p) => p.id === recompensa.producto_id)?.nombre ?? 'Producto';
  }

  async crear() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const valores = this.form.getRawValue();
    this.error.set(null);
    try {
      await this.fidelizacion.crearRecompensa({
        descripcion: valores.descripcion.trim(),
        puntos_requeridos: Number(valores.puntos),
        producto_id: valores.premio === 'entrada' ? null : valores.premio,
      });
      await this.actividad.registrar('crear_recompensa', 'recompensas', null, valores.descripcion + ' por ' + valores.puntos + ' puntos');
      this.form.reset({ descripcion: '', premio: 'entrada', puntos: null });
      await this.cargar();
    } catch {
      this.error.set('No se pudo crear la recompensa.');
    }
  }

  async cambiarPuntos(recompensa: Recompensa) {
    const respuesta = prompt('¿Cuántos puntos cuesta "' + recompensa.descripcion + '"?', String(recompensa.puntos_requeridos));
    if (respuesta === null) return;

    const puntos = Number(respuesta);
    if (!puntos || puntos < 1) {
      this.error.set('Los puntos tienen que ser un número mayor a cero.');
      return;
    }

    try {
      await this.fidelizacion.actualizarPuntosRecompensa(recompensa.id, puntos);
      await this.actividad.registrar('modificar_precio', 'recompensas', recompensa.id, recompensa.descripcion + ': de ' + recompensa.puntos_requeridos + ' a ' + puntos + ' puntos');
      await this.cargar();
    } catch {
      this.error.set('No se pudieron cambiar los puntos.');
    }
  }

  async alternarActiva(recompensa: Recompensa) {
    try {
      await this.fidelizacion.cambiarActivaRecompensa(recompensa.id, !recompensa.activa);
      await this.cargar();
    } catch {
      this.error.set('No se pudo cambiar el estado de la recompensa.');
    }
  }
}
