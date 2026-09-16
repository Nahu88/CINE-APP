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
  // El encabezado y los guards leen esta señal en vez de consultar la base cada vez.
  perfil = signal<Perfil | null>(null);

  // Consulta en curso, para que el arranque de la app y el guard no pregunten dos veces.
  private cargaEnCurso: Promise<Perfil | null> | null = null;

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

    await this.cargarPerfil();
    return { data: authData, error: null };
  }

  async iniciarSesion(email: string, password: string) {
    const resultado = await this.supabase.auth.signInWithPassword({ email, password });

    if (!resultado.error) {
      await this.cargarPerfil();
    }
    return resultado;
  }

  async cerrarSesion() {
    const resultado = await this.supabase.auth.signOut();
    this.perfil.set(null);
    return resultado;
  }

  // Pregunta a Supabase quién está logueado y guarda su perfil en la señal.
  // Se llama al iniciar sesión y al abrir la app, porque la sesión queda guardada en el navegador.
  cargarPerfil(): Promise<Perfil | null> {
    this.cargaEnCurso ??= this.obtenerPerfilActual()
      .then((perfil) => {
        this.perfil.set(perfil);
        return perfil;
      })
      .finally(() => {
        this.cargaEnCurso = null;
      });

    return this.cargaEnCurso;
  }

  async obtenerUsuarioActual() {
    const { data, error } = await this.supabase.auth.getUser();

    if (error) {
      console.error('No se pudo obtener el usuario de Supabase:', error);
    }
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

    if (error) {
      // Si falla acá el usuario tiene sesión pero se queda sin perfil: casi siempre es RLS.
      console.error('No se pudo leer el perfil:', error);
      return null;
    }
    return data as Perfil;
  }
}
