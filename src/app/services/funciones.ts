import { inject, Service } from '@angular/core';
import { Funcion, FormatoFuncion, IdiomaFuncion } from '../models/funcion.model';
import { SupabaseService } from './supabase';


// se tira un Error con este mensaje para poder distinguirlo en el catch del componente
export const SIN_SALA_DISPONIBLE = 'SIN_SALA_DISPONIBLE';

// Lo que manda el formulario. sala_id y fin no están porque los calcula el servicio.
export interface DatosFuncion {
  pelicula_id: string;
  inicio: string;
  formato: FormatoFuncion;
  idioma: IdiomaFuncion;
  precio_normal: number;
  precio_vip: number;
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

  async eliminar(id: string): Promise<void> {
    const { error } = await this.supabase.from('funciones').delete().eq('id', id);
    if (error) throw error;
  }


    // duracionMinutos viene de la película elegida en el formulario:
    // el componente ya la tiene cargada, así se evita un segundo pedido.

    async crear(datos: DatosFuncion, duracionMinutos: number): Promise<void> {
      const inicio = new Date(datos.inicio);

      // Los 30 minutos de margen entre funciones se suman acá, una sola vez.
      const fin = new Date(inicio.getTime() + (duracionMinutos + 30) * 60_000);

      const salaId = await this.buscarSalaDisponible(inicio,fin);
      if(salaId == null)throw new Error(SIN_SALA_DISPONIBLE);

      const{error} = await this.supabase.from('funciones').insert({
        pelicula_id: datos.pelicula_id,
        sala_id: salaId,
        inicio: inicio.toISOString(),
        fin: fin.toISOString(),
        formato: datos.formato,
        idioma: datos.idioma,
        precio_normal: datos.precio_normal,
        precio_vip: datos.precio_vip,
        created_by: datos.creadoPor ?? null,
      });
      if(error)throw error;
    }


  // La asignación automática: recorre las salas una por una, y para
  // cada una recorre las funciones ya cargadas buscando si alguna
  // choca en el horario. La primera sala sin ningún choque es la que
  // se usa,salas y funciones se piden por separado.

  private async buscarSalaDisponible(inicio: Date, fin: Date): Promise<number | null> {
    const { data: salas, error: errorSalas } = await this.supabase.from('salas').select('id');
    if (errorSalas) throw errorSalas;

    const { data: funciones, error: errorFunciones } = await this.supabase .from('funciones').select('sala_id, inicio, fin');
    if (errorFunciones) throw errorFunciones;

    for (const sala of salas ?? []) {
      let seSuperpone = false;

      for (const funcion of funciones ?? []) {
        if (funcion.sala_id !== sala.id) continue;

        const inicioExistente = new Date(funcion.inicio);
        const finExistente = new Date(funcion.fin);

         // entre los 2 se superponen si cada uno empieza antes de que el otro termine.
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
