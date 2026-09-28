import { inject, Service } from '@angular/core';
import { Sala, TipoButaca } from '../models/sala.model';
import { SupabaseService } from './supabase';

export interface DatosSala {
  nombre: string;
}


// FILAS J Y K SON ACCESIBLES, R/S/T son VIP, el resto normales.

const FILAS = 'ABCDEFGHIJKLMNOPQRST'.split('');
const FILAS_ACCESIBLES = ['J', 'K'];
const FILAS_VIP = ['R', 'S', 'T'];

interface ButacaNueva {
  sala_id: number;
  fila: string;
  numero: number;
  tipo: TipoButaca;
}

@Service()
export class SalasService {
  private supabase = inject(SupabaseService).client;

  async listar(): Promise<Sala[]> {
    const { data, error } = await this.supabase.from('salas').select('*').order('nombre');
    if (error) throw error;
    return data ?? [];
  }

  async crear(datos: DatosSala): Promise<void> {
    const { data, error } = await this.supabase.from('salas').insert(datos).select('id');
    if (error) throw error;

    
    // El insert devuelve un array de una fila; tomamos el id de esa primera fila.
    const salaId = data[0].id;
    await this.generarButacas(salaId);
  }

  async eliminar(id: number): Promise<void> {
    const { error } = await this.supabase.from('salas').delete().eq('id', id);
    if (error) throw error;
  }


  
  // Genera las butacas de una sala recién creada: 18 filas normales/VIP
  // de 28 butacas (4+20+4) y 2 filas accesibles de 14 (2+10+2).
  // Toda sala nueva tiene siempre exactamente 532 butacas.
  private async generarButacas(salaId: number): Promise<void> {
    const butacas: ButacaNueva[] = [];
 
    for (const fila of FILAS) {
      const accesible = FILAS_ACCESIBLES.includes(fila);
      const vip = FILAS_VIP.includes(fila);
      const tipo: TipoButaca = accesible ? 'accesible' : vip ? 'vip' : 'normal';
      const totalButacas = accesible ? 14 : 28;
 
      for (let numero = 1; numero <= totalButacas; numero++) {
        butacas.push({ sala_id: salaId, fila, numero, tipo });
      }
    }
 
    const { error } = await this.supabase.from('butacas').insert(butacas);
    if (error) throw error;
  }
}
