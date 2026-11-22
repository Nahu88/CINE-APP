import { Service } from '@angular/core';
import { formatDate } from '@angular/common';
import { toDataURL } from 'qrcode';
import { jsPDF } from 'jspdf';
import { EntradaDetalle } from '../models/entrada.model';

// Único lugar de la app que conoce las librerías `qrcode` y `jspdf`.
@Service()
export class QrPdfService {
  // Devuelve un data URL, que sirve para un <img> y para el PDF.
  generarQr(texto: string): Promise<string> {
    return toDataURL(texto, { width: 300 });
  }

  // Las coordenadas son milímetros: x, y.
  descargarPdf(detalle: EntradaDetalle) {
    const pdf = new jsPDF();

    pdf.setFontSize(22);
    pdf.text('Cine Paraíso', 20, 25);

    pdf.setFontSize(16);
    pdf.text(detalle.pelicula, 20, 40);

    pdf.setFontSize(12);
    pdf.text('Función: ' + formatDate(detalle.inicio, 'dd/MM/yyyy HH:mm', 'es-AR'), 20, 52);
    pdf.text(detalle.sala, 20, 60);
    pdf.text(detalle.butaca, 20, 68);
    pdf.text('Precio: $' + detalle.entrada.precio, 20, 76);

    // x, y, ancho y alto.
    pdf.addImage(detalle.qr, 'PNG', 20, 85, 60, 60);
    pdf.text(detalle.entrada.codigo_qr, 20, 153);

    // y = altura de la próxima línea.
    let y = 166;

    if (detalle.restriccion_edad) {
      pdf.text('Película para mayores de ' + detalle.restriccion_edad + ' años.', 20, y);
      pdf.text('El espectador debe asistir acompañado por un adulto.', 20, y + 7);
      y += 18;
    }

    // El candy se retira mostrando este mismo QR.
    if (detalle.candy.length) {
      pdf.text('Candy bar (retirá con este mismo QR):', 20, y);
      y += 7;
      for (const linea of detalle.candy) {
        pdf.text('- ' + linea, 24, y);
        y += 7;
      }
    }

    pdf.save('entrada-' + detalle.entrada.codigo_qr + '.pdf');
  }

  descargarReporte(titulo: string, encabezados: string[], filas: string[][]) {
    const pdf = new jsPDF();
    const anchoColumna = 170 / encabezados.length;

    pdf.setFontSize(18);
    pdf.text(titulo, 20, 22);

    pdf.setFontSize(9);
    pdf.text('Generado el ' + formatDate(new Date(), 'dd/MM/yyyy HH:mm', 'es-AR'), 20, 29);

    pdf.setFontSize(11);
    let y = 42;
    for (let i = 0; i < encabezados.length; i++) {
      pdf.text(encabezados[i], 20 + i * anchoColumna, y);
    }
    y += 8;

    for (const fila of filas) {
      if (y > 280) {
        pdf.addPage();
        y = 20;
      }
      for (let i = 0; i < fila.length; i++) {
        pdf.text(fila[i], 20 + i * anchoColumna, y);
      }
      y += 7;
    }

    pdf.save(titulo.toLowerCase().replaceAll(' ', '-') + '.pdf');
  }
}
