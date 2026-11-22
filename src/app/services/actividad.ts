import { inject, Service } from '@angular/core';
import { Actividad } from '../models/actividad.model';
import { Auth } from './auth';
import { SupabaseService } from './supabase';

@Service()
export class ActividadService {
  private supabase = inject(SupabaseService).client;
  private auth = inject(Auth);

  // Si el registro falla, la acción ya hecha no se corta: solo se avisa en la consola.
  async registrar(accion: string, entidad: string, entidadId: string | number | null, detalle: string) {
    const perfil = this.auth.perfil();
    if (!perfil) return;

    const { error } = await this.supabase.from('logs_actividad').insert({
      usuario_id: perfil.id,
      usuario_nombre: perfil.nombre + ' ' + perfil.apellido,
      accion: accion,
      entidad: entidad,
      entidad_id: entidadId === null ? null : String(entidadId),
      detalle: detalle,
    });
    if (error) console.error('No se pudo registrar la actividad:', error);
  }

  async listar(): Promise<Actividad[]> {
    const { data, error } = await this.supabase
      .from('logs_actividad')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(300);
    if (error) throw error;
    return data ?? [];
  }
}
