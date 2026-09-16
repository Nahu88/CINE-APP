import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('crea la app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('muestra la marca en el encabezado', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const html = fixture.nativeElement as HTMLElement;
    expect(html.querySelector('.marca-texto')?.textContent).toContain('Cine Paraíso');
  });
});
