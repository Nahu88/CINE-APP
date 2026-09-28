import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Sala } from '../../../models/sala.model';
import { SalasService } from '../../../services/salas';

@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-salas',
  styleUrl: './salas.css',
  templateUrl: './salas.html',
})
export class Salas implements OnInit {
  private salasService = inject(SalasService);

  salas = signal<Sala[]>([]);
  cargando = signal(true);
  guardando = signal(false);
  error = signal<string | null>(null);

  form = new FormGroup({
    nombre: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  async ngOnInit() {
    await this.cargarSalas();
  }

  async cargarSalas() {
    this.cargando.set(true);
    this.error.set(null);
    try {
      this.salas.set(await this.salasService.listar());
    } catch {
      this.error.set('No se pudo cargar el listado de salas.');
    } finally {
      this.cargando.set(false);
    }
  }

  async crear() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    this.error.set(null);
    try {
      await this.salasService.crear(this.form.getRawValue());
      this.form.reset({ nombre: '' });
      await this.cargarSalas();
    } catch {
      this.error.set('No se pudo crear la sala.');
    } finally {
      this.guardando.set(false);
    }
  }

  async eliminar(sala: Sala) {
    const confirmado = confirm(
      `¿Eliminar "${sala.nombre}"? Se borran también sus butacas y no se puede deshacer.`
    );
    if (!confirmado) return;

    try {
      await this.salasService.eliminar(sala.id);
      await this.cargarSalas();
    } catch {
      this.error.set('No se pudo eliminar la sala. Puede que ya tenga funciones cargadas.');
    }
  }
}