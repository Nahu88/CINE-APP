import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Entrada, EntradaDetalle } from '../../models/entrada.model';
import { Orden } from '../../models/orden.model';
import { Auth } from '../../services/auth';
import { ComprasService } from '../../services/compra';
import { EntradasService } from '../../services/entradas';
import { QrPdfService } from '../../services/qr-pdf';

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
    const perfil = this.auth.perfil();
    if (!perfil) {
      this.cargando.set(false);
      return;
    }

    this.cargando.set(true);
    try {
      const ordenes = await this.entradasService.listarOrdenesDelUsuario(perfil.id);

      const entradas: Entrada[] = [];
      for (const orden of ordenes) {
        const deLaOrden = await this.entradasService.listarDeOrden(orden.id);
        for (const entrada of deLaOrden) entradas.push(entrada);
      }
      const detalles = await this.entradasService.armarDetalles(entradas);

      for (const detalle of detalles) {
        detalle.qr = await this.qrPdf.generarQr(detalle.entrada.codigo_qr);
      }

      const compras: CompraVista[] = [];
      for (const orden of ordenes) {
        const deLaOrden = detalles.filter((d) => d.entrada.orden_id === orden.id);
        if (deLaOrden.length === 0) continue;

        const algunaUsada = deLaOrden.filter((d) => d.entrada.estado === 'usada').length > 0;
        compras.push({
          orden: orden,
          entradas: deLaOrden,
          // Más de 2 horas antes y sin entradas usadas; un invitado no puede cancelar.
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
