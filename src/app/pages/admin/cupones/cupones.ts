import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Cupon, TipoCupon } from '../../../models/fidelizacion.model';
import { ActividadService } from '../../../services/actividad';
import { FidelizacionService } from '../../../services/fidelizacion';

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-cupones',
  templateUrl: './cupones.html',
})
export class Cupones implements OnInit {
  private fidelizacion = inject(FidelizacionService);
  private actividad = inject(ActividadService);

  cupones = signal<Cupon[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);

  paraQuien(tipo: TipoCupon): string {
    if (tipo === 'bienvenida') return 'Primera compra de cada cliente registrado';
    if (tipo === 'mayores_50') return 'Clientes de 50 años o más';
    return 'Cualquier cliente registrado';
  }

  form = new FormGroup({
    tipo: new FormControl<TipoCupon>('mayores_50', { nonNullable: true }),
    nombre: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    porcentaje: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(1), Validators.max(100)],
    }),
  });

  async ngOnInit() {
    await this.cargar();
  }

  async cargar() {
    this.cargando.set(true);
    try {
      this.cupones.set(await this.fidelizacion.listarCupones());
    } catch {
      this.error.set('No se pudieron cargar los cupones.');
    } finally {
      this.cargando.set(false);
    }
  }

  tieneError(campo: string, error: string): boolean {
    const control = this.form.get(campo);
    return !!control && control.touched && control.hasError(error);
  }

  async crear() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const valores = this.form.getRawValue();
    this.error.set(null);
    try {
      await this.fidelizacion.crearCupon({
        tipo: valores.tipo,
        nombre: valores.nombre.trim(),
        porcentaje: Number(valores.porcentaje),
      });
      await this.actividad.registrar('crear_cupon', 'cupones', null, valores.nombre + ' de ' + valores.porcentaje + '%');
      this.form.reset({ tipo: 'mayores_50', nombre: '', porcentaje: null });
      await this.cargar();
    } catch {
      this.error.set('No se pudo crear el cupón.');
    }
  }

  async cambiarPorcentaje(cupon: Cupon) {
    const respuesta = prompt('Nuevo porcentaje de descuento (1 a 100)', String(cupon.porcentaje));
    if (respuesta === null) return;

    const porcentaje = Number(respuesta);
    if (!porcentaje || porcentaje < 1 || porcentaje > 100) {
      this.error.set('El porcentaje tiene que estar entre 1 y 100.');
      return;
    }

    try {
      await this.fidelizacion.actualizarPorcentaje(cupon.id, porcentaje);
      await this.actividad.registrar('modificar_precio', 'cupones', cupon.id, 'Cupón ' + (cupon.nombre ?? cupon.tipo) + ': de ' + cupon.porcentaje + '% a ' + porcentaje + '%');
      await this.cargar();
    } catch {
      this.error.set('No se pudo cambiar el porcentaje.');
    }
  }

  async alternarActivo(cupon: Cupon) {
    try {
      await this.fidelizacion.cambiarActivoCupon(cupon.id, !cupon.activo);
      await this.cargar();
    } catch {
      this.error.set('No se pudo cambiar el estado del cupón.');
    }
  }
}
