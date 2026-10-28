import { inject, Service } from '@angular/core';
import { Actividad } from '../models/actividad.model';
import { Auth } from './auth';
import { SupabaseService } from './supabase';

// Registro de actividad (RF-63): quién creó cada función, quién cambió
// un precio, quién validó un QR, etc. Cada pantalla lo llama después de
// hacer una acción importante.
@Service()
export class ActividadService {
  private supabase = inject(SupabaseService).client;
  private auth = inject(Auth);

  // `detalle` es un texto corto, por ejemplo "Pochoclo grande: de $3000 a $3500".
  // Si el registro falla no se corta la acción que ya se hizo: solo se avisa en la consola.
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

  // Las últimas 300 acciones, la más nueva arriba.
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
