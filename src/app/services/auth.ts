import { inject, Service } from '@angular/core';
import { Perfil } from '../models/perfil.model';
import { SupabaseService } from './supabase';

export interface DatosRegistro {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string;
  tipo_sangre: string;
  color_ojos: string;
  dias_vacaciones: number;
}

@Service()
export class Auth {
  // Cliente compartido para que toda la app use la misma sesión.
  private supabase = inject(SupabaseService).client;

  async registrar(datos: DatosRegistro) {
    const { data: authData, error: authError } = await this.supabase.auth.signUp({
      email: datos.email,
      password: datos.password,
    });

    if (authError || !authData.user) {
      return { data: null, error: authError };
    }

    // Sin sesión RLS rechaza el insert en perfiles (pasa si "Confirm email" está activado).
    if (!authData.session) {
      return {
        data: authData,
        error: new Error(
          'signUp no devolvió sesión: desactivar "Confirm email" en Supabase (Authentication > Providers > Email).'
        ),
      };
    }

    const nuevoPerfil: Partial<Perfil> = {
      id: authData.user.id,
      rol: 'cliente',
      nombre: datos.nombre,
      apellido: datos.apellido,
      fecha_nacimiento: datos.fecha_nacimiento,
      tipo_sangre: datos.tipo_sangre,
      color_ojos: datos.color_ojos,
      dias_vacaciones: datos.dias_vacaciones,
      puntos: 0,
      credito: 0,
      cupon_bienvenida_usado: false,
    };

    const { error: perfilError } = await this.supabase
      .from('perfiles')
      .insert(nuevoPerfil);

    if (perfilError) {
      // El usuario de auth queda creado aunque falle el perfil.
      return { data: authData, error: perfilError };
    }

    return { data: authData, error: null };
  }

  iniciarSesion(email: string, password: string) {
    return this.supabase.auth.signInWithPassword({ email, password });
  }

  cerrarSesion() {
    return this.supabase.auth.signOut();
  }

  async obtenerUsuarioActual() {
    const { data, error } = await this.supabase.auth.getUser();
    return { usuario: data?.user ?? null, error };
  }

  async obtenerPerfilActual(): Promise<Perfil | null> {
    const { usuario } = await this.obtenerUsuarioActual();
    if (!usuario) return null;

    const { data, error } = await this.supabase
      .from('perfiles')
      .select('*')
      .eq('id', usuario.id)
      .single();

    if (error) return null;
    return data as Perfil;
  }
}
