import { inject, Service } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import { ItemCarrito } from '../models/candy.model';
import { Cupon, Recompensa } from '../models/fidelizacion.model';
import { Funcion } from '../models/funcion.model';
import { Orden } from '../models/orden.model';
import { Pelicula } from '../models/pelicula.model';
import { Butaca } from '../models/sala.model';
import { SupabaseService } from './supabase';

export interface DatosCompra {
  usuarioId: string;
  esInvitado: boolean;
  funcion: Funcion;
  pelicula: Pelicula;
  butacas: Butaca[];
  candy: ItemCarrito[];
  cupon: Cupon | null;
  recompensa: Recompensa | null;
  subtotal: number;
  descuento: number;
  creditoUsado: number;
  total: number;
}

@Service()
export class ComprasService {
  private supabase = inject(SupabaseService).client;

  private canal: RealtimeChannel | null = null;

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

  // Lee la vista sin códigos QR, así también la puede consultar un visitante.
  async listarOcupadas(funcionId: string): Promise<number[]> {
    const { data, error } = await this.supabase
      .from('butacas_vendidas')
      .select('butaca_id')
      .eq('funcion_id', funcionId);
    if (error) throw error;

    const ids: number[] = [];
    for (const fila of data ?? []) {
      ids.push(fila.butaca_id);
    }
    return ids;
  }

  escucharEntradas(alCambiar: () => void) {
    this.canal = this.supabase
      .channel('entradas-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entradas' }, () => {
        alCambiar();
      })
      .subscribe();
  }

  dejarDeEscuchar() {
    if (this.canal) {
      this.supabase.removeChannel(this.canal);
      this.canal = null;
    }
  }

  // Al llegar el estreno deja de dar true y el precio vuelve solo al normal.
  estaEnPreventa(funcion: Funcion, pelicula: Pelicula): boolean {
    if (!funcion.preventa_desde || !funcion.precio_preventa || !pelicula.fecha_estreno) {
      return false;
    }
    const ahora = new Date();
    const estreno = new Date(pelicula.fecha_estreno + 'T00:00:00');
    return ahora >= new Date(funcion.preventa_desde) && ahora < estreno;
  }

  estaALaVenta(funcion: Funcion, pelicula: Pelicula): boolean {
    if (!pelicula.fecha_estreno) return true;
    const estreno = new Date(pelicula.fecha_estreno + 'T00:00:00');
    return new Date() >= estreno || this.estaEnPreventa(funcion, pelicula);
  }

  // La VIP mantiene su precio; las demás usan el de preventa mientras dure.
  precioDe(funcion: Funcion, butaca: Butaca, pelicula: Pelicula): number {
    if (butaca.tipo === 'vip') return Number(funcion.precio_vip);
    if (this.estaEnPreventa(funcion, pelicula)) return Number(funcion.precio_preventa);
    return Number(funcion.precio_normal);
  }

  // Pago simulado. Devuelve los códigos de las entradas.
  async confirmar(datos: DatosCompra): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('ordenes')
      .insert({
        usuario_id: datos.usuarioId,
        subtotal: datos.subtotal,
        descuento: datos.descuento,
        credito_usado: datos.creditoUsado,
        total: datos.total,
        estado: 'pagada',
        cupon_id: datos.cupon ? datos.cupon.id : null,
      })
      .select('id');
    if (error) throw error;
    const ordenId = data[0].id;

    const entradas = [];
    const codigos: string[] = [];
    for (const butaca of datos.butacas) {
      const codigo = crypto.randomUUID();
      codigos.push(codigo);
      entradas.push({
        orden_id: ordenId,
        funcion_id: datos.funcion.id,
        butaca_id: butaca.id,
        precio: this.precioDe(datos.funcion, butaca, datos.pelicula),
        codigo_qr: codigo,
      });
    }

    const { error: errorEntradas } = await this.supabase.from('entradas').insert(entradas);
    if (errorEntradas) {
      // Butaca ya vendida: se borra la orden para no dejarla vacía.
      await this.supabase.from('ordenes').delete().eq('id', ordenId);
      throw errorEntradas;
    }

    const items = [];
    for (const item of datos.candy) {
      items.push({
        orden_id: ordenId,
        producto_id: item.producto_id,
        combo_id: item.combo_id,
        cantidad: item.cantidad,
        precio_unitario: item.precio,
      });
    }
    if (datos.recompensa && datos.recompensa.producto_id) {
      items.push({
        orden_id: ordenId,
        producto_id: datos.recompensa.producto_id,
        combo_id: null,
        cantidad: 1,
        precio_unitario: 0,
      });
    }
    if (items.length) {
      const { error: errorItems } = await this.supabase.from('orden_items').insert(items);
      if (errorItems) throw errorItems;
    }

    if (datos.esInvitado) {
      return codigos;
    }

    if (datos.recompensa) {
      await this.guardarCanje(datos.usuarioId, ordenId, datos.recompensa);
    }

    if (datos.creditoUsado > 0) {
      await this.moverCredito(datos.usuarioId, ordenId, -datos.creditoUsado, 'Usado en una compra');
    }

    // 1 punto por cada peso pagado.
    const puntosGanados = Math.floor(datos.total);
    if (puntosGanados > 0) {
      await this.moverPuntos(datos.usuarioId, ordenId, puntosGanados, 'Compra');
    }

    return codigos;
  }

  private async guardarCanje(usuarioId: string, ordenId: string, recompensa: Recompensa) {
    const { error } = await this.supabase.from('canjes').insert({
      usuario_id: usuarioId,
      recompensa_id: recompensa.id,
      orden_id: ordenId,
      puntos_usados: recompensa.puntos_requeridos,
    });
    if (error) throw error;
    await this.moverPuntos(usuarioId, ordenId, -recompensa.puntos_requeridos, 'Canje: ' + recompensa.descripcion);
  }

  private async moverPuntos(usuarioId: string, ordenId: string, puntos: number, motivo: string) {
    const { error } = await this.supabase.from('puntos_movimientos').insert({
      usuario_id: usuarioId,
      orden_id: ordenId,
      puntos: puntos,
      motivo: motivo,
    });
    if (error) throw error;
  }

  private async moverCredito(usuarioId: string, ordenId: string, monto: number, motivo: string) {
    const { error } = await this.supabase.from('creditos_movimientos').insert({
      usuario_id: usuarioId,
      orden_id: ordenId,
      monto: monto,
      motivo: motivo,
    });
    if (error) throw error;
  }

  sePuedeCancelar(orden: Orden, inicioFuncion: string): boolean {
    if (orden.estado !== 'pagada') return false;
    const dosHoras = 2 * 60 * 60 * 1000;
    return new Date(inicioFuncion).getTime() - Date.now() > dosHoras;
  }

  // Pasar las entradas a 'cancelada' libera las butacas.
  async cancelar(orden: Orden, usuarioId: string): Promise<number> {
    const { error } = await this.supabase.from('ordenes').update({ estado: 'cancelada' }).eq('id', orden.id);
    if (error) throw error;

    const { error: errorEntradas } = await this.supabase
      .from('entradas')
      .update({ estado: 'cancelada' })
      .eq('orden_id', orden.id);
    if (errorEntradas) throw errorEntradas;

    // Nunca se devuelve plata, solo crédito.
    const reintegro = Number(orden.total) + Number(orden.credito_usado);
    if (reintegro > 0) {
      await this.moverCredito(usuarioId, orden.id, reintegro, 'Cancelación de compra');
    }

    // Se invierten los movimientos: los puntos ganados se restan y los canjeados vuelven.
    const { data: movimientos, error: errorPuntos } = await this.supabase
      .from('puntos_movimientos')
      .select('*')
      .eq('orden_id', orden.id);
    if (errorPuntos) throw errorPuntos;

    for (const movimiento of movimientos ?? []) {
      await this.moverPuntos(usuarioId, orden.id, -movimiento.puntos, 'Cancelación de compra');
    }

    return reintegro;
  }
}
