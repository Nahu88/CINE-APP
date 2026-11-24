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

  permisos = signal<string[]>([]);

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
    this.permisos.set([]);
  }

  // Misma regla que la función tiene_permiso de la base, que es la que protege los datos.
  // 'panel' = tiene al menos una sección, para mostrar el link al panel.
  tienePermiso(seccion: string): boolean {
    const perfil = this.perfil();
    if (!perfil) return false;
    if (perfil.rol === 'administrador') return true;
    if (seccion === 'validar' && perfil.rol === 'empleado') return true;
    if (seccion === 'panel') return this.permisos().length > 0;
    return this.permisos().includes(seccion);
  }

  async cargarPerfil(): Promise<Perfil | null> {
    const { data } = await this.supabase.auth.getUser();

    if (!data.user) {
      this.perfil.set(null);
      this.permisos.set([]);
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

    // Los permisos se cargan antes que el perfil, así el guard ya los encuentra.
    let permisos: string[] = [];
    if (perfil.rol_personalizado_id) {
      const { data: roles } = await this.supabase
        .from('roles')
        .select('permisos')
        .eq('id', perfil.rol_personalizado_id);
      if (roles && roles.length > 0) permisos = roles[0].permisos;
    }
    this.permisos.set(permisos);

    this.perfil.set(perfil);
    return perfil;
  }
}
