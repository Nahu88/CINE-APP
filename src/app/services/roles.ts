import { inject, Service } from '@angular/core';
import { Perfil } from '../models/perfil.model';
import { Rol } from '../models/rol.model';
import { SupabaseService } from './supabase';

export interface DatosRol {
  nombre: string;
  permisos: string[];
}

@Service()
export class RolesService {
  private supabase = inject(SupabaseService).client;

  async listar(): Promise<Rol[]> {
    const { data, error } = await this.supabase.from('roles').select('*').order('nombre');
    if (error) throw error;
    return data ?? [];
  }

  async crear(datos: DatosRol): Promise<void> {
    const { error } = await this.supabase.from('roles').insert(datos);
    if (error) throw error;
  }

  async actualizar(id: string, datos: DatosRol): Promise<void> {
    const { error } = await this.supabase.from('roles').update(datos).eq('id', id);
    if (error) throw error;
  }

  // Los usuarios que lo tenían quedan sin rol configurable (on delete set null).
  async eliminar(id: string): Promise<void> {
    const { error } = await this.supabase.from('roles').delete().eq('id', id);
    if (error) throw error;
  }

  async listarUsuarios(): Promise<Perfil[]> {
    const { data, error } = await this.supabase
      .from('perfiles')
      .select('*')
      .eq('invitado', false)
      .order('nombre');
    if (error) throw error;
    return data ?? [];
  }

  // rolId null = sacarle el rol configurable.
  async asignar(usuarioId: string, rolId: string | null): Promise<void> {
    const { error } = await this.supabase
      .from('perfiles')
      .update({ rol_personalizado_id: rolId })
      .eq('id', usuarioId);
    if (error) throw error;
  }
}
