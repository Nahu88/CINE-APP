export type EstadoEntrada = 'valida' | 'usada' | 'cancelada';

// Una fila de la tabla `entradas`.
export interface Entrada {
  id: string;
  orden_id: string;
  funcion_id: string;
  butaca_id: number;
  precio: number;
  codigo_qr: string; // texto único de la entrada: es lo que va adentro del QR
  estado: EstadoEntrada;
  validada_at?: string; // cuándo se usó
  validada_por?: string; // id del empleado que la validó
}

// La entrada con los nombres ya resueltos, lista para mostrar en pantalla o en el PDF.
export interface EntradaDetalle {
  entrada: Entrada;
  pelicula: string;
  inicio: string;
  sala: string;
  butaca: string; 
  qr: string; // imagen del QR; la completa la pantalla "Mis entradas"
}