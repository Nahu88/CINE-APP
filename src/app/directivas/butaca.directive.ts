import { Directive, ElementRef, HostListener, inject, Input, OnInit, Renderer2 } from '@angular/core';
import { TipoButaca } from '../models/sala.model';

// Directiva de atributo, mismo molde que HoverZoomDirective de la cátedra:
// colorea el borde según el tipo de butaca y la agranda al pasar el mouse.
@Directive({
  selector: '[appButaca]',
  standalone: true,
})
export class ButacaDirective implements OnInit {
  @Input() appButaca: TipoButaca = 'normal';

  private el = inject(ElementRef);
  private render = inject(Renderer2);

  ngOnInit(): void {
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