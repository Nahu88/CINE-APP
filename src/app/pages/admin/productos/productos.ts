import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Categoria, Producto } from '../../../models/candy.model';
import { ActividadService } from '../../../services/actividad';
import { CandyService, DatosProducto } from '../../../services/candy';

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-productos',
  templateUrl: './productos.html',
})
export class Productos implements OnInit {
  private candyService = inject(CandyService);
  private actividad = inject(ActividadService);

  categorias = signal<Categoria[]>([]);
  productos = signal<Producto[]>([]);
  cargando = signal(true);
  guardando = signal(false);
  error = signal<string | null>(null);

  // null = creando; con id = editando.
  editandoId = signal<string | null>(null);

  formCategoria = new FormGroup({
    nombre: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  formProducto = new FormGroup({
    nombre: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    categoria_id: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    precio: new FormControl<number | null>(null, { validators: [Validators.required, Validators.min(1)] }),
    imagen_url: new FormControl('', { nonNullable: true }),
  });

  async ngOnInit() {
    await this.cargar();
  }

  async cargar() {
    this.cargando.set(true);
    this.error.set(null);
    try {
      this.categorias.set(await this.candyService.listarCategorias());
      this.productos.set(await this.candyService.listarProductos());
    } catch {
      this.error.set('No se pudo cargar el candy bar.');
    } finally {
      this.cargando.set(false);
    }
  }

  tieneError(campo: string, error: string): boolean {
    const control = this.formProducto.get(campo);
    return !!control && control.touched && control.hasError(error);
  }

  nombreCategoria(id: number | null): string {
    return this.categorias().find((c) => c.id === id)?.nombre ?? 'Sin categoría';
  }

  async crearCategoria() {
    if (this.formCategoria.invalid) {
      this.formCategoria.markAllAsTouched();
      return;
    }
    this.error.set(null);
    try {
      await this.candyService.crearCategoria(this.formCategoria.getRawValue().nombre.trim());
      this.formCategoria.reset({ nombre: '' });
      await this.cargar();
    } catch (error) {
      const codigo = (error as { code?: string }).code;
      this.error.set(codigo === '23505' ? 'Ya existe una categoría con ese nombre.' : 'No se pudo crear la categoría.');
    }
  }

  async eliminarCategoria(categoria: Categoria) {
    if (!confirm('¿Eliminar la categoría "' + categoria.nombre + '"?')) return;
    try {
      await this.candyService.eliminarCategoria(categoria.id);
      await this.cargar();
    } catch {
      this.error.set('No se puede eliminar: hay productos en esa categoría.');
    }
  }

  editar(producto: Producto) {
    this.editandoId.set(producto.id);
    this.formProducto.setValue({
      nombre: producto.nombre,
      categoria_id: producto.categoria_id ? String(producto.categoria_id) : '',
      precio: producto.precio,
      imagen_url: producto.imagen_url ?? '',
    });
  }

  cancelarEdicion() {
    this.editandoId.set(null);
    this.formProducto.reset({ nombre: '', categoria_id: '', precio: null, imagen_url: '' });
  }

  async guardar() {
    if (this.formProducto.invalid) {
      this.formProducto.markAllAsTouched();
      return;
    }

    const valores = this.formProducto.getRawValue();
    const datos: DatosProducto = {
      nombre: valores.nombre.trim(),
      categoria_id: Number(valores.categoria_id),
      precio: Number(valores.precio),
      imagen_url: valores.imagen_url.trim(),
      activo: true,
    };

    this.guardando.set(true);
    this.error.set(null);
    try {
      const id = this.editandoId();
      if (id) {
        const anterior = this.productos().find((p) => p.id === id);
        datos.activo = anterior?.activo ?? true;
        await this.candyService.actualizarProducto(id, datos);

        if (anterior && Number(anterior.precio) !== datos.precio) {
          await this.actividad.registrar('modificar_precio', 'productos', id, datos.nombre + ': de $' + anterior.precio + ' a $' + datos.precio);
        }
      } else {
        const nuevoId = await this.candyService.crearProducto(datos);
        await this.actividad.registrar('crear_producto', 'productos', nuevoId, datos.nombre + ' a $' + datos.precio);
      }
      this.cancelarEdicion();
      await this.cargar();
    } catch {
      this.error.set('No se pudo guardar el producto.');
    } finally {
      this.guardando.set(false);
    }
  }

  async alternarActivo(producto: Producto) {
    try {
      await this.candyService.cambiarActivoProducto(producto.id, !producto.activo);
      await this.cargar();
    } catch {
      this.error.set('No se pudo cambiar el estado del producto.');
    }
  }
}
