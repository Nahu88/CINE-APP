import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Combo, ComboItem, Producto } from '../../../models/candy.model';
import { ActividadService } from '../../../services/actividad';
import { CandyService } from '../../../services/candy';

// Un producto elegido para el combo nuevo, con su cantidad.
interface ItemNuevo {
  producto_id: string;
  nombre: string;
  cantidad: number;
}

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-combos',
  templateUrl: './combos.html',
})
export class Combos implements OnInit {
  private candyService = inject(CandyService);
  private actividad = inject(ActividadService);

  combos = signal<Combo[]>([]);
  itemsDeCombos = signal<ComboItem[]>([]);
  productos = signal<Producto[]>([]);
  cargando = signal(true);
  guardando = signal(false);
  error = signal<string | null>(null);

  // Lo que se va armando para el combo nuevo.
  itemsNuevos = signal<ItemNuevo[]>([]);

  // Cuánto saldrían los productos por separado, para comparar con el precio del combo.
  precioSuelto = computed(() => {
    let total = 0;
    for (const item of this.itemsNuevos()) {
      const producto = this.productos().find((p) => p.id === item.producto_id);
      total += Number(producto?.precio ?? 0) * item.cantidad;
    }
    return total;
  });

  form = new FormGroup({
    nombre: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    precio: new FormControl<number | null>(null, { validators: [Validators.required, Validators.min(1)] }),
  });

  async ngOnInit() {
    await this.cargar();
  }

  async cargar() {
    this.cargando.set(true);
    try {
      this.productos.set(await this.candyService.listarProductos());
      this.combos.set(await this.candyService.listarCombos());
      this.itemsDeCombos.set(await this.candyService.listarItemsDeCombos());
    } catch {
      this.error.set('No se pudieron cargar los combos.');
    } finally {
      this.cargando.set(false);
    }
  }

  contenido(combo: Combo): string {
    return this.candyService.contenidoDeCombo(combo.id, this.itemsDeCombos(), this.productos());
  }

  cantidadDe(producto: Producto): number {
    return this.itemsNuevos().find((i) => i.producto_id === producto.id)?.cantidad ?? 0;
  }

  // Suma uno: arma la lista de nuevo, y al que coincide le suma uno.
  // Si no estaba, lo agrega al final con cantidad 1.
  sumar(producto: Producto) {
    const nueva: ItemNuevo[] = [];
    let estaba = false;
    for (const item of this.itemsNuevos()) {
      if (item.producto_id === producto.id) {
        nueva.push({ producto_id: item.producto_id, nombre: item.nombre, cantidad: item.cantidad + 1 });
        estaba = true;
      } else {
        nueva.push(item);
      }
    }
    if (!estaba) {
      nueva.push({ producto_id: producto.id, nombre: producto.nombre, cantidad: 1 });
    }
    this.itemsNuevos.set(nueva);
  }

  // Resta uno: al que coincide le resta uno, y si tenía 1, no lo copia.
  restar(producto: Producto) {
    const nueva: ItemNuevo[] = [];
    for (const item of this.itemsNuevos()) {
      if (item.producto_id !== producto.id) {
        nueva.push(item);
      } else if (item.cantidad > 1) {
        nueva.push({ producto_id: item.producto_id, nombre: item.nombre, cantidad: item.cantidad - 1 });
      }
    }
    this.itemsNuevos.set(nueva);
  }

  async crear() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.itemsNuevos().length === 0) {
      this.error.set('Agregá al menos un producto al combo.');
      return;
    }

    const valores = this.form.getRawValue();
    this.guardando.set(true);
    this.error.set(null);
    try {
      const id = await this.candyService.crearCombo(
        { nombre: valores.nombre.trim(), precio: Number(valores.precio) },
        this.itemsNuevos()
      );
      await this.actividad.registrar('crear_combo', 'combos', id, valores.nombre + ' a $' + valores.precio);
      this.form.reset({ nombre: '', precio: null });
      this.itemsNuevos.set([]);
      await this.cargar();
    } catch {
      this.error.set('No se pudo crear el combo.');
    } finally {
      this.guardando.set(false);
    }
  }

  // RF-43: el precio del combo se puede cambiar en cualquier momento.
  async cambiarPrecio(combo: Combo) {
    const respuesta = prompt('Nuevo precio para "' + combo.nombre + '"', String(combo.precio));
    if (respuesta === null) return;

    const precio = Number(respuesta);
    if (!precio || precio <= 0) {
      this.error.set('El precio tiene que ser un número mayor a cero.');
      return;
    }

    try {
      await this.candyService.actualizarPrecioCombo(combo.id, precio);
      await this.actividad.registrar('modificar_precio', 'combos', combo.id, 'Combo ' + combo.nombre + ': de $' + combo.precio + ' a $' + precio);
      await this.cargar();
    } catch {
      this.error.set('No se pudo cambiar el precio.');
    }
  }

  async alternarActivo(combo: Combo) {
    try {
      await this.candyService.cambiarActivoCombo(combo.id, !combo.activo);
      await this.cargar();
    } catch {
      this.error.set('No se pudo cambiar el estado del combo.');
    }
  }
}
