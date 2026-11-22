export type EstadoPropuesta = 'pendiente' | 'aceptada' | 'rechazada';

// Una fila de la tabla `propuestas`: una película que un cliente quiere ver en el cine.
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
