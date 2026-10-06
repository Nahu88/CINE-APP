import { inject, Service } from '@angular/core';
import { Entrada, EntradaDetalle } from '../models/entrada.model';
import { FuncionesService } from './funciones';
import { PeliculasService } from './peliculas';
import { SalasService } from './salas';
import { SupabaseService } from './supabase';

@Service()
export class EntradasService {
  private supabase = inject(SupabaseService).client;
  private peliculasService = inject(PeliculasService);
  private funcionesService = inject(FuncionesService);
  private salasService = inject(SalasService);

  // Entradas de un usuario. primero sus órdenes y después
  // las entradas de cada orden, una consulta atrás de la otra.
  async listarDelUsuario(usuarioId: string): Promise<Entrada[]> {
    const { data: ordenes, error } = await this.supabase
      .from('ordenes')
      .select('*')
      .eq('usuario_id', usuarioId);
    if (error) throw error;

    const entradas: Entrada[] = [];
    for (const orden of ordenes ?? []) {
      const { data, error: errorEntradas } = await this.supabase
        .from('entradas')
        .select('*')
        .eq('orden_id', orden.id);
      if (errorEntradas) throw errorEntradas;

      for (const entrada of data ?? []) {
        entradas.push(entrada);
      }
    }
    return entradas;
  }

  // Lo usa el empleado. Devuelve la entrada, o null si el código no existe.
  async buscarPorCodigo(codigo: string): Promise<Entrada | null> {
    const { data, error } = await this.supabase.from('entradas').select('*').eq('codigo_qr', codigo);
    if (error) throw error;

    if (data.length === 0) {
      return null;
    }
    return data[0];
  }

  async marcarUsada(entradaId: string, empleadoId: string): Promise<void> {
    const { error } = await this.supabase
      .from('entradas')
      .update({
        estado: 'usada',
        validada_at: new Date().toISOString(),
        validada_por: empleadoId,
      })
      .eq('id', entradaId);
    if (error) throw error;
  }

  // Completa cada entrada con el nombre de la película, la sala, el horario
  // y la butaca. Los nombres se resuelven con .find() sobre los arrays ya
  // cargados, igual que en el detalle de película y en la compra.
  async armarDetalles(entradas: Entrada[]): Promise<EntradaDetalle[]> {
    const peliculas = await this.peliculasService.listarTodas();
    const funciones = await this.funcionesService.listar();
    const salas = await this.salasService.listar();

    const detalles: EntradaDetalle[] = [];
    for (const entrada of entradas) {
      const funcion = funciones.find((f) => f.id === entrada.funcion_id);
      const pelicula = peliculas.find((p) => p.id === funcion?.pelicula_id);
      const sala = salas.find((s) => s.id === funcion?.sala_id);
      const butaca = await this.textoButaca(entrada.butaca_id);

      detalles.push({
        entrada: entrada,
        pelicula: pelicula?.nombre ?? '',
        inicio: funcion?.inicio ?? '',
        sala: sala?.nombre ?? '',
        butaca: butaca,
        qr: '',
      });
    }
    return detalles;
  }

  // Busca una butaca por id y devuelve el texto "Fila F, butaca 12".
  private async textoButaca(butacaId: number): Promise<string> {
    const { data, error } = await this.supabase.from('butacas').select('*').eq('id', butacaId);
    if (error) throw error;

    if (data.length === 0) {
      return '';
    }
    return 'Fila ' + data[0].fila + ', butaca ' + data[0].numero;
  }
}