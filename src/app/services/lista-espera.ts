import { inject, Service } from '@angular/core';
import { EsperaPorFuncion, MiListaEspera } from '../models/lista-espera.model';
import { SupabaseService } from './supabase';

// Mismo valor que en la base.
export const MINUTOS_TURNO = 15;

@Service()
export class ListaEsperaService {
  private supabase = inject(SupabaseService).client;

  async anotarse(funcionId: string, usuarioId: string): Promise<void> {
    const { error } = await this.supabase
      .from('lista_espera')
      .insert({ funcion_id: funcionId, usuario_id: usuarioId });
    if (error) throw error;
  }

  async salir(id: string): Promise<void> {
    const { error } = await this.supabase.from('lista_espera').update({ estado: 'cancelado' }).eq('id', id);
    if (error) throw error;
  }

  // Al comprar con su turno, deja de ocupar el lugar reservado.
  async marcarCompra(id: string): Promise<void> {
    const { error } = await this.supabase.from('lista_espera').update({ estado: 'compro' }).eq('id', id);
    if (error) throw error;
  }

  // La vista ya filtra por el usuario logueado.
  async misListas(): Promise<MiListaEspera[]> {
    const { data, error } = await this.supabase.from('mis_listas_espera').select('*');
    if (error) throw error;
    return data ?? [];
  }

  async porFuncion(): Promise<EsperaPorFuncion[]> {
    const { data, error } = await this.supabase.from('espera_por_funcion').select('*');
    if (error) throw error;
    return data ?? [];
  }

  // Vence turnos y da el siguiente. También lo hace la tarea programada cada minuto;
  // acá se llama al abrir la compra para mostrar el estado al día.
  async revisar(funcionId: string): Promise<void> {
    const { error } = await this.supabase.rpc('revisar_lista_espera', { p_funcion_id: funcionId });
    if (error) throw error;
  }

  finDelTurno(lista: MiListaEspera): Date | null {
    if (!lista.notificado_at) return null;
    return new Date(new Date(lista.notificado_at).getTime() + MINUTOS_TURNO * 60_000);
  }
}
