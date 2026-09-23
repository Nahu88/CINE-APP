import { inject, Service } from '@angular/core';
import { Pelicula } from '../models/pelicula.model';
import { SupabaseService } from './supabase';

export interface DatosPelicula {
  nombre: string;
  sinopsis: string;
  imagen_url: string;
  duracion_minutos: number;
  restriccion_edad: number | null;
  fecha_estreno: string | null; // null si ya está en cartelera
  destacada: boolean;
  activa: boolean;
  generos: string[];
}

@Service()
export class PeliculasService {
  private supabase = inject(SupabaseService).client;

  // Solo las activas, para la cartelera y "próximamente".
  async listarCartelera(): Promise<Pelicula[]> {
    const { data, error } = await this.supabase
      .from('peliculas')
      .select('*')
      .eq('activa', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  }

  // Todas, activas o no: para el listado del admin.
  async listarTodas(): Promise<Pelicula[]> {
    const { data, error } = await this.supabase
      .from('peliculas')
      .select('*')
      .order('nombre', { ascending: true });

    if (error) throw error;
    return data ?? [];
  }

  async crear(datos: DatosPelicula): Promise<void> {
    const { error } = await this.supabase.from('peliculas').insert(datos);
    if (error) throw error;
  }

  async actualizar(id: string, datos: DatosPelicula): Promise<void> {
    const { error } = await this.supabase.from('peliculas').update(datos).eq('id', id);
    if (error) throw error;
  }

  // Baja lógica: la película deja de verse en la cartelera pero no se pierde nada.
  async cambiarVisibilidad(id: string, activa: boolean): Promise<void> {
    const { error } = await this.supabase.from('peliculas').update({ activa }).eq('id', id);
    if (error) throw error;
  }

  // Borrado definitivo. Falla si la película ya tiene funciones (clave foránea).
  async eliminar(id: string): Promise<void> {
    const { error } = await this.supabase.from('peliculas').delete().eq('id', id);
    if (error) throw error;
  }
}