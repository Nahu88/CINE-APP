export type EstadoOrden = 'pendiente' | 'pagada' | 'cancelada';

// Una compra completa: puede tener varias entradas y productos del candy.
export interface Orden {
  id: string;
  usuario_id: string | null;
  subtotal: number; // entradas + candy, sin descuentos
  descuento: number; // lo que restó el cupón o el canje de una entrada
  credito_usado: number; // la parte que se pagó con crédito
  total: number; // lo que se pagó: subtotal - descuento - credito_usado
  estado: EstadoOrden;
  cupon_id: string | null;
  created_at: string;
}
