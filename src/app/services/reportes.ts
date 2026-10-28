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

// Reportes del administrador (RF-59 a RF-62). Se traen las filas de la
// base y se agrupan acá, recorriéndolas con un for.
@Service()
export class ReportesService {
  private supabase = inject(SupabaseService).client;
  private peliculasService = inject(PeliculasService);
  private funcionesService = inject(FuncionesService);
  private candyService = inject(CandyService);

  // Las compras pagadas de los últimos `dias` días. Se traen todas las
  // pagadas y la fecha se filtra acá, con un filter.
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

  // Las entradas no canceladas que pertenecen a esas compras.
  private async entradasDe(ordenes: { id: string }[]) {
    const { data, error } = await this.supabase.from('entradas').select('orden_id, funcion_id, estado');
    if (error) throw error;

    return (data ?? []).filter(
      (entrada) => entrada.estado !== 'cancelada' && ordenes.find((o) => o.id === entrada.orden_id)
    );
  }

  // RF-59: facturación y entradas vendidas por día.
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

    // El día más reciente arriba: las fechas 'YYYY-MM-DD' se pueden comparar con < y >.
    filas.sort((a, b) => (a.dia < b.dia ? 1 : -1));
    return filas;
  }

  // RF-61: películas con más entradas vendidas en los últimos `dias` días
  // (7 para la semana, 30 para el mes).
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

  // RF-62: productos y combos del candy más vendidos, sumando las cantidades.
  async candyMasVendido(dias: number): Promise<FilaRanking[]> {
    const ordenes = await this.ordenesPagadas(dias);

    // Todos los items del candy, y se quedan solo los de esas compras.
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

  // RF-60: exportar a Excel. Se arma un archivo CSV, que Excel abre directo,
  // sin agregar otra librería. El ';' separa columnas como espera Excel en
  // español, y el '﻿' del principio hace que respete las tildes.
  descargarCsv(nombreArchivo: string, encabezados: string[], filas: string[][]) {
    const lineas: string[] = [encabezados.join(';')];
    for (const fila of filas) {
      lineas.push(fila.join(';'));
    }
    const archivo = new Blob(['﻿' + lineas.join('\n')], { type: 'text/csv;charset=utf-8' });

    // Se crea un link invisible apuntando al archivo y se le hace clic.
    const link = document.createElement('a');
    link.href = URL.createObjectURL(archivo);
    link.download = nombreArchivo;
    link.click();
    URL.revokeObjectURL(link.href);
  }
}
