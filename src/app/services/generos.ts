import { inject, Service } from '@angular/core';
import { SupabaseService } from './supabase';

export interface Genero {
  id: number;
  nombre: string;
}

// Catálogo de géneros; las películas guardan los nombres en su propio array.
@Service()
export class GenerosService {
  private supabase = inject(SupabaseService).client;

  async listar(): Promise<Genero[]> {
    const { data, error } = await this.supabase.from('generos').select('*').order('nombre');
    if (error) throw error;
    return data ?? [];
  }

  async crear(nombre: string): Promise<void> {
    const { error } = await this.supabase.from('generos').insert({ nombre });
    if (error) throw error;
  }

  async eliminar(id: number): Promise<void> {
    const { error } = await this.supabase.from('generos').delete().eq('id', id);
    if (error) throw error;
  }
}
