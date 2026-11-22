export type EstadoOrden = 'pendiente' | 'pagada' | 'cancelada';

export interface Orden {
  id: string;
  usuario_id: string | null;
  subtotal: number;
  descuento: number;
  credito_usado: number;
  total: number; // subtotal - descuento - credito_usado
  estado: EstadoOrden;
  cupon_id: string | null;
  created_at: string;
}
