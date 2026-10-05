import { inject, Service } from '@angular/core';
import { Butaca } from '../models/sala.model';
import { Funcion } from '../models/funcion.model';
import { SupabaseService } from './supabase';

@Service()
export class ComprasService {
  private supabase = inject(SupabaseService).client;

  async listarButacas(salaId: number): Promise<Butaca[]> {
    const { data, error } = await this.supabase
      .from('butacas')
      .select('*')
      .eq('sala_id', salaId)
      .order('fila')
      .order('numero');
    if (error) throw error;
    return data ?? [];
  }

  // Devuelve solo los ids de las butacas ya vendidas para esta función.
  async listarOcupadas(funcionId: string): Promise<number[]> {
    const { data, error } = await this.supabase
      .from('entradas')
      .select('butaca_id')
      .eq('funcion_id', funcionId);
    if (error) throw error;

    const ids: number[] = [];
    for (const fila of data ?? []) {
      ids.push(fila.butaca_id);
    }
    return ids;
  }

  precioDe(funcion: Funcion, butaca: Butaca): number {
    return butaca.tipo === 'vip' ? funcion.precio_vip : funcion.precio_normal;
  }

  // Pago simulado: se crea la orden y después una entrada por butaca.
  async confirmar(usuarioId: string, funcion: Funcion, butacas: Butaca[]): Promise<void> {
    let total = 0;
    for (const butaca of butacas) {
      total += this.precioDe(funcion, butaca);
    }
    const { data, error } = await this.supabase
      .from('ordenes')
      .insert({ usuario_id: usuarioId, subtotal: total, total })
      .select('id');
    if (error) throw error;
    const ordenId = data[0].id;

    const entradas = [];
    for (const butaca of butacas) {
      entradas.push({
        orden_id: ordenId,
        funcion_id: funcion.id,
        butaca_id: butaca.id,
        precio: this.precioDe(funcion, butaca),
        codigo_qr: crypto.randomUUID(), // código único; el QR se dibuja en la próxima etapa
      });
    }

    const { error: errorEntradas } = await this.supabase.from('entradas').insert(entradas);
    if (errorEntradas) {
      // Si alguna butaca ya estaba vendida, se borra la orden para no dejarla vacía.
      await this.supabase.from('ordenes').delete().eq('id', ordenId);
      throw errorEntradas;
    }
  }
}