import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { QrPdfService } from '../../../services/qr-pdf';
import { FilaFacturacion, FilaRanking, ReportesService } from '../../../services/reportes';

@Component({
  imports: [RouterLink, DatePipe],
  selector: 'app-reportes',
  styleUrl: './reportes.css',
  templateUrl: './reportes.html',
})
export class Reportes implements OnInit {
  private reportesService = inject(ReportesService);
  private qrPdf = inject(QrPdfService);

  facturacion = signal<FilaFacturacion[]>([]);
  peliculas = signal<FilaRanking[]>([]);
  candy = signal<FilaRanking[]>([]);
  // 7 = la última semana, 30 = el último mes.
  periodo = signal(7);
  cargando = signal(true);
  error = signal<string | null>(null);

  totalFacturado = computed(() => {
    let total = 0;
    for (const fila of this.facturacion()) total += fila.facturacion;
    return total;
  });

  totalEntradas = computed(() => {
    let total = 0;
    for (const fila of this.facturacion()) total += fila.entradas;
    return total;
  });

  // El máximo de cada ranking, para calcular el largo de las barras del gráfico.
  maximoPeliculas = computed(() => this.peliculas()[0]?.cantidad ?? 0);
  maximoCandy = computed(() => this.candy()[0]?.cantidad ?? 0);

  async ngOnInit() {
    await this.cargar();
  }

  async cargar() {
    this.cargando.set(true);
    this.error.set(null);
    try {
      // La facturación siempre muestra los últimos 30 días; los rankings, el período elegido.
      this.facturacion.set(await this.reportesService.facturacionDiaria(30));
      this.peliculas.set(await this.reportesService.peliculasMasVistas(this.periodo()));
      this.candy.set(await this.reportesService.candyMasVendido(this.periodo()));
    } catch {
      this.error.set('No se pudieron cargar los reportes.');
    } finally {
      this.cargando.set(false);
    }
  }

  async cambiarPeriodo(dias: number) {
    this.periodo.set(dias);
    await this.cargar();
  }

  // Largo de la barra en porcentaje: la más vendida ocupa el 100 %.
  porcentaje(cantidad: number, maximo: number): number {
    if (maximo === 0) return 0;
    return Math.round((cantidad / maximo) * 100);
  }

  // Las filas de la facturación como texto, para exportarlas.
  private filasParaExportar(): string[][] {
    const filas: string[][] = [];
    for (const fila of this.facturacion()) {
      filas.push([fila.dia, String(fila.compras), String(fila.entradas), String(fila.facturacion)]);
    }
    return filas;
  }

  exportarPdf() {
    this.qrPdf.descargarReporte(
      'Facturacion diaria',
      ['Día', 'Compras', 'Entradas', 'Facturación $'],
      this.filasParaExportar()
    );
  }

  exportarExcel() {
    this.reportesService.descargarCsv(
      'facturacion-diaria.csv',
      ['Día', 'Compras', 'Entradas', 'Facturación'],
      this.filasParaExportar()
    );
  }
}
