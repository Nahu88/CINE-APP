import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Canje, MovimientoCredito, MovimientoPuntos, Recompensa } from '../../models/fidelizacion.model';
import { Propuesta } from '../../models/propuesta.model';
import { Auth } from '../../services/auth';
import { FidelizacionService } from '../../services/fidelizacion';
import { PeliculasService } from '../../services/peliculas';
import { PropuestasService } from '../../services/propuestas';
import { tituloNuevoValidator } from '../../validators/propuesta.validators';

// RF-06 y RF-51: datos del cliente, sus puntos, su historial de canjes y su crédito.
@Component({
  imports: [RouterLink, DatePipe, ReactiveFormsModule],
  selector: 'app-perfil',
  styleUrl: './perfil.css',
  templateUrl: './perfil.html',
})
export class PerfilPagina implements OnInit {
  protected auth = inject(Auth);
  private fidelizacion = inject(FidelizacionService);
  private peliculasService = inject(PeliculasService);
  private propuestasService = inject(PropuestasService);

  puntos = signal(0);
  credito = signal(0);
  movimientosPuntos = signal<MovimientoPuntos[]>([]);
  movimientosCredito = signal<MovimientoCredito[]>([]);
  canjes = signal<Canje[]>([]);
  recompensas = signal<Recompensa[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);

  // ---------- Extra 1: propuestas de películas ----------
  propuestas = signal<Propuesta[]>([]);
  titulosCartelera = signal<string[]>([]);
  enviando = signal(false);
  errorPropuesta = signal<string | null>(null);
  exitoPropuesta = signal(false);

  // Una propuesta a la vez: si hay una pendiente, no se muestra el formulario.
  tienePendiente = computed(() => this.propuestas().some((p) => p.estado === 'pendiente'));

  formPropuesta = new FormGroup({
    titulo: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.maxLength(100),
        tituloNuevoValidator(() => this.titulosCartelera()),
      ],
    }),
    descripcion: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(500)] }),
    motivo: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(500)] }),
  });

  async ngOnInit() {
    const perfil = this.auth.perfil();
    if (!perfil) return;

    try {
      // El saldo es la suma de los movimientos: se piden una vez y se suman acá.
      const puntos = await this.fidelizacion.movimientosPuntos(perfil.id);
      const credito = await this.fidelizacion.movimientosCredito(perfil.id);
      this.movimientosPuntos.set(puntos);
      this.movimientosCredito.set(credito);

      let saldoPuntos = 0;
      for (const movimiento of puntos) saldoPuntos += movimiento.puntos;
      this.puntos.set(saldoPuntos);

      let saldoCredito = 0;
      for (const movimiento of credito) saldoCredito += Number(movimiento.monto);
      this.credito.set(saldoCredito);

      this.canjes.set(await this.fidelizacion.listarCanjes(perfil.id));
      this.recompensas.set(await this.fidelizacion.listarRecompensas());

      // Propuestas del cliente y títulos de la cartelera (para el validador).
      this.propuestas.set(await this.propuestasService.listarDelUsuario(perfil.id));
      const cartelera = await this.peliculasService.listarCartelera();
      this.titulosCartelera.set(cartelera.map((p) => p.nombre));
    } catch {
      this.error.set('No se pudo cargar tu perfil.');
    } finally {
      this.cargando.set(false);
    }
  }

  nombreRecompensa(id: string): string {
    return this.recompensas().find((r) => r.id === id)?.descripcion ?? 'Recompensa';
  }

  tieneErrorPropuesta(campo: string, error: string): boolean {
    const control = this.formPropuesta.get(campo);
    return !!control && control.touched && control.hasError(error);
  }

  async enviarPropuesta() {
    const perfil = this.auth.perfil();
    if (!perfil) return;

    if (this.formPropuesta.invalid) {
      this.formPropuesta.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    this.errorPropuesta.set(null);
    this.exitoPropuesta.set(false);

    const valores = this.formPropuesta.getRawValue();
    try {
      await this.propuestasService.crear({
        usuario_id: perfil.id,
        autor: perfil.nombre + ' ' + perfil.apellido,
        titulo: valores.titulo.trim(),
        descripcion: valores.descripcion.trim(),
        motivo: valores.motivo.trim(),
      });
      this.formPropuesta.reset();
      this.exitoPropuesta.set(true);
      this.propuestas.set(await this.propuestasService.listarDelUsuario(perfil.id));
    } catch (error) {
      console.error('No se pudo enviar la propuesta:', error);
      // 23505 = el índice único de la base: ya tiene una propuesta pendiente.
      const codigo = (error as { code?: string }).code;
      this.errorPropuesta.set(
        codigo === '23505'
          ? 'Ya tenés una propuesta pendiente. Esperá la respuesta para enviar otra.'
          : 'No se pudo enviar la propuesta.'
      );
    } finally {
      this.enviando.set(false);
    }
  }
}
