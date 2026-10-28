// Una fila de `logs_actividad`: quién hizo qué y cuándo.
export interface Actividad {
  id: string;
  usuario_id: string;
  usuario_nombre: string | null;
  accion: string; // ej: 'crear_funcion', 'modificar_precio', 'validar_qr'
  entidad: string | null; // ej: 'funciones', 'productos'
  entidad_id: string | null;
  detalle: string | null; // texto corto con los datos de la acción
  created_at: string;
}
