export type TipoCupon = 'bienvenida' | 'mayores_50' | 'general';

export interface Cupon {
  id: string;
  tipo: TipoCupon;
  nombre: string | null;
  porcentaje: number;
  activo: boolean;
}

// Si producto_id es null, la recompensa es una entrada gratis.
export interface Recompensa {
  id: string;
  descripcion: string;
  puntos_requeridos: number;
  producto_id: string | null;
  activa: boolean;
}

export interface Canje {
  id: string;
  usuario_id: string;
  recompensa_id: string;
  orden_id: string | null;
  puntos_usados: number;
  created_at: string;
}

// Puntos y crédito se guardan como movimientos: positivo si suma,
// negativo si se usa. El saldo es la suma de todos.
export interface MovimientoPuntos {
  id: string;
  usuario_id: string;
  orden_id: string | null;
  puntos: number;
  motivo: string;
  created_at: string;
}

export interface MovimientoCredito {
  id: string;
  usuario_id: string;
  orden_id: string | null;
  monto: number;
  motivo: string;
  created_at: string;
}
