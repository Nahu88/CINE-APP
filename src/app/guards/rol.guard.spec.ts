import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, UrlTree } from '@angular/router';
import { Perfil, RolUsuario } from '../models/perfil.model';
import { Auth } from '../services/auth';
import { rolGuard } from './rol.guard';

function perfilDePrueba(rol: RolUsuario): Perfil {
  return {
    id: 'id-de-prueba',
    rol,
    nombre: 'Ana',
    apellido: 'Gómez',
    fecha_nacimiento: '1990-05-10',
    puntos: 0,
    credito: 0,
    cupon_bienvenida_usado: false,
    created_at: '2026-01-01',
  };
}

// Es un Auth falso: reemplazo al real para no depender de Supabase, despeus veo bien.
class AuthFalso {
  perfil = signal<Perfil | null>(null);
  async cargarPerfil() {
    return this.perfil();
  }
}

describe('rolGuard', () => {
  let auth: AuthFalso;

  beforeEach(() => {
    auth = new AuthFalso();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: Auth, useValue: auth }],
    });
  });

  function correrGuard(roles: RolUsuario[]) {
    return TestBed.runInInjectionContext(() =>
      rolGuard(roles)(null as never, null as never)
    ) as Promise<boolean | UrlTree>;
  }

  it('manda al login cuando no hay sesión', async () => {
    const resultado = await correrGuard(['administrador']);
    expect(String(resultado)).toBe('/login');
  });

  it('manda al home cuando el rol no alcanza', async () => {
    auth.perfil.set(perfilDePrueba('cliente'));
    const resultado = await correrGuard(['administrador']);
    expect(String(resultado)).toBe('/home');
  });

  it('deja pasar cuando el rol está permitido', async () => {
    auth.perfil.set(perfilDePrueba('administrador'));
    expect(await correrGuard(['administrador'])).toBe(true);
  });
});
