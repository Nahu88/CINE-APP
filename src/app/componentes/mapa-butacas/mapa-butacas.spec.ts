import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Butaca } from '../../models/sala.model';
import { MapaButacas } from './mapa-butacas';

// Tres butacas de prueba: dos en la fila A y una en la B.
const butacas: Butaca[] = [
  { id: 1, sala_id: 1, fila: 'A', numero: 1, tipo: 'normal' },
  { id: 2, sala_id: 1, fila: 'A', numero: 2, tipo: 'normal' },
  { id: 3, sala_id: 1, fila: 'B', numero: 1, tipo: 'vip' },
];

describe('MapaButacas', () => {
  let component: MapaButacas;
  let fixture: ComponentFixture<MapaButacas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapaButacas],
    }).compileComponents();

    fixture = TestBed.createComponent(MapaButacas);
    component = fixture.componentInstance;
    // butacas es input.required(): hay que dárselo antes de dibujar.
    fixture.componentRef.setInput('butacas', butacas);
    fixture.componentRef.setInput('ocupadas', [2]);
    await fixture.whenStable();
  });

  it('arma la lista de filas sin repetir', () => {
    expect(component.filas()).toEqual(['A', 'B']);
  });

  it('avisa al padre cuando se toca una butaca libre', () => {
    const avisadas: Butaca[] = [];
    component.alternar.subscribe((butaca) => avisadas.push(butaca));

    component.clic(butacas[0]);
    expect(avisadas).toEqual([butacas[0]]);
  });

  it('no avisa si la butaca ya está vendida', () => {
    const avisadas: Butaca[] = [];
    component.alternar.subscribe((butaca) => avisadas.push(butaca));

    component.clic(butacas[1]);
    expect(avisadas).toEqual([]);
  });
});
