import { Directive, ElementRef, HostListener, inject, Input, OnChanges, Renderer2 } from '@angular/core';
import { TipoButaca } from '../models/sala.model';

// Directiva de atributo
// colorea el borde según el tipo de butaca y la agranda al pasar el mouse.
@Directive({
  selector: '[appButaca]',
  standalone: true,
})
export class ButacaDirective implements OnChanges {
  @Input() appButaca: TipoButaca = 'normal';

  private el = inject(ElementRef);
  private render = inject(Renderer2);

  // ngOnChanges se ejecuta al recibir el tipo por primera vez y cada vez
  // que cambia. Hace falta en el panel: cuando el admin cambia el tipo de
  // una butaca, el botón es el mismo y hay que volver a pintarlo.
  ngOnChanges(): void {
    const colores = { normal: '#7a8194', accesible: '#3b82c4', vip: '#c9a227' };
    this.render.setStyle(this.el.nativeElement, 'border-color', colores[this.appButaca]);
  }

  @HostListener('mouseenter') onMouseEnter() {
    this.render.setStyle(this.el.nativeElement, 'transform', 'scale(1.2)');
  }

  @HostListener('mouseleave') onMouseLeave() {
    this.render.setStyle(this.el.nativeElement, 'transform', 'scale(1)');
  }
}
