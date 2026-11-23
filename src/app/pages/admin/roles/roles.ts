import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Perfil } from '../../../models/perfil.model';
import { Rol, SECCIONES_PANEL } from '../../../models/rol.model';
import { ActividadService } from '../../../services/actividad';
import { RolesService } from '../../../services/roles';

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-admin-roles',
  styleUrl: './roles.css',
  templateUrl: './roles.html',
})
export class AdminRoles implements OnInit {
  private rolesService = inject(RolesService);
  private actividad = inject(ActividadService);

  readonly secciones = SECCIONES_PANEL;

  roles = signal<Rol[]>([]);
  usuarios = signal<Perfil[]>([]);
  cargando = signal(true);
  guardando = signal(false);
  error = signal<string | null>(null);
  exito = signal<string | null>(null);

  // null = creando; con id = editando.
  editandoId = signal<string | null>(null);

  permisosElegidos = signal<string[]>([]);

  form = new FormGroup({
    nombre: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(40)] }),
  });

  async ngOnInit() {
    await this.cargar();
  }

  async cargar() {
    this.cargando.set(true);
    this.error.set(null);
    try {
      this.roles.set(await this.rolesService.listar());
      this.usuarios.set(await this.rolesService.listarUsuarios());
    } catch (error) {
      console.error('No se pudieron cargar los roles:', error);
      this.error.set('No se pudieron cargar los roles.');
    } finally {
      this.cargando.set(false);
    }
  }

  alternarPermiso(clave: string) {
    this.permisosElegidos.update((lista) =>
      lista.includes(clave) ? lista.filter((p) => p !== clave) : [...lista, clave]
    );
  }

  nombresPermisos(rol: Rol): string {
    const nombres: string[] = [];
    for (const seccion of this.secciones) {
      if (rol.permisos.includes(seccion.clave)) nombres.push(seccion.nombre);
    }
    return nombres.length ? nombres.join(', ') : 'Ninguna sección';
  }

  editar(rol: Rol) {
    this.editandoId.set(rol.id);
    this.form.setValue({ nombre: rol.nombre });
    this.permisosElegidos.set(rol.permisos);
  }

  cancelarEdicion() {
    this.editandoId.set(null);
    this.form.reset({ nombre: '' });
    this.permisosElegidos.set([]);
  }

  async guardar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.permisosElegidos().length === 0) {
      this.error.set('Elegí al menos una sección para el rol.');
      return;
    }

    this.guardando.set(true);
    this.error.set(null);
    this.exito.set(null);
    const datos = { nombre: this.form.getRawValue().nombre.trim(), permisos: this.permisosElegidos() };

    try {
      const id = this.editandoId();
      if (id) {
        await this.rolesService.actualizar(id, datos);
        await this.actividad.registrar('editar_rol', 'roles', id, datos.nombre);
      } else {
        await this.rolesService.crear(datos);
        await this.actividad.registrar('crear_rol', 'roles', null, datos.nombre);
      }
      this.cancelarEdicion();
      await this.cargar();
    } catch (error) {
      console.error('No se pudo guardar el rol:', error);
      // 23505: el nombre del rol es único.
      const codigo = (error as { code?: string }).code;
      this.error.set(codigo === '23505' ? 'Ya existe un rol con ese nombre.' : 'No se pudo guardar el rol.');
    } finally {
      this.guardando.set(false);
    }
  }

  async eliminar(rol: Rol) {
    if (!confirm(`¿Eliminar el rol "${rol.nombre}"? Los usuarios que lo tienen se quedan sin él.`)) return;
    this.error.set(null);
    try {
      await this.rolesService.eliminar(rol.id);
      await this.actividad.registrar('eliminar_rol', 'roles', rol.id, rol.nombre);
      await this.cargar();
    } catch (error) {
      console.error('No se pudo eliminar el rol:', error);
      this.error.set('No se pudo eliminar el rol.');
    }
  }

  // '' en el select = sin rol configurable.
  async asignar(usuario: Perfil, evento: Event) {
    const valor = (evento.target as HTMLSelectElement).value;
    const rolId = valor === '' ? null : valor;

    this.error.set(null);
    this.exito.set(null);
    try {
      await this.rolesService.asignar(usuario.id, rolId);
      const rol = this.roles().find((r) => r.id === rolId);
      await this.actividad.registrar('asignar_rol', 'perfiles', usuario.id,
        usuario.nombre + ' ' + usuario.apellido + ': ' + (rol ? rol.nombre : 'sin rol'));
      this.exito.set(`Listo: ${usuario.nombre} ${rol ? 'ahora tiene el rol ' + rol.nombre : 'ya no tiene rol configurable'}.`);
      await this.cargar();
    } catch (error) {
      console.error('No se pudo asignar el rol:', error);
      this.error.set('No se pudo asignar el rol.');
    }
  }
}
