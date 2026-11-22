export type EstadoEntrada = 'valida' | 'usada' | 'cancelada';

export interface Entrada {
  id: string;
  orden_id: string;
  funcion_id: string;
  butaca_id: number;
  precio: number;
  codigo_qr: string;
  estado: EstadoEntrada;
  validada_at?: string;
  validada_por?: string;
}

export interface EntradaDetalle {
  entrada: Entrada;
  pelicula: string;
  inicio: string;
  sala: string;
  butaca: string;
  restriccion_edad: number | null;
  candy: string[];
  qr: string; // la completa la pantalla que la muestra
}