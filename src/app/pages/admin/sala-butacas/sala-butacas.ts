import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MapaButacas } from '../../../componentes/mapa-butacas/mapa-butacas';
import { Butaca, TipoButaca } from '../../../models/sala.model';
import { ActividadService } from '../../../services/actividad';
import { ComprasService } from '../../../services/compra';
import { SalasService } from '../../../services/salas';

// Reutiliza el mapa de la compra: el mapa avisa qué butaca se tocó y esta página le cambia el tipo.
@Component({
  imports: [RouterLink, MapaButacas],
  selector: 'app-sala-butacas',
  templateUrl: './sala-butacas.html',
})
export class SalaButacas implements OnInit {
  private route = inject(ActivatedRoute);
  private salasService = inject(SalasService);
  private comprasService = inject(ComprasService);
  private actividad = inject(ActividadService);

  salaNombre = signal('');
  butacas = signal<Butaca[]>([]);
  tipoElegido = signal<TipoButaca>('normal');
  cargando = signal(true);
  error = signal<string | null>(null);

  readonly tipos: TipoButaca[] = ['normal', 'accesible', 'vip'];

  conteo = computed(() => {
    const conteo = { normal: 0, accesible: 0, vip: 0 };
    for (const butaca of this.butacas()) {
      conteo[butaca.tipo]++;
    }
    return conteo;
  });

  private salaId = 0;

  async ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.salaId = id;
    try {
      const salas = await this.salasService.listar();
      this.salaNombre.set(salas.find((s) => s.id === id)?.nombre ?? '');
      this.butacas.set(await this.comprasService.listarButacas(id));
    } catch {
      this.error.set('No se pudo cargar la sala.');
    } finally {
      this.cargando.set(false);
    }
  }

  async cambiar(butaca: Butaca) {
    const tipo = this.tipoElegido();
    if (butaca.tipo === tipo) return;

    this.error.set(null);
    try {
      await this.salasService.cambiarTipoButaca(butaca.id, tipo);

      // Al recargar, la directiva repinta el borde en ngOnChanges.
      this.butacas.set(await this.comprasService.listarButacas(this.salaId));

      await this.actividad.registrar('cambiar_butaca', 'butacas', butaca.id, this.salaNombre() + ', butaca ' + butaca.fila + butaca.numero + ': de ' + butaca.tipo + ' a ' + tipo);
    } catch {
      this.error.set('No se pudo cambiar la butaca.');
    }
  }
}
