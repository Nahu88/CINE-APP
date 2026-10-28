// Ayudas para cargar fechas y horas sin el calendario del navegador
// (el cliente lo pidió expresamente: RNF-07). Las usan los formularios
// de películas y funciones.

export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// getDay() de JavaScript devuelve 0 para el domingo y 1 para el lunes.
export const DIAS_SEMANA = [
  { numero: 1, nombre: 'Lun' },
  { numero: 2, nombre: 'Mar' },
  { numero: 3, nombre: 'Mié' },
  { numero: 4, nombre: 'Jue' },
  { numero: 5, nombre: 'Vie' },
  { numero: 6, nombre: 'Sáb' },
  { numero: 0, nombre: 'Dom' },
];

// Lista de números para llenar un <select>: numeros(1, 31) -> [1, 2, ..., 31]
export function numeros(desde: number, hasta: number): number[] {
  const lista: number[] = [];
  for (let n = desde; n <= hasta; n++) {
    lista.push(n);
  }
  return lista;
}

// Agrega un cero adelante: 5 -> "05"
export function dosDigitos(numero: number | string): string {
  return String(numero).padStart(2, '0');
}

// (9, 3, 2026) -> "2026-03-09"
export function aFechaIso(dia: number | string, mes: number | string, anio: number | string): string {
  return anio + '-' + dosDigitos(mes) + '-' + dosDigitos(dia);
}

// Edad a partir de 'YYYY-MM-DD', sin depender de la zona horaria.
export function edadDe(fechaIso: string): number {
  const partes = fechaIso.split('-');
  const anio = Number(partes[0]);
  const mes = Number(partes[1]) - 1;
  const dia = Number(partes[2]);
  const hoy = new Date();

  let edad = hoy.getFullYear() - anio;
  const yaCumplio = hoy.getMonth() > mes || (hoy.getMonth() === mes && hoy.getDate() >= dia);
  if (!yaCumplio) edad--;
  return edad;
}

// Fecha sin hora de una fecha de JavaScript: 'YYYY-MM-DD' en hora local.
export function diaLocal(fecha: Date): string {
  return aFechaIso(fecha.getDate(), fecha.getMonth() + 1, fecha.getFullYear());
}
