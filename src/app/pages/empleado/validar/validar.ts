import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { EntradaDetalle } from '../../../models/entrada.model';
import { Auth } from '../../../services/auth';
import { EntradasService } from '../../../services/entradas';
import { codigoEntradaValidator } from '../../../validators/entrada.validators';

@Component({
  imports: [ReactiveFormsModule, DatePipe],
  selector: 'app-validar',
  styleUrl: './validar.css',
  templateUrl: './validar.html',
})
export class Validar {
  private auth = inject(Auth);
  private entradasService = inject(EntradasService);

  form = new FormGroup({
    codigo: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, codigoEntradaValidator()],
    }),
  });

  // La entrada encontrada, o null si todavía no se buscó ninguna.
  detalle = signal<EntradaDetalle | null>(null);
  buscando = signal(false);
  error = signal<string | null>(null);
  exito = signal<string | null>(null);

  // Se recalcula solo cada vez que cambia `detalle`.
  esValida = computed(() => this.detalle()?.entrada.estado === 'valida');

  tieneError(error: string): boolean {
    const control = this.form.controls.codigo;
    return control.touched && control.hasError(error);
  }

  async buscar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.buscando.set(true);
    this.error.set(null);
    this.exito.set(null);
    this.detalle.set(null);
    try {
      const codigo = this.form.getRawValue().codigo.trim();
      const entrada = await this.entradasService.buscarPorCodigo(codigo);

      if (!entrada) {
        this.error.set('No existe ninguna entrada con ese código.');
        return;
      }

      const detalles = await this.entradasService.armarDetalles([entrada]);
      this.detalle.set(detalles[0]);
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
      this.exito.set('Ingreso registrado: ' + detalle.pelicula + '. ' + detalle.butaca + '.');

      // Se limpia todo para dejar la pantalla lista para la próxima entrada.
      this.detalle.set(null);
      this.form.reset({ codigo: '' });
    } catch {
      this.error.set('No se pudo marcar la entrada como usada.');
    }
  }
}