export interface Resenia {
  id: string;
  pelicula_id: string;
  usuario_id: string;
  autor: string | null;
  estrellas: number; // de 1 a 5
  comentario: string | null;
  created_at: string;
}
