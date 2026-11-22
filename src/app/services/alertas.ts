import { inject, Service } from '@angular/core';
import { SupabaseService } from './supabase';

// El aviso se muestra dentro de la app, en la página principal.
@Service()
export class AlertasService {
  private supabase = inject(SupabaseService).client;

  async listarDelUsuario(usuarioId: string): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('alertas_estreno')
      .select('pelicula_id')
      .eq('usuario_id', usuarioId);
    if (error) throw error;

    const ids: string[] = [];
    for (const fila of data ?? []) {
      ids.push(fila.pelicula_id);
    }
    return ids;
  }

  async activar(usuarioId: string, peliculaId: string): Promise<void> {
    const { error } = await this.supabase
      .from('alertas_estreno')
      .insert({ usuario_id: usuarioId, pelicula_id: peliculaId });
    if (error) throw error;
  }

  async desactivar(usuarioId: string, peliculaId: string): Promise<void> {
    const { error } = await this.supabase
      .from('alertas_estreno')
      .delete()
      .eq('usuario_id', usuarioId)
      .eq('pelicula_id', peliculaId);
    if (error) throw error;
  }
}
