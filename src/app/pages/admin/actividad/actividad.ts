import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Actividad as FilaActividad } from '../../../models/actividad.model';
import { ActividadService } from '../../../services/actividad';

@Component({
  imports: [RouterLink, DatePipe],
  selector: 'app-actividad',
  templateUrl: './actividad.html',
})
export class Actividad implements OnInit {
  private actividadService = inject(ActividadService);

  registros = signal<FilaActividad[]>([]);
  filtro = signal('');
  cargando = signal(true);
  error = signal<string | null>(null);

  readonly nombres = [
    { accion: 'crear_funcion', texto: 'Creó una función' },
    { accion: 'eliminar_funcion', texto: 'Eliminó una función' },
    { accion: 'crear_pelicula', texto: 'Creó una película' },
    { accion: 'editar_pelicula', texto: 'Editó una película' },
    { accion: 'eliminar_pelicula', texto: 'Eliminó una película' },
    { accion: 'crear_sala', texto: 'Creó una sala' },
    { accion: 'eliminar_sala', texto: 'Eliminó una sala' },
    { accion: 'cambiar_butaca', texto: 'Cambió una butaca' },
    { accion: 'crear_producto', texto: 'Creó un producto' },
    { accion: 'crear_combo', texto: 'Creó un combo' },
    { accion: 'crear_cupon', texto: 'Creó un cupón' },
    { accion: 'crear_recompensa', texto: 'Creó una recompensa' },
    { accion: 'modificar_precio', texto: 'Modificó un precio' },
    { accion: 'validar_qr', texto: 'Validó un QR' },
    { accion: 'entregar_candy', texto: 'Entregó candy' },
  ];

  acciones = computed(() => {
    const lista: string[] = [];
    for (const registro of this.registros()) {
      if (!lista.includes(registro.accion)) lista.push(registro.accion);
    }
    return lista;
  });

  filtrados = computed(() => {
    const filtro = this.filtro();
    if (!filtro) return this.registros();
    return this.registros().filter((r) => r.accion === filtro);
  });

  async ngOnInit() {
    try {
      this.registros.set(await this.actividadService.listar());
    } catch {
      this.error.set('No se pudo cargar la actividad.');
    } finally {
      this.cargando.set(false);
    }
  }

  nombreAccion(accion: string): string {
    return this.nombres.find((n) => n.accion === accion)?.texto ?? accion;
  }

  filtrar(evento: Event) {
    this.filtro.set((evento.target as HTMLSelectElement).value);
  }
}
