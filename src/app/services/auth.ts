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
  private supabase = inject(SupabaseService).client;

  perfil = signal<Perfil | null>(null);

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
      rol: 'cliente', // nadie puede registrarse como administrador
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

  // Sesión anónima (usuario sin email) con un perfil mínimo, para comprar con las
  // mismas reglas de seguridad que un cliente.
  async ingresarComoInvitado(fechaNacimiento: string) {
    const { data, error } = await this.supabase.auth.signInAnonymously();

    if (error || !data.user) {
      return { error };
    }

    const perfilInvitado: Partial<Perfil> = {
      id: data.user.id,
      rol: 'cliente',
      nombre: 'Invitado',
      apellido: '',
      fecha_nacimiento: fechaNacimiento,
      puntos: 0,
      credito: 0,
      cupon_bienvenida_usado: false,
      invitado: true,
    };

    const { error: errorPerfil } = await this.supabase.from('perfiles').insert(perfilInvitado);
    if (errorPerfil) {
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
      console.error('No se pudo leer el perfil:', error);
      this.perfil.set(null);
      return null;
    }

    this.perfil.set(perfil);
    return perfil;
  }
}
