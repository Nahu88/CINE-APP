import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SECCIONES_PANEL, SeccionPanel } from '../../../models/rol.model';
import { Auth } from '../../../services/auth';

@Component({
  imports: [RouterLink],
  selector: 'app-admin-inicio',
  styleUrl: './inicio.css',
  templateUrl: './inicio.html',
})
export class AdminInicio {
  private auth = inject(Auth);

  // Solo las secciones que el usuario puede usar, agrupadas como en SECCIONES_PANEL.
  grupos = computed(() => {
    const grupos: { titulo: string; secciones: SeccionPanel[] }[] = [];
    for (const seccion of SECCIONES_PANEL) {
      if (!this.auth.tienePermiso(seccion.clave)) continue;
      let grupo = grupos.find((g) => g.titulo === seccion.grupo);
      if (!grupo) {
        grupo = { titulo: seccion.grupo, secciones: [] };
        grupos.push(grupo);
      }
      grupo.secciones.push(seccion);
    }

    if (this.auth.perfil()?.rol === 'administrador') {
      grupos.find((g) => g.titulo === 'Control')?.secciones.push({
        clave: 'roles',
        nombre: 'Roles',
        ruta: '/admin/roles',
        detalle: 'Permisos del panel por usuario',
        grupo: 'Control',
      });
    }
    return grupos;
  });
}
