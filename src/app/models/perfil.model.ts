export type RolUsuario = 'cliente' | 'empleado' | 'administrador';

export interface Perfil {
  id: string;
  rol: RolUsuario;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string;
  tipo_sangre?: string;
  color_ojos?: string;
  dias_vacaciones?: number;
  puntos: number;
  credito: number;
  cupon_bienvenida_usado: boolean;
  rol_personalizado_id: string | null;
  invitado: boolean; // compró sin registrarse (sesión anónima)
  created_at: string;
}