import { inject, Service } from '@angular/core';
import { diaLocal } from '../utils/fechas';
import { CandyService } from './candy';
import { FuncionesService } from './funciones';
import { PeliculasService } from './peliculas';
import { SupabaseService } from './supabase';

export interface FilaFacturacion {
  dia: string; // 'YYYY-MM-DD'
  compras: number;
  entradas: number;
  facturacion: number;
}

export interface FilaRanking {
  nombre: string;
  cantidad: number;
}

@Service()
export class ReportesService {
  private supabase = inject(SupabaseService).client;
  private peliculasService = inject(PeliculasService);
  private funcionesService = inject(FuncionesService);
  private candyService = inject(CandyService);

  // La fecha se filtra acá, no en la consulta.
  private async ordenesPagadas(dias: number) {
    const { data, error } = await this.supabase
      .from('ordenes')
      .select('id, created_at, total')
      .eq('estado', 'pagada');
    if (error) throw error;

    const desde = new Date();
    desde.setDate(desde.getDate() - dias);
    return (data ?? []).filter((orden) => new Date(orden.created_at) >= desde);
  }

  private async entradasDe(ordenes: { id: string }[]) {
    const { data, error } = await this.supabase.from('entradas').select('orden_id, funcion_id, estado');
    if (error) throw error;

    return (data ?? []).filter(
      (entrada) => entrada.estado !== 'cancelada' && ordenes.find((o) => o.id === entrada.orden_id)
    );
  }

  async facturacionDiaria(dias: number): Promise<FilaFacturacion[]> {
    const ordenes = await this.ordenesPagadas(dias);
    const entradas = await this.entradasDe(ordenes);

    const filas: FilaFacturacion[] = [];

    for (const orden of ordenes) {
      const dia = diaLocal(new Date(orden.created_at));
      let fila = filas.find((f) => f.dia === dia);
      if (!fila) {
        fila = { dia: dia, compras: 0, entradas: 0, facturacion: 0 };
        filas.push(fila);
      }
      fila.compras++;
      fila.facturacion += Number(orden.total);
    }

    for (const entrada of entradas) {
      const orden = ordenes.find((o) => o.id === entrada.orden_id);
      if (!orden) continue;
      const fila = filas.find((f) => f.dia === diaLocal(new Date(orden.created_at)));
      if (fila) fila.entradas++;
    }

    // Las fechas 'YYYY-MM-DD' se pueden comparar como texto.
    filas.sort((a, b) => (a.dia < b.dia ? 1 : -1));
    return filas;
  }

  async peliculasMasVistas(dias: number): Promise<FilaRanking[]> {
    const ordenes = await this.ordenesPagadas(dias);
    const entradas = await this.entradasDe(ordenes);

    const funciones = await this.funcionesService.listar();
    const peliculas = await this.peliculasService.listarTodas();

    const filas: FilaRanking[] = [];
    for (const entrada of entradas) {
      const funcion = funciones.find((f) => f.id === entrada.funcion_id);
      const pelicula = peliculas.find((p) => p.id === funcion?.pelicula_id);
      const nombre = pelicula?.nombre ?? '(eliminada)';

      let fila = filas.find((f) => f.nombre === nombre);
      if (!fila) {
        fila = { nombre: nombre, cantidad: 0 };
        filas.push(fila);
      }
      fila.cantidad++;
    }

    filas.sort((a, b) => b.cantidad - a.cantidad);
    return filas;
  }

  async candyMasVendido(dias: number): Promise<FilaRanking[]> {
    const ordenes = await this.ordenesPagadas(dias);

    const { data, error } = await this.supabase.from('orden_items').select('*');
    if (error) throw error;
    const items = (data ?? []).filter((item) => ordenes.find((o) => o.id === item.orden_id));

    const productos = await this.candyService.listarProductos();
    const combos = await this.candyService.listarCombos();

    const filas: FilaRanking[] = [];
    for (const item of items) {
      const producto = productos.find((p) => p.id === item.producto_id);
      const combo = combos.find((c) => c.id === item.combo_id);
      const nombre = producto?.nombre ?? (combo ? 'Combo ' + combo.nombre : '(eliminado)');

      let fila = filas.find((f) => f.nombre === nombre);
      if (!fila) {
        fila = { nombre: nombre, cantidad: 0 };
        filas.push(fila);
      }
      fila.cantidad += item.cantidad;
    }

    filas.sort((a, b) => b.cantidad - a.cantidad);
    return filas;
  }

  // CSV para Excel: ';' separa columnas en Excel en español
  // y el BOM del principio hace que respete las tildes.
  descargarCsv(nombreArchivo: string, encabezados: string[], filas: string[][]) {
    const lineas: string[] = [encabezados.join(';')];
    for (const fila of filas) {
      lineas.push(fila.join(';'));
    }
    const archivo = new Blob(['﻿' + lineas.join('\n')], { type: 'text/csv;charset=utf-8' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(archivo);
    link.download = nombreArchivo;
    link.click();
    URL.revokeObjectURL(link.href);
  }
}
