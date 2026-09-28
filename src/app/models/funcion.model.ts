export type FormatoFuncion = '2D' | '3D' | '4D' | '5D';
export type IdiomaFuncion = 'castellano' | 'subtitulada';

export interface Funcion {
  id: string;
  pelicula_id: string;
  sala_id: number;
  inicio: string; // 
  fin: string; //  — inicio + duración de la película + 30 min
  formato: FormatoFuncion;
  idioma: IdiomaFuncion;
  precio_normal: number;
  precio_vip: number;
  preventa_desde?: string;
  precio_preventa?: number;
  created_at: string;
  created_by?: string;
}