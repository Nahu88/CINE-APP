import { Service } from '@angular/core';
import { formatDate } from '@angular/common';
import { toDataURL } from 'qrcode';
import { jsPDF } from 'jspdf';
import { EntradaDetalle } from '../models/entrada.model';


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

    pdf.save('entrada-' + detalle.entrada.codigo_qr + '.pdf');
  }
}