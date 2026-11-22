import { inject, Service } from '@angular/core';
import { Entrada, EntradaDetalle } from '../models/entrada.model';
import { Orden } from '../models/orden.model';
import { CandyService } from './candy';
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
  private candyService = inject(CandyService);

  async listarOrdenesDelUsuario(usuarioId: string): Promise<Orden[]> {
    const { data, error } = await this.supabase
      .from('ordenes')
      .select('*')
      .eq('usuario_id', usuarioId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  async listarDeOrden(ordenId: string): Promise<Entrada[]> {
    const { data, error } = await this.supabase.from('entradas').select('*').eq('orden_id', ordenId);
    if (error) throw error;
    return data ?? [];
  }

  async listarDelUsuario(usuarioId: string): Promise<Entrada[]> {
    const ordenes = await this.listarOrdenesDelUsuario(usuarioId);

    const entradas: Entrada[] = [];
    for (const orden of ordenes) {
      const deLaOrden = await this.listarDeOrden(orden.id);
      for (const entrada of deLaOrden) {
        entradas.push(entrada);
      }
    }
    return entradas;
  }

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

  async armarDetalles(entradas: Entrada[]): Promise<EntradaDetalle[]> {
    const peliculas = await this.peliculasService.listarTodas();
    const funciones = await this.funcionesService.listar();
    const salas = await this.salasService.listar();
    const productos = await this.candyService.listarProductos();
    const combos = await this.candyService.listarCombos();

    // El candy es de la orden: se pide una vez por orden y se guarda acá.
    const candyPorOrden: { ordenId: string; textos: string[] }[] = [];

    const detalles: EntradaDetalle[] = [];
    for (const entrada of entradas) {
      const funcion = funciones.find((f) => f.id === entrada.funcion_id);
      const pelicula = peliculas.find((p) => p.id === funcion?.pelicula_id);
      const sala = salas.find((s) => s.id === funcion?.sala_id);
      const butaca = await this.textoButaca(entrada.butaca_id);

      let candy = candyPorOrden.find((c) => c.ordenId === entrada.orden_id);
      if (!candy) {
        const items = await this.candyService.listarItemsDeOrden(entrada.orden_id);
        candy = { ordenId: entrada.orden_id, textos: this.candyService.describirItems(items, productos, combos) };
        candyPorOrden.push(candy);
      }

      detalles.push({
        entrada: entrada,
        pelicula: pelicula?.nombre ?? '',
        inicio: funcion?.inicio ?? '',
        sala: sala?.nombre ?? '',
        butaca: butaca,
        restriccion_edad: pelicula?.restriccion_edad ?? null,
        candy: candy.textos,
        qr: '',
      });
    }
    return detalles;
  }

  private async textoButaca(butacaId: number): Promise<string> {
    const { data, error } = await this.supabase.from('butacas').select('*').eq('id', butacaId);
    if (error) throw error;

    if (data.length === 0) {
      return '';
    }
    return 'Fila ' + data[0].fila + ', butaca ' + data[0].numero;
  }
}
