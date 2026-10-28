import { Service } from '@angular/core';
import { formatDate } from '@angular/common';
import { toDataURL } from 'qrcode';
import { jsPDF } from 'jspdf';
import { EntradaDetalle } from '../models/entrada.model';

// Único lugar de la app que conoce las librerías `qrcode` y `jspdf`.
@Service()
export class QrPdfService {
  // Convierte un texto en la imagen de un QR de 300 píxeles de ancho.
  // Devuelve la imagen escrita como texto ("data URL"), que sirve tanto
  // para un <img> como para el PDF.
  generarQr(texto: string): Promise<string> {
    return toDataURL(texto, { width: 300 });
  }

  // Arma el PDF de una entrada y lo descarga.
  // En cada línea los dos números son la posición en milímetros: x, y.
  descargarPdf(detalle: EntradaDetalle) {
    const pdf = new jsPDF(); // hoja A4

    pdf.setFontSize(22);
    pdf.text('Cine Paraíso', 20, 25);

    pdf.setFontSize(16);
    pdf.text(detalle.pelicula, 20, 40);

    pdf.setFontSize(12);
    // formatDate es el pipe `date` de los templates, usado como función.
    pdf.text('Función: ' + formatDate(detalle.inicio, 'dd/MM/yyyy HH:mm', 'es-AR'), 20, 52);
    pdf.text(detalle.sala, 20, 60);
    pdf.text(detalle.butaca, 20, 68);
    pdf.text('Precio: $' + detalle.entrada.precio, 20, 76);

    // El mismo QR que se ve en pantalla: x, y, ancho y alto.
    pdf.addImage(detalle.qr, 'PNG', 20, 85, 60, 60);
    pdf.text(detalle.entrada.codigo_qr, 20, 153);

    // y es la altura donde va la próxima línea; se suma a medida que se escribe.
    let y = 166;

    // RF-31: las películas con restricción llevan el aviso.
    if (detalle.restriccion_edad) {
      pdf.text('Película para mayores de ' + detalle.restriccion_edad + ' años.', 20, y);
      pdf.text('El espectador debe asistir acompañado por un adulto.', 20, y + 7);
      y += 18;
    }

    // RF-38: el candy se retira mostrando este mismo QR.
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

  // RF-60: exportar un reporte a PDF, como una tabla escrita línea por línea.
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
      // Si se llena la hoja, se agrega otra y se sigue desde arriba.
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
