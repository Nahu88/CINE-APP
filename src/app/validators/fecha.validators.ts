import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

// Validadores de grupo: un campo solo no sabe si la fecha existe.

// new Date(2026, 1, 31) no falla, da 3 de marzo: si no coincide con lo
// escrito, la fecha no existe.
function existe(dia: number, mes: number, anio: number): boolean {
  const fecha = new Date(anio, mes - 1, dia);
  return fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia;
}

// Para la fecha de una función: tiene que existir y no puede ser anterior a hoy.
export function fechaFuturaValidator(): ValidatorFn {
  return (grupo: AbstractControl): ValidationErrors | null => {
    const dia = Number(grupo.get('dia')?.value);
    const mes = Number(grupo.get('mes')?.value);
    const anio = Number(grupo.get('anio')?.value);

    if (!dia || !mes || !anio) {
      return null; // de los campos vacíos se ocupa Validators.required
    }
    if (!existe(dia, mes, anio)) {
      return { fechaInexistente: true };
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    if (new Date(anio, mes - 1, dia) < hoy) {
      return { fechaPasada: true };
    }
    return null;
  };
}

// Fecha de estreno: opcional, pero si se completa algo tiene que existir.
export function fechaOpcionalValidator(): ValidatorFn {
  return (grupo: AbstractControl): ValidationErrors | null => {
    const dia = Number(grupo.get('dia')?.value);
    const mes = Number(grupo.get('mes')?.value);
    const anio = Number(grupo.get('anio')?.value);

    if (!dia && !mes && !anio) {
      return null;
    }
    if (!dia || !mes || !anio) {
      return { fechaIncompleta: true };
    }
    if (!existe(dia, mes, anio)) {
      return { fechaInexistente: true };
    }
    return null;
  };
}
