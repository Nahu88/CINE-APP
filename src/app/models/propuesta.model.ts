export type EstadoPropuesta = 'pendiente' | 'aceptada' | 'rechazada';

export interface Propuesta {
  id: string;
  usuario_id: string;
  autor: string;
  titulo: string;
  descripcion: string;
  motivo: string;
  estado: EstadoPropuesta;
  created_at: string;
}
