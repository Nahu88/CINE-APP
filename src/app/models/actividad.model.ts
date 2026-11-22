export interface Actividad {
  id: string;
  usuario_id: string;
  usuario_nombre: string | null;
  accion: string;
  entidad: string | null;
  entidad_id: string | null;
  detalle: string | null;
  created_at: string;
}
