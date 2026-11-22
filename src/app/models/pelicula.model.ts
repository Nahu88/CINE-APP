export interface Pelicula {
  id: string;
  nombre: string;
  sinopsis?: string;
  imagen_url?: string;
  duracion_minutos: number;
  restriccion_edad?: number; // null, 13 o 18
  fecha_estreno?: string;
  destacada: boolean;
  activa: boolean;
  generos: string[];
  created_at: string;
}

// Alias que usan card-pelicula y home.
export type PeliculaConGeneros = Pelicula;
