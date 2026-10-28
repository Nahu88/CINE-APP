import { inject, Service } from '@angular/core';
import {
  Canje,
  Cupon,
  MovimientoCredito,
  MovimientoPuntos,
  Recompensa,
  TipoCupon,
} from '../models/fidelizacion.model';
import { Perfil } from '../models/perfil.model';
import { edadDe } from '../utils/fechas';
import { SupabaseService } from './supabase';

export interface DatosCupon {
  tipo: TipoCupon;
  nombre: string;
  porcentaje: number;
}

export interface DatosRecompensa {
  descripcion: string;
  puntos_requeridos: number;
  producto_id: string | null; // null = entrada gratis
}

// Cupones, puntos, recompensas y crédito: todo lo que le descuenta plata al cliente.
@Service()
export class FidelizacionService {
  private supabase = inject(SupabaseService).client;

  // ---------- Cupones ----------

  async listarCupones(): Promise<Cupon[]> {
    const { data, error } = await this.supabase.from('cupones').select('*').order('tipo');
    if (error) throw error;
    return data ?? [];
  }

  async crearCupon(datos: DatosCupon): Promise<void> {
    const { error } = await this.supabase.from('cupones').insert(datos);
    if (error) throw error;
  }

  async actualizarPorcentaje(id: string, porcentaje: number): Promise<void> {
    const { error } = await this.supabase.from('cupones').update({ porcentaje }).eq('id', id);
    if (error) throw error;
  }

  async cambiarActivoCupon(id: string, activo: boolean): Promise<void> {
    const { error } = await this.supabase.from('cupones').update({ activo }).eq('id', id);
    if (error) throw error;
  }

  // RN-07: el cupón de bienvenida se usa una sola vez. Se fija si el
  // usuario ya tiene alguna compra (no cancelada) hecha con ese cupón.
  async yaUsoCupon(usuarioId: string, cuponId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('ordenes')
      .select('id')
      .eq('usuario_id', usuarioId)
      .eq('cupon_id', cuponId)
      .neq('estado', 'cancelada');
    if (error) throw error;
    return data.length > 0;
  }

  // Qué cupones puede usar este cliente. Un invitado no tiene cupones.
  cuponesPara(perfil: Perfil, cupones: Cupon[], yaUsoBienvenida: boolean): Cupon[] {
    if (perfil.invitado) return [];

    const disponibles: Cupon[] = [];
    for (const cupon of cupones) {
      if (!cupon.activo) continue;

      if (cupon.tipo === 'bienvenida' && !yaUsoBienvenida) {
        disponibles.push(cupon);
      } else if (cupon.tipo === 'mayores_50' && edadDe(perfil.fecha_nacimiento) >= 50) {
        disponibles.push(cupon);
      } else if (cupon.tipo === 'general') {
        disponibles.push(cupon);
      }
    }
    return disponibles;
  }

  // ---------- Recompensas ----------

  async listarRecompensas(): Promise<Recompensa[]> {
    const { data, error } = await this.supabase
      .from('recompensas')
      .select('*')
      .order('puntos_requeridos');
    if (error) throw error;
    return data ?? [];
  }

  async crearRecompensa(datos: DatosRecompensa): Promise<void> {
    const { error } = await this.supabase.from('recompensas').insert(datos);
    if (error) throw error;
  }

  async actualizarPuntosRecompensa(id: string, puntos: number): Promise<void> {
    const { error } = await this.supabase.from('recompensas').update({ puntos_requeridos: puntos }).eq('id', id);
    if (error) throw error;
  }

  async cambiarActivaRecompensa(id: string, activa: boolean): Promise<void> {
    const { error } = await this.supabase.from('recompensas').update({ activa }).eq('id', id);
    if (error) throw error;
  }

  async listarCanjes(usuarioId: string): Promise<Canje[]> {
    const { data, error } = await this.supabase
      .from('canjes')
      .select('*')
      .eq('usuario_id', usuarioId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  // ---------- Puntos ----------

  async movimientosPuntos(usuarioId: string): Promise<MovimientoPuntos[]> {
    const { data, error } = await this.supabase
      .from('puntos_movimientos')
      .select('*')
      .eq('usuario_id', usuarioId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  // El saldo no se guarda: es la suma de todos los movimientos.
  async saldoPuntos(usuarioId: string): Promise<number> {
    const movimientos = await this.movimientosPuntos(usuarioId);
    let saldo = 0;
    for (const movimiento of movimientos) {
      saldo += movimiento.puntos;
    }
    return saldo;
  }

  // ---------- Crédito ----------

  async movimientosCredito(usuarioId: string): Promise<MovimientoCredito[]> {
    const { data, error } = await this.supabase
      .from('creditos_movimientos')
      .select('*')
      .eq('usuario_id', usuarioId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  async saldoCredito(usuarioId: string): Promise<number> {
    const movimientos = await this.movimientosCredito(usuarioId);
    let saldo = 0;
    for (const movimiento of movimientos) {
      saldo += Number(movimiento.monto);
    }
    return saldo;
  }
}
