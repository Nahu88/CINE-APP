export interface Categoria {
  id: number;
  nombre: string;
}

export interface Producto {
  id: string;
  categoria_id: number | null;
  nombre: string;
  precio: number;
  imagen_url?: string;
  activo: boolean;
}

export interface Combo {
  id: string;
  nombre: string;
  precio: number;
  activo: boolean;
}

export interface ComboItem {
  combo_id: string;
  producto_id: string;
  cantidad: number;
}

export interface OrdenItem {
  id: string;
  orden_id: string;
  producto_id: string | null;
  combo_id: string | null;
  cantidad: number;
  precio_unitario: number;
  entregado: boolean;
  entregado_at?: string;
  entregado_por?: string;
}

export interface ItemCarrito {
  producto_id: string | null;
  combo_id: string | null;
  nombre: string;
  precio: number;
  cantidad: number;
}
