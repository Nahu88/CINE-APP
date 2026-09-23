import { inject, Service, signal } from '@angular/core';
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

  // Perfil del usuario logueado, o null si no hay sesión.
  // El encabezado y el guard leen esta señal.
  perfil = signal<Perfil | null>(null);

  // Son dos pasos porque son dos tablas: la cuenta y el perfil.
  async registrar(datos: DatosRegistro) {
    const { data, error } = await this.supabase.auth.signUp({
      email: datos.email,
      password: datos.password,
    });

    if (error || !data.user) {
      return { error };
    }

    const nuevoPerfil: Partial<Perfil> = {
      id: data.user.id,
      rol: 'cliente', // fijo acá: nadie puede registrarse como administrador
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

    const { error: errorPerfil } = await this.supabase.from('perfiles').insert(nuevoPerfil);
    if (errorPerfil) {
      // El usuario de auth queda creado aunque falle el perfil.
      return { error: errorPerfil };
    }

    await this.cargarPerfil();
    return { error: null };
  }

  async iniciarSesion(email: string, password: string) {
    const { error } = await this.supabase.auth.signInWithPassword({ email, password });

    if (!error) {
      await this.cargarPerfil();
    }
    return { error };
  }

  async cerrarSesion() {
    await this.supabase.auth.signOut();
    this.perfil.set(null);
  }

  // Le pregunta a Supabase quién está logueado, busca su perfil y lo guarda en la señal.
  // Se llama al entrar, al registrarse y al abrir la app, porque la sesión queda en el navegador.
  async cargarPerfil(): Promise<Perfil | null> {
    const { data } = await this.supabase.auth.getUser();

    if (!data.user) {
      this.perfil.set(null);
      return null;
    }

    const { data: perfil, error } = await this.supabase
      .from('perfiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (error) {
      // Si falla acá el usuario tiene sesión pero se queda sin perfil: casi siempre es RLS.
      console.error('No se pudo leer el perfil:', error);
      this.perfil.set(null);
      return null;
    }

    this.perfil.set(perfil);
    return perfil;
  }
}
