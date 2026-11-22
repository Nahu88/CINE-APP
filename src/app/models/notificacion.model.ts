export interface Notificacion {
  id: string;
  usuario_id: string;
  titulo: string;
  mensaje: string;
  link: string | null; // a dónde lleva el botón del aviso
  leida: boolean;
  created_at: string;
}
