import { Component, inject, input, OnInit, output, signal } from '@angular/core';
import { Categoria, Combo, ComboItem, ItemCarrito, Producto } from '../../models/candy.model';
import { CandyService } from '../../services/candy';

@Component({
  selector: 'app-candy-bar',
  styleUrl: './candy-bar.css',
  templateUrl: './candy-bar.html',
})
export class CandyBar implements OnInit {
  private candyService = inject(CandyService);

  carrito = input<ItemCarrito[]>([]);

  carritoCambio = output<ItemCarrito[]>();

  categorias = signal<Categoria[]>([]);
  productos = signal<Producto[]>([]);
  combos = signal<Combo[]>([]);
  itemsDeCombos = signal<ComboItem[]>([]);

  async ngOnInit() {
    this.categorias.set(await this.candyService.listarCategorias());
    const productos = await this.candyService.listarProductos();
    this.productos.set(productos.filter((p) => p.activo));
    const combos = await this.candyService.listarCombos();
    this.combos.set(combos.filter((c) => c.activo));
    this.itemsDeCombos.set(await this.candyService.listarItemsDeCombos());
  }

  productosDe(categoria: Categoria): Producto[] {
    return this.productos().filter((p) => p.categoria_id === categoria.id);
  }

  contenidoDe(combo: Combo): string {
    return this.candyService.contenidoDeCombo(combo.id, this.itemsDeCombos(), this.productos());
  }

  cantidad(productoId: string | null, comboId: string | null): number {
    const item = this.carrito().find((i) => i.producto_id === productoId && i.combo_id === comboId);
    return item ? item.cantidad : 0;
  }

  agregarProducto(producto: Producto) {
    this.sumar(producto.id, null, producto.nombre, Number(producto.precio));
  }

  agregarCombo(combo: Combo) {
    this.sumar(null, combo.id, 'Combo ' + combo.nombre, Number(combo.precio));
  }

  private sumar(productoId: string | null, comboId: string | null, nombre: string, precio: number) {
    const nuevo: ItemCarrito[] = [];
    let estaba = false;

    for (const item of this.carrito()) {
      if (item.producto_id === productoId && item.combo_id === comboId) {
        nuevo.push({ producto_id: productoId, combo_id: comboId, nombre: nombre, precio: precio, cantidad: item.cantidad + 1 });
        estaba = true;
      } else {
        nuevo.push(item);
      }
    }

    if (!estaba) {
      nuevo.push({ producto_id: productoId, combo_id: comboId, nombre: nombre, precio: precio, cantidad: 1 });
    }
    this.carritoCambio.emit(nuevo);
  }

  quitar(productoId: string | null, comboId: string | null) {
    const nuevo: ItemCarrito[] = [];

    for (const item of this.carrito()) {
      const esEste = item.producto_id === productoId && item.combo_id === comboId;
      if (!esEste) {
        nuevo.push(item);
      } else if (item.cantidad > 1) {
        nuevo.push({
          producto_id: item.producto_id,
          combo_id: item.combo_id,
          nombre: item.nombre,
          precio: item.precio,
          cantidad: item.cantidad - 1,
        });
      }
    }
    this.carritoCambio.emit(nuevo);
  }
}
