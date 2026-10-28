import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Entrada, EntradaDetalle } from '../../models/entrada.model';
import { Orden } from '../../models/orden.model';
import { Auth } from '../../services/auth';
import { ComprasService } from '../../services/compra';
import { EntradasService } from '../../services/entradas';
import { QrPdfService } from '../../services/qr-pdf';

// Una compra con sus entradas, lista para mostrar.
interface CompraVista {
  orden: Orden;
  entradas: EntradaDetalle[];
  cancelable: boolean;
}

@Component({
  imports: [RouterLink, DatePipe],
  selector: 'app-mis-entradas',
  styleUrl: './mis-entradas.css',
  templateUrl: './mis-entradas.html',
})
export class MisEntradas implements OnInit {
  protected auth = inject(Auth);
  private entradasService = inject(EntradasService);
  private comprasService = inject(ComprasService);
  private qrPdf = inject(QrPdfService);

  compras = signal<CompraVista[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);
  aviso = signal<string | null>(null);

  async ngOnInit() {
    await this.cargar();
  }

  async cargar() {
    // El guard de la ruta ya cargó el perfil antes de entrar acá.
    const perfil = this.auth.perfil();
    if (!perfil) {
      this.cargando.set(false);
      return;
    }

    this.cargando.set(true);
    try {
      const ordenes = await this.entradasService.listarOrdenesDelUsuario(perfil.id);

      // Todas las entradas juntas, para armar los detalles de una sola vez.
      const entradas: Entrada[] = [];
      for (const orden of ordenes) {
        const deLaOrden = await this.entradasService.listarDeOrden(orden.id);
        for (const entrada of deLaOrden) entradas.push(entrada);
      }
      const detalles = await this.entradasService.armarDetalles(entradas);

      // A cada entrada se le dibuja su QR a partir de codigo_qr.
      for (const detalle of detalles) {
        detalle.qr = await this.qrPdf.generarQr(detalle.entrada.codigo_qr);
      }

      // Se agrupan por compra.
      const compras: CompraVista[] = [];
      for (const orden of ordenes) {
        const deLaOrden = detalles.filter((d) => d.entrada.orden_id === orden.id);
        if (deLaOrden.length === 0) continue;

        const algunaUsada = deLaOrden.filter((d) => d.entrada.estado === 'usada').length > 0;
        compras.push({
          orden: orden,
          entradas: deLaOrden,
          // RN-09: más de 2 horas antes, sin entradas usadas. Un invitado no
          // tiene cuenta donde recibir el crédito, así que no puede cancelar.
          cancelable:
            !perfil.invitado && !algunaUsada && this.comprasService.sePuedeCancelar(orden, deLaOrden[0].inicio),
        });
      }
      this.compras.set(compras);
    } catch {
      this.error.set('No se pudieron cargar tus entradas.');
    } finally {
      this.cargando.set(false);
    }
  }

  descargar(detalle: EntradaDetalle) {
    this.qrPdf.descargarPdf(detalle);
  }

  async cancelar(compra: CompraVista) {
    const perfil = this.auth.perfil();
    if (!perfil) return;

    const confirmado = confirm(
      '¿Cancelar esta compra? No se devuelve dinero: el total se acredita como crédito en tu cuenta para usar en otra compra.'
    );
    if (!confirmado) return;

    this.error.set(null);
    try {
      const reintegro = await this.comprasService.cancelar(compra.orden, perfil.id);
      this.aviso.set('Compra cancelada. Se acreditaron $' + reintegro + ' en tu cuenta.');
      await this.cargar();
    } catch {
      this.error.set('No se pudo cancelar la compra.');
    }
  }
}
