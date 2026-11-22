import { inject, Service } from '@angular/core';
import { Sala, TipoButaca } from '../models/sala.model';
import { SupabaseService } from './supabase';

export interface DatosSala {
  nombre: string;
}

// Filas J y K accesibles, R, S y T VIP, el resto normales.

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

    const salaId = data[0].id;
    await this.generarButacas(salaId);
  }

  async cambiarTipoButaca(butacaId: number, tipo: TipoButaca): Promise<void> {
    const { error } = await this.supabase.from('butacas').update({ tipo }).eq('id', butacaId);
    if (error) throw error;
  }

  async eliminar(id: number): Promise<void> {
    const { error } = await this.supabase.from('salas').delete().eq('id', id);
    if (error) throw error;
  }

  // 18 filas de 28 butacas (4+20+4) y 2 accesibles de 14 (2+10+2): 532 en total.
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
