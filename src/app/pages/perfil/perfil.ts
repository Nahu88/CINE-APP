import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Canje, MovimientoCredito, MovimientoPuntos, Recompensa } from '../../models/fidelizacion.model';
import { Auth } from '../../services/auth';
import { FidelizacionService } from '../../services/fidelizacion';

// RF-06 y RF-51: datos del cliente, sus puntos, su historial de canjes y su crédito.
@Component({
  imports: [RouterLink, DatePipe],
  selector: 'app-perfil',
  styleUrl: './perfil.css',
  templateUrl: './perfil.html',
})
export class PerfilPagina implements OnInit {
  protected auth = inject(Auth);
  private fidelizacion = inject(FidelizacionService);

  puntos = signal(0);
  credito = signal(0);
  movimientosPuntos = signal<MovimientoPuntos[]>([]);
  movimientosCredito = signal<MovimientoCredito[]>([]);
  canjes = signal<Canje[]>([]);
  recompensas = signal<Recompensa[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);

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
    } catch {
      this.error.set('No se pudo cargar tu perfil.');
    } finally {
      this.cargando.set(false);
    }
  }

  nombreRecompensa(id: string): string {
    return this.recompensas().find((r) => r.id === id)?.descripcion ?? 'Recompensa';
  }
}
