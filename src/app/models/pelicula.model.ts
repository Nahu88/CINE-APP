export interface Pelicula {
  id: string;
  nombre: string;
  sinopsis?: string;
  imagen_url?: string;
  duracion_minutos: number;
  restriccion_edad?: number; // null, 13 o 18
  fecha_estreno?: string;
  destacada: boolean;
  activa: boolean; // si aparece o no en la cartelera pública
  generos: string[]; // guardado directo en la película, sin tabla aparte
  created_at: string;
}

// Alias para no tener que renombrar en los componentes que se usaban PeliculaConGeneros (card-pelicula, home).
export type PeliculaConGeneros = Pelicula;
