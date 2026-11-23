// Una fila de la vista `mis_listas_espera`.
export interface MiListaEspera {
  id: string;
  funcion_id: string;
  usuario_id: string;
  estado: 'esperando' | 'notificado';
  notificado_at: string | null; // cuándo empezó su turno
  posicion: number | null; // null si ya le tocó el turno
}

// Una fila de la vista `espera_por_funcion`.
export interface EsperaPorFuncion {
  funcion_id: string;
  en_espera: number;
  con_turno: number; // con su turno de 15 minutos en curso
}
