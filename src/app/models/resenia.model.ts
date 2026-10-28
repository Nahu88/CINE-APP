export interface Resenia {
  id: string;
  pelicula_id: string;
  usuario_id: string;
  autor: string | null; // nombre de quien la escribió
  estrellas: number; // de 1 a 5
  comentario: string | null;
  created_at: string;
}
