import { Component, inject, input, OnInit, output, signal } from '@angular/core';
import { Categoria, Combo, ComboItem, ItemCarrito, Producto } from '../../models/candy.model';
import { CandyService } from '../../services/candy';

// El candy de la pantalla de compra, separado en su propio componente
// (mismo molde que el mapa de butacas): el padre le pasa el carrito con
// input() y el hijo le devuelve el carrito actualizado con output().
@Component({
  selector: 'app-candy-bar',
  styleUrl: './candy-bar.css',
  templateUrl: './candy-bar.html',
})
export class CandyBar implements OnInit {
  private candyService = inject(CandyService);

  // Los datos bajan con input()...
  carrito = input<ItemCarrito[]>([]);

  // ...y los cambios suben con output().
  carritoCambio = output<ItemCarrito[]>();

  categorias = signal<Categoria[]>([]);
  productos = signal<Producto[]>([]);
  combos = signal<Combo[]>([]);
  itemsDeCombos = signal<ComboItem[]>([]);

  // El catálogo lo carga el propio componente: el padre no lo necesita.
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

  // Cuántos hay en el carrito de este producto o combo.
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

  // Arma un carrito nuevo: copia los items y al que coincide le suma uno.
  // Si no estaba, lo agrega al final con cantidad 1.
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

  // Arma un carrito nuevo: al que coincide le resta uno, y si tenía 1, no lo copia.
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
