export interface Rol {
  id: string;
  nombre: string;
  permisos: string[]; // claves de SECCIONES_PANEL
}

export interface SeccionPanel {
  clave: string; // lo que se guarda en roles.permisos y se pasa a permisoGuard
  nombre: string;
  ruta: string;
  detalle: string;
  grupo: string;
}

// Una sola lista para el inicio del panel, la pantalla de roles y las rutas.
export const SECCIONES_PANEL: SeccionPanel[] = [
  { clave: 'peliculas', nombre: 'Películas', ruta: '/admin/peliculas', detalle: 'Alta, edición y visibilidad', grupo: 'Cartelera' },
  { clave: 'generos', nombre: 'Géneros', ruta: '/admin/generos', detalle: 'La lista para clasificar películas', grupo: 'Cartelera' },
  { clave: 'propuestas', nombre: 'Propuestas', ruta: '/admin/propuestas', detalle: 'Películas que piden los clientes', grupo: 'Cartelera' },
  { clave: 'funciones', nombre: 'Funciones', ruta: '/admin/funciones', detalle: 'Programación, cancelación y lista de espera', grupo: 'Cartelera' },
  { clave: 'salas', nombre: 'Salas y butacas', ruta: '/admin/salas', detalle: 'Salas y su distribución', grupo: 'Cartelera' },
  { clave: 'productos', nombre: 'Productos', ruta: '/admin/productos', detalle: 'Productos y categorías', grupo: 'Candy bar' },
  { clave: 'combos', nombre: 'Combos', ruta: '/admin/combos', detalle: 'Combos con precio fijo', grupo: 'Candy bar' },
  { clave: 'cupones', nombre: 'Cupones', ruta: '/admin/cupones', detalle: 'Bienvenida, mayores de 50 y generales', grupo: 'Beneficios' },
  { clave: 'recompensas', nombre: 'Recompensas', ruta: '/admin/recompensas', detalle: 'Qué se canjea con puntos', grupo: 'Beneficios' },
  { clave: 'reportes', nombre: 'Reportes', ruta: '/admin/reportes', detalle: 'Facturación, ranking y exportación', grupo: 'Control' },
  { clave: 'actividad', nombre: 'Actividad', ruta: '/admin/actividad', detalle: 'Quién hizo qué y cuándo', grupo: 'Control' },
  { clave: 'validar', nombre: 'Validar entradas', ruta: '/empleado/validar', detalle: 'Ingreso a sala y candy', grupo: 'Control' },
];
