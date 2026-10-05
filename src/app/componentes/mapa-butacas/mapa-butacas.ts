import { Component, computed, input, output } from '@angular/core';
import { Butaca } from '../../models/sala.model';
import { ButacaDirective } from '../../directivas/butaca.directive';

@Component({
  standalone: true,
  imports: [ButacaDirective],
  selector: 'app-mapa-butacas',
  styleUrl: './mapa-butacas.css',
  templateUrl: './mapa-butacas.html',
})
export class MapaButacas {
  // Los datos bajan con input()...
  butacas = input.required<Butaca[]>();
  ocupadas = input<number[]>([]);
  seleccionadas = input<number[]>([]);

  // ...y los eventos suben con output().
  alternar = output<Butaca>();

  // Lista de letras de fila sin repetir: A, B, C...
  filas = computed(() => {
    const filas: string[] = [];
    for (const butaca of this.butacas()) {
      if (!filas.includes(butaca.fila)) filas.push(butaca.fila);
    }
    return filas;
  });

  butacasDeFila(fila: string): Butaca[] {
    return this.butacas().filter((b) => b.fila === fila);
  }

  estaOcupada(butaca: Butaca): boolean {
    return this.ocupadas().includes(butaca.id);
  }

  estaSeleccionada(butaca: Butaca): boolean {
    return this.seleccionadas().includes(butaca.id);
  }

  // Deja un pasillo después de cada bloque: 4+20+4, o 2+10+2 en las accesibles.
  esPasillo(butaca: Butaca): boolean {
    if (butaca.tipo === 'accesible') return butaca.numero === 2 || butaca.numero === 12;
    return butaca.numero === 4 || butaca.numero === 24;
  }

  clic(butaca: Butaca) {
    if (!this.estaOcupada(butaca)) this.alternar.emit(butaca);
  }
}