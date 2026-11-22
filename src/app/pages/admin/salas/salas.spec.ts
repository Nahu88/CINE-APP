import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Salas } from './salas';

describe('Salas', () => {
  let component: Salas;
  let fixture: ComponentFixture<Salas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideRouter([])],
      imports: [Salas],
    }).compileComponents();

    fixture = TestBed.createComponent(Salas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
