import { inject, Service } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import { ItemCarrito } from '../models/candy.model';
import { Cupon, Recompensa } from '../models/fidelizacion.model';
import { Funcion } from '../models/funcion.model';
import { Orden } from '../models/orden.model';
import { Pelicula } from '../models/pelicula.model';
import { Butaca } from '../models/sala.model';
import { SupabaseService } from './supabase';

// Todo lo que la pantalla de compra ya calculó y hay que guardar.
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

  // El canal de realtime abierto, o null si no hay ninguno.
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

  // Devuelve solo los ids de las butacas ya vendidas para esta función.
  // Lee la vista butacas_vendidas, que no tiene los códigos QR: así la
  // puede consultar también un visitante sin cuenta.
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

  // Realtime: abre un canal que avisa cada vez que cambia la tabla `entradas`.
  // `alCambiar` es la función que se ejecuta con cada aviso.
  escucharEntradas(alCambiar: () => void) {
    this.canal = this.supabase
      .channel('entradas-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entradas' }, () => {
        alCambiar();
      })
      .subscribe();
  }

  // Cierra el canal para no dejar la conexión abierta al salir de la compra.
  dejarDeEscuchar() {
    if (this.canal) {
      this.supabase.removeChannel(this.canal);
      this.canal = null;
    }
  }

  // ---------- Preventa (RF-53 y RF-54) ----------

  // Una película con estreno futuro está en preventa desde `preventa_desde`
  // hasta el día del estreno. Después el precio vuelve solo al normal,
  // porque esta función deja de dar true.
  estaEnPreventa(funcion: Funcion, pelicula: Pelicula): boolean {
    if (!funcion.preventa_desde || !funcion.precio_preventa || !pelicula.fecha_estreno) {
      return false;
    }
    const ahora = new Date();
    const estreno = new Date(pelicula.fecha_estreno + 'T00:00:00');
    return ahora >= new Date(funcion.preventa_desde) && ahora < estreno;
  }

  // Se puede comprar si la película ya se estrenó o si está en preventa.
  estaALaVenta(funcion: Funcion, pelicula: Pelicula): boolean {
    if (!pelicula.fecha_estreno) return true;
    const estreno = new Date(pelicula.fecha_estreno + 'T00:00:00');
    return new Date() >= estreno || this.estaEnPreventa(funcion, pelicula);
  }

  // La VIP mantiene su precio (siempre es mayor, RN-11); las demás usan
  // el precio de preventa mientras dure.
  precioDe(funcion: Funcion, butaca: Butaca, pelicula: Pelicula): number {
    if (butaca.tipo === 'vip') return Number(funcion.precio_vip);
    if (this.estaEnPreventa(funcion, pelicula)) return Number(funcion.precio_preventa);
    return Number(funcion.precio_normal);
  }

  // ---------- Confirmar la compra ----------

  // Pago simulado. Se guarda en este orden: la orden, las entradas, el
  // candy, y por último los movimientos de puntos y crédito.
  // Devuelve los códigos de las entradas (el invitado los ve en pantalla).
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

    // Una entrada por butaca, cada una con su código único.
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
      // Si alguna butaca ya estaba vendida, se borra la orden para no dejarla vacía.
      await this.supabase.from('ordenes').delete().eq('id', ordenId);
      throw errorEntradas;
    }

    // El candy elegido, más el producto gratis si se canjeó uno.
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

    // Un invitado no suma ni usa puntos ni crédito.
    if (datos.esInvitado) {
      return codigos;
    }

    if (datos.recompensa) {
      await this.guardarCanje(datos.usuarioId, ordenId, datos.recompensa);
    }

    if (datos.creditoUsado > 0) {
      await this.moverCredito(datos.usuarioId, ordenId, -datos.creditoUsado, 'Usado en una compra');
    }

    // RN-08: 1 punto por cada peso pagado.
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

  // ---------- Cancelar una compra (RF-33, RF-34, RN-09, RN-10) ----------

  // RN-09: solo si faltan más de 2 horas para la función.
  sePuedeCancelar(orden: Orden, inicioFuncion: string): boolean {
    if (orden.estado !== 'pagada') return false;
    const dosHoras = 2 * 60 * 60 * 1000;
    return new Date(inicioFuncion).getTime() - Date.now() > dosHoras;
  }

  // La orden y sus entradas pasan a 'cancelada' (eso libera las butacas),
  // se devuelve como crédito todo lo pagado (en plata y en crédito) y se
  // revierten los puntos de esa compra.
  async cancelar(orden: Orden, usuarioId: string): Promise<number> {
    const { error } = await this.supabase.from('ordenes').update({ estado: 'cancelada' }).eq('id', orden.id);
    if (error) throw error;

    const { error: errorEntradas } = await this.supabase
      .from('entradas')
      .update({ estado: 'cancelada' })
      .eq('orden_id', orden.id);
    if (errorEntradas) throw errorEntradas;

    // RN-10: nunca se devuelve plata, solo crédito.
    const reintegro = Number(orden.total) + Number(orden.credito_usado);
    if (reintegro > 0) {
      await this.moverCredito(usuarioId, orden.id, reintegro, 'Cancelación de compra');
    }

    // Se deshacen los puntos de esta compra: los ganados se restan y los canjeados vuelven.
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
