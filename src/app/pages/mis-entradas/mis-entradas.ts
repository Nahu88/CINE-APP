import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { EntradaDetalle } from '../../models/entrada.model';
import { Auth } from '../../services/auth';
import { EntradasService } from '../../services/entradas';
import { QrPdfService } from '../../services/qr-pdf';

@Component({
  imports: [RouterLink, DatePipe],
  selector: 'app-mis-entradas',
  styleUrl: './mis-entradas.css',
  templateUrl: './mis-entradas.html',
})
export class MisEntradas implements OnInit {
  private auth = inject(Auth);
  private entradasService = inject(EntradasService);
  private qrPdf = inject(QrPdfService);

  entradas = signal<EntradaDetalle[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);

  async ngOnInit() {
    // El guard de la ruta ya cargó el perfil antes de entrar acá.
    const perfil = this.auth.perfil();
    if (!perfil) {
      this.cargando.set(false);
      return;
    }

    try {
      const entradas = await this.entradasService.listarDelUsuario(perfil.id);
      const detalles = await this.entradasService.armarDetalles(entradas);

      // A cada entrada se le dibuja su QR a partir de codigo_qr.
      for (const detalle of detalles) {
        detalle.qr = await this.qrPdf.generarQr(detalle.entrada.codigo_qr);
      }
      this.entradas.set(detalles);
    } catch {
      this.error.set('No se pudieron cargar tus entradas.');
    } finally {
      this.cargando.set(false);
    }
  }

  descargar(detalle: EntradaDetalle) {
    this.qrPdf.descargarPdf(detalle);
  }
}