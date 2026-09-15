export type RolUsuario = 'cliente' | 'empleado' | 'administrador';

export interface Perfil {
  id: string;
  rol: RolUsuario;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string; // formato ISO: 'YYYY-MM-DD'
  tipo_sangre?: string;
  color_ojos?: string;
  dias_vacaciones?: number;
  puntos: number;
  credito: number;
  cupon_bienvenida_usado: boolean;
  created_at: string;
}