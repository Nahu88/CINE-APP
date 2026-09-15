import { Service } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

// Único cliente de Supabase de toda la app. Los demás servicios usan `client`
// en vez de crear el suyo, para que todos compartan la misma sesión del usuario.
@Service()
export class SupabaseService {
  private supabase: SupabaseClient = createClient(
    environment.supabaseUrl,
    environment.supabaseKey
  );

  get client(): SupabaseClient {
    return this.supabase;
  }

  async ping(): Promise<{ ok: boolean; detail: string }> {
    const { error } = await this.supabase
      .from('__ping__')
      .select('*')
      .limit(1);

    if (!error || error.code === 'PGRST205') {
      return { ok: true, detail: 'Conexión establecida con Supabase.' };
    }
    return { ok: false, detail: `${error.code ?? 'error'}: ${error.message}` };
  }
}
