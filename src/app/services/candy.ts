import { inject, Service } from '@angular/core';
import { Categoria, Combo, ComboItem, OrdenItem, Producto } from '../models/candy.model';
import { SupabaseService } from './supabase';

export interface DatosProducto {
  nombre: string;
  categoria_id: number | null;
  precio: number;
  imagen_url: string;
  activo: boolean;
}

export interface DatosCombo {
  nombre: string;
  precio: number;
}

@Service()
export class CandyService {
  private supabase = inject(SupabaseService).client;

  async listarCategorias(): Promise<Categoria[]> {
    const { data, error } = await this.supabase.from('categorias_productos').select('*').order('nombre');
    if (error) throw error;
    return data ?? [];
  }

  async crearCategoria(nombre: string): Promise<void> {
    const { error } = await this.supabase.from('categorias_productos').insert({ nombre });
    if (error) throw error;
  }

  async eliminarCategoria(id: number): Promise<void> {
    const { error } = await this.supabase.from('categorias_productos').delete().eq('id', id);
    if (error) throw error;
  }

  async listarProductos(): Promise<Producto[]> {
    const { data, error } = await this.supabase.from('productos').select('*').order('nombre');
    if (error) throw error;
    return data ?? [];
  }

  async crearProducto(datos: DatosProducto): Promise<string> {
    const { data, error } = await this.supabase.from('productos').insert(datos).select('id');
    if (error) throw error;
    return data[0].id;
  }

  async actualizarProducto(id: string, datos: DatosProducto): Promise<void> {
    const { error } = await this.supabase.from('productos').update(datos).eq('id', id);
    if (error) throw error;
  }

  // Baja lógica: deja de ofrecerse pero no se pierde.
  async cambiarActivoProducto(id: string, activo: boolean): Promise<void> {
    const { error } = await this.supabase.from('productos').update({ activo }).eq('id', id);
    if (error) throw error;
  }

  async listarCombos(): Promise<Combo[]> {
    const { data, error } = await this.supabase.from('combos').select('*').order('nombre');
    if (error) throw error;
    return data ?? [];
  }

  async listarItemsDeCombos(): Promise<ComboItem[]> {
    const { data, error } = await this.supabase.from('combo_items').select('*');
    if (error) throw error;
    return data ?? [];
  }

  async crearCombo(datos: DatosCombo, items: { producto_id: string; cantidad: number }[]): Promise<string> {
    const { data, error } = await this.supabase.from('combos').insert(datos).select('id');
    if (error) throw error;
    const comboId = data[0].id;

    const filas = [];
    for (const item of items) {
      filas.push({ combo_id: comboId, producto_id: item.producto_id, cantidad: item.cantidad });
    }

    const { error: errorItems } = await this.supabase.from('combo_items').insert(filas);
    if (errorItems) {
      // Si fallan los productos, se borra el combo para no dejarlo vacío.
      await this.supabase.from('combos').delete().eq('id', comboId);
      throw errorItems;
    }
    return comboId;
  }

  async actualizarPrecioCombo(id: string, precio: number): Promise<void> {
    const { error } = await this.supabase.from('combos').update({ precio }).eq('id', id);
    if (error) throw error;
  }

  async cambiarActivoCombo(id: string, activo: boolean): Promise<void> {
    const { error } = await this.supabase.from('combos').update({ activo }).eq('id', id);
    if (error) throw error;
  }

  async listarItemsDeOrden(ordenId: string): Promise<OrdenItem[]> {
    const { data, error } = await this.supabase.from('orden_items').select('*').eq('orden_id', ordenId);
    if (error) throw error;
    return data ?? [];
  }

  async marcarEntregados(ordenId: string, empleadoId: string): Promise<void> {
    const { error } = await this.supabase
      .from('orden_items')
      .update({ entregado: true, entregado_at: new Date().toISOString(), entregado_por: empleadoId })
      .eq('orden_id', ordenId)
      .eq('entregado', false);
    if (error) throw error;
  }

  describirItems(items: OrdenItem[], productos: Producto[], combos: Combo[]): string[] {
    const textos: string[] = [];
    for (const item of items) {
      const producto = productos.find((p) => p.id === item.producto_id);
      const combo = combos.find((c) => c.id === item.combo_id);
      const nombre = producto?.nombre ?? combo?.nombre ?? 'Producto';
      textos.push(item.cantidad + ' x ' + nombre);
    }
    return textos;
  }

  contenidoDeCombo(comboId: string, itemsDeCombos: ComboItem[], productos: Producto[]): string {
    const partes: string[] = [];
    for (const item of itemsDeCombos) {
      if (item.combo_id !== comboId) continue;
      const producto = productos.find((p) => p.id === item.producto_id);
      partes.push(item.cantidad + ' x ' + (producto?.nombre ?? 'Producto'));
    }
    return partes.join(', ');
  }
}
