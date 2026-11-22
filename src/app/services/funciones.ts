import { inject, Service } from '@angular/core';
import { Funcion, FormatoFuncion, IdiomaFuncion } from '../models/funcion.model';
import { SupabaseService } from './supabase';

// Mensaje del Error, para distinguirlo en el catch del componente.
export const SIN_SALA_DISPONIBLE = 'SIN_SALA_DISPONIBLE';

// sala_id y fin los calcula el servicio.
export interface DatosFuncion {
  pelicula_id: string;
  inicio: string;
  formato: FormatoFuncion;
  idioma: IdiomaFuncion;
  precio_normal: number;
  precio_vip: number;
  precio_preventa: number | null; // null si no tiene preventa
  preventa_desde: string | null;
  creadoPor?: string;
}

@Service()

export class FuncionesService {
  private supabase = inject(SupabaseService).client;

  async listar(): Promise<Funcion[]> {
    const { data, error } = await this.supabase.from('funciones').select('*').order('inicio');
    if (error) throw error;
    return data ?? [];
  }

  // La función cancelar_funcion de la base acredita a todos en una sola transacción.
  // Devuelve cuántas compras se acreditaron.
  async cancelar(id: string): Promise<number> {
    const { data, error } = await this.supabase.rpc('cancelar_funcion', { p_funcion_id: id });
    if (error) throw error;
    return data ?? 0;
  }

  async eliminar(id: string): Promise<void> {
    const { error } = await this.supabase.from('funciones').delete().eq('id', id);
    if (error) throw error;
  }

    async crear(datos: DatosFuncion, duracionMinutos: number): Promise<string> {
      const inicio = new Date(datos.inicio);

      const fin = new Date(inicio.getTime() + (duracionMinutos + 30) * 60_000);

      const salaId = await this.buscarSalaDisponible(inicio,fin);
      if(salaId == null)throw new Error(SIN_SALA_DISPONIBLE);

      const { data, error } = await this.supabase.from('funciones').insert({
        pelicula_id: datos.pelicula_id,
        sala_id: salaId,
        inicio: inicio.toISOString(),
        fin: fin.toISOString(),
        formato: datos.formato,
        idioma: datos.idioma,
        precio_normal: datos.precio_normal,
        precio_vip: datos.precio_vip,
        precio_preventa: datos.precio_preventa,
        preventa_desde: datos.preventa_desde,
        created_by: datos.creadoPor ?? null,
      }).select('id');
      if (error) throw error;
      return data[0].id;
    }

  // La primera sala sin superposición de horario es la que se usa.

  private async buscarSalaDisponible(inicio: Date, fin: Date): Promise<number | null> {
    const { data: salas, error: errorSalas } = await this.supabase.from('salas').select('id');
    if (errorSalas) throw errorSalas;

    const { data: funciones, error: errorFunciones } = await this.supabase .from('funciones').select('sala_id, inicio, fin').eq('cancelada', false); // una cancelada deja la sala libre
    if (errorFunciones) throw errorFunciones;

    for (const sala of salas ?? []) {
      let seSuperpone = false;

      for (const funcion of funciones ?? []) {
        if (funcion.sala_id !== sala.id) continue;

        const inicioExistente = new Date(funcion.inicio);
        const finExistente = new Date(funcion.fin);

         // Se superponen si cada uno empieza antes de que el otro termine.
        if (inicio < finExistente && inicioExistente < fin) {
          seSuperpone = true;
          break;
        }
      }

      if (!seSuperpone) {
        return sala.id;
      }
    }

    return null;
  }
}
