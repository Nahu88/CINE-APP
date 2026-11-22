import { inject, Service } from '@angular/core';
import { EstadoPropuesta, Propuesta } from '../models/propuesta.model';
import { SupabaseService } from './supabase';

export interface DatosPropuesta {
  usuario_id: string;
  autor: string;
  titulo: string;
  descripcion: string;
  motivo: string;
}

@Service()
export class PropuestasService {
  private supabase = inject(SupabaseService).client;

  // Las propuestas de un cliente, la más nueva primero.
  async listarDelUsuario(usuarioId: string): Promise<Propuesta[]> {
    const { data, error } = await this.supabase
      .from('propuestas')
      .select('*')
      .eq('usuario_id', usuarioId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  // Para el admin: todas, la más vieja primero (se atienden en orden de llegada).
  async listarTodas(): Promise<Propuesta[]> {
    const { data, error } = await this.supabase
      .from('propuestas')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async crear(datos: DatosPropuesta): Promise<void> {
    const { error } = await this.supabase.from('propuestas').insert(datos);
    if (error) throw error;
  }

  async cambiarEstado(id: string, estado: EstadoPropuesta): Promise<void> {
    const { error } = await this.supabase.from('propuestas').update({ estado: estado }).eq('id', id);
    if (error) throw error;
  }
}
