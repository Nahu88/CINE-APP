export interface Pelicula {
  id: string;
  nombre: string;
  sinopsis?: string;
  imagen_url?: string;
  duracion_minutos: number;
  restriccion_edad?: number; // null, 13 o 18
  fecha_estreno?: string;
  destacada: boolean;
  created_at: string;
}

export interface Genero {
  id: number;
  nombre: string;
}