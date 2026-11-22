import { inject, Service } from '@angular/core';
import { Resenia } from '../models/resenia.model';
import { SupabaseService } from './supabase';

@Service()
export class ReseniasService {
  private supabase = inject(SupabaseService).client;

  async listarDePelicula(peliculaId: string): Promise<Resenia[]> {
    const { data, error } = await this.supabase
      .from('resenias')
      .select('*')
      .eq('pelicula_id', peliculaId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  async listarDelUsuario(usuarioId: string): Promise<Resenia[]> {
    const { data, error } = await this.supabase.from('resenias').select('*').eq('usuario_id', usuarioId);
    if (error) throw error;
    return data ?? [];
  }

  // Una reseña por usuario y película: si ya existe se actualiza, si no se crea.
  async guardar(existente: Resenia | null, datos: { pelicula_id: string; usuario_id: string; autor: string; estrellas: number; comentario: string }) {
    if (existente) {
      const { error } = await this.supabase
        .from('resenias')
        .update({ estrellas: datos.estrellas, comentario: datos.comentario })
        .eq('id', existente.id);
      if (error) throw error;
    } else {
      const { error } = await this.supabase.from('resenias').insert(datos);
      if (error) throw error;
    }
  }

  async eliminar(id: string): Promise<void> {
    const { error } = await this.supabase.from('resenias').delete().eq('id', id);
    if (error) throw error;
  }

  promedio(resenias: Resenia[]): number {
    if (resenias.length === 0) return 0;
    let suma = 0;
    for (const resenia of resenias) {
      suma += resenia.estrellas;
    }
    return suma / resenias.length;
  }
}
