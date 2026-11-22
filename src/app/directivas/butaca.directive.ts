import { Directive, ElementRef, HostListener, inject, Input, OnChanges, Renderer2 } from '@angular/core';
import { TipoButaca } from '../models/sala.model';

// Colorea el borde según el tipo de butaca y la agranda al pasar el mouse.
@Directive({
  selector: '[appButaca]',
  standalone: true,
})
export class ButacaDirective implements OnChanges {
  @Input() appButaca: TipoButaca = 'normal';

  private el = inject(ElementRef);
  private render = inject(Renderer2);

  // ngOnChanges y no ngOnInit: en el panel el tipo cambia sobre el mismo botón.
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
