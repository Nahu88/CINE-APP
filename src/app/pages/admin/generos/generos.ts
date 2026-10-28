import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Genero, GenerosService } from '../../../services/generos';

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-generos',
  templateUrl: './generos.html',
})
export class Generos implements OnInit {
  private generosService = inject(GenerosService);

  generos = signal<Genero[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);

  form = new FormGroup({
    nombre: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(40)] }),
  });

  async ngOnInit() {
    await this.cargar();
  }

  async cargar() {
    this.cargando.set(true);
    try {
      this.generos.set(await this.generosService.listar());
    } catch {
      this.error.set('No se pudieron cargar los géneros.');
    } finally {
      this.cargando.set(false);
    }
  }

  async crear() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.error.set(null);
    try {
      await this.generosService.crear(this.form.getRawValue().nombre.trim());
      this.form.reset({ nombre: '' });
      await this.cargar();
    } catch (error) {
      const codigo = (error as { code?: string }).code;
      this.error.set(codigo === '23505' ? 'Ese género ya existe.' : 'No se pudo crear el género.');
    }
  }

  async eliminar(genero: Genero) {
    if (!confirm('¿Eliminar "' + genero.nombre + '"? Las películas que ya lo tienen lo conservan.')) return;
    try {
      await this.generosService.eliminar(genero.id);
      await this.cargar();
    } catch {
      this.error.set('No se pudo eliminar el género.');
    }
  }
}
