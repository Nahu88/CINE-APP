import { PeliculaConGeneros } from '../../models/pelicula.model';

// Datos de ejemplo para el diseño: se reemplazan por el servicio de películas.
// Clasificaciones adaptadas al esquema del TP (ATP / +13 / +18).
// OJO: las duraciones y los géneros son aproximados, hay que cargar los reales en el ABM.

export const CARTELERA_EJEMPLO: PeliculaConGeneros[] = [
  {
    id: 'terminator-2',
    nombre: 'Terminator 2: El juicio final',
    sinopsis:
      'Un nuevo Terminator viaja al pasado para matar a John Connor, el chico que va a liderar la resistencia humana. Para protegerlo, la resistencia envía a un modelo idéntico al que años atrás intentó matar a su madre. Reestreno por los 35 años.',
    duracion_minutos: 137,
    restriccion_edad: 13,
    destacada: true,
    generos: ['Acción', 'Ciencia ficción'],
    created_at: '2026-09-01',
  },
  {
    id: 'coyote-vs-acme',
    nombre: 'Coyote vs. Acme',
    duracion_minutos: 100,
    destacada: false,
    generos: ['Animación', 'Comedia'],
    created_at: '2026-09-01',
  },
  {
    id: 'yo-narciso',
    nombre: 'Yo, Narciso',
    duracion_minutos: 105,
    destacada: false,
    generos: ['Comedia'],
    created_at: '2026-09-01',
  },
  {
    id: 'pepita-la-pistolera',
    nombre: 'Pepita La Pistolera',
    duracion_minutos: 110,
    restriccion_edad: 18,
    destacada: false,
    generos: ['Drama', 'Policial'],
    created_at: '2026-09-01',
  },
  {
    id: 'zona-cero',
    nombre: 'Zona Cero',
    duracion_minutos: 108,
    restriccion_edad: 13,
    destacada: false,
    generos: ['Suspenso', 'Aventura'],
    created_at: '2026-09-01',
  },
  {
    id: 'la-vida-es-asi',
    nombre: 'La vida es así',
    duracion_minutos: 102,
    destacada: false,
    generos: ['Comedia', 'Drama'],
    created_at: '2026-09-01',
  },
];

export const PROXIMAMENTE_EJEMPLO: PeliculaConGeneros[] = [
  {
    id: 'nct-127-the-redline',
    nombre: 'NCT 127: The Redline',
    duracion_minutos: 120,
    fecha_estreno: '2026-09-20',
    destacada: false,
    generos: ['Música'],
    created_at: '2026-09-01',
  },
  {
    id: 'linkin-park-unshatter',
    nombre: 'Linkin Park: Unshatter',
    duracion_minutos: 115,
    fecha_estreno: '2026-09-30',
    destacada: false,
    generos: ['Música'],
    created_at: '2026-09-01',
  },
  {
    id: 'queen-budapest',
    nombre: 'Queen Budapest',
    duracion_minutos: 98,
    fecha_estreno: '2026-10-07',
    destacada: false,
    generos: ['Música', 'Documental'],
    created_at: '2026-09-01',
  },
  {
    id: 'always-lalisa',
    nombre: 'Always Lalisa',
    duracion_minutos: 95,
    fecha_estreno: '2026-10-12',
    destacada: false,
    generos: ['Música', 'Documental'],
    created_at: '2026-09-01',
  },
  {
    id: 'la-noche-del-demonio',
    nombre: 'La noche del demonio: Están entre nosotros',
    duracion_minutos: 103,
    restriccion_edad: 18,
    fecha_estreno: '2026-10-22',
    destacada: false,
    generos: ['Terror'],
    created_at: '2026-09-01',
  },
  {
    id: 'spider-man-un-nuevo-dia',
    nombre: 'Spider-Man: Un nuevo día',
    duracion_minutos: 125,
    restriccion_edad: 13,
    fecha_estreno: '2026-10-29',
    destacada: false,
    generos: ['Acción', 'Aventura'],
    created_at: '2026-09-01',
  },
];
