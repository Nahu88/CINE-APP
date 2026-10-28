import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Compra } from './compra';

describe('Compra', () => {
  let component: Compra;
  let fixture: ComponentFixture<Compra>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      // La página usa RouterLink y ActivatedRoute: el router de prueba los provee.
      providers: [provideRouter([])],
      imports: [Compra],
    }).compileComponents();

    fixture = TestBed.createComponent(Compra);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
