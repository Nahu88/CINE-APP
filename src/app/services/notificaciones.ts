import { computed, inject, Service, signal } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Notificacion } from '../models/notificacion.model';
import { SupabaseService } from './supabase';

// Las notificaciones las crea la base (por ejemplo, al cancelar una función) y llegan por Realtime.
@Service()
export class NotificacionesService {
  private supabase = inject(SupabaseService).client;
  private canal: RealtimeChannel | null = null;

  // Vive en el servicio para que el encabezado y la página de avisos lean la misma lista.
  lista = signal<Notificacion[]>([]);
  sinLeer = computed(() => this.lista().filter((n) => !n.leida).length);

  async iniciar(usuarioId: string) {
    const { data, error } = await this.supabase
      .from('notificaciones')
      .select('*')
      .eq('usuario_id', usuarioId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('No se pudieron cargar los avisos:', error);
      return;
    }
    this.lista.set(data ?? []);

    this.dejarDeEscuchar();
    this.canal = this.supabase
      .channel('notificaciones-' + usuarioId)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notificaciones', filter: 'usuario_id=eq.' + usuarioId },
        (cambio) => {
          const nueva = cambio.new as Notificacion;
          this.lista.update((actual) => [nueva, ...actual]);
          this.mostrarDelSistema(nueva);
        }
      )
      .subscribe();
  }

  detener() {
    this.dejarDeEscuchar();
    this.lista.set([]);
  }

  async marcarTodasLeidas(usuarioId: string) {
    const { error } = await this.supabase
      .from('notificaciones')
      .update({ leida: true })
      .eq('usuario_id', usuarioId)
      .eq('leida', false);
    if (error) throw error;
    this.lista.update((actual) => actual.map((n) => ({ ...n, leida: true })));
  }

  // La API Notification muestra el cartel del sistema mientras la app está abierta, aunque sea en otra pestaña.
  permisoConcedido(): boolean {
    return 'Notification' in window && Notification.permission === 'granted';
  }

  async pedirPermiso(): Promise<boolean> {
    if (!('Notification' in window)) return false;
    const respuesta = await Notification.requestPermission();
    return respuesta === 'granted';
  }

  private mostrarDelSistema(notificacion: Notificacion) {
    if (!this.permisoConcedido()) return;
    new Notification(notificacion.titulo, { body: notificacion.mensaje, icon: '/icons/icon-192x192.png' });
  }

  private dejarDeEscuchar() {
    if (this.canal) {
      this.supabase.removeChannel(this.canal);
      this.canal = null;
    }
  }
}
