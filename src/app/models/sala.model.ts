export interface Sala {
  id: number;
  nombre: string;
}

export type TipoButaca = 'normal' | 'accesible' | 'vip';

export interface Butaca {
  id: number;
  sala_id: number;
  fila: string;
  numero: number;
  tipo: TipoButaca;
}