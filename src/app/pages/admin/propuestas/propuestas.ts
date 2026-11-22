import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Propuesta } from '../../../models/propuesta.model';
import { ActividadService } from '../../../services/actividad';
import { PropuestasService } from '../../../services/propuestas';

// Extra 1: el admin ve las películas que propusieron los clientes y las acepta o rechaza.
@Component({
  imports: [RouterLink, DatePipe],
  selector: 'app-admin-propuestas',
  templateUrl: './propuestas.html',
})
export class AdminPropuestas implements OnInit {
  private propuestasService = inject(PropuestasService);
  private actividad = inject(ActividadService);
  private router = inject(Router);

  propuestas = signal<Propuesta[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);

  // Arriba las que hay que responder; abajo el historial.
  pendientes = computed(() => this.propuestas().filter((p) => p.estado === 'pendiente'));
  respondidas = computed(() => this.propuestas().filter((p) => p.estado !== 'pendiente'));

  async ngOnInit() {
    await this.cargar();
  }

  async cargar() {
    this.cargando.set(true);
    this.error.set(null);
    try {
      this.propuestas.set(await this.propuestasService.listarTodas());
    } catch (error) {
      console.error('No se pudieron cargar las propuestas:', error);
      this.error.set('No se pudieron cargar las propuestas.');
    } finally {
      this.cargando.set(false);
    }
  }

  // Al aceptar, se marca como aceptada y se abre el alta de película con los
  // datos de la propuesta, pasados como parámetros de consulta (queryParams).
  async aceptar(propuesta: Propuesta) {
    this.error.set(null);
    try {
      await this.propuestasService.cambiarEstado(propuesta.id, 'aceptada');
      await this.actividad.registrar('aceptar_propuesta', 'propuestas', propuesta.id, propuesta.titulo);
      this.router.navigate(['/admin/peliculas'], {
        queryParams: { nombre: propuesta.titulo, sinopsis: propuesta.descripcion },
      });
    } catch (error) {
      console.error('No se pudo aceptar la propuesta:', error);
      this.error.set('No se pudo aceptar la propuesta.');
    }
  }

  async rechazar(propuesta: Propuesta) {
    if (!confirm(`¿Rechazar la propuesta "${propuesta.titulo}"?`)) return;

    this.error.set(null);
    try {
      await this.propuestasService.cambiarEstado(propuesta.id, 'rechazada');
      await this.actividad.registrar('rechazar_propuesta', 'propuestas', propuesta.id, propuesta.titulo);
      await this.cargar();
    } catch (error) {
      console.error('No se pudo rechazar la propuesta:', error);
      this.error.set('No se pudo rechazar la propuesta.');
    }
  }
}
