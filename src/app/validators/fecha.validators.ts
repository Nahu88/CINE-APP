import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

// Validadores de grupo para una fecha cargada en tres campos: dia, mes y anio.
// Van sobre el FormGroup porque un campo solo no sabe si la fecha existe.

// Arma la fecha y compara: new Date(2026, 1, 31) no da error, se convierte
// en 3 de marzo. Si el día, mes o año que quedó no es el que se escribió,
// la fecha no existe.
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

// Para la fecha de estreno: es opcional, pero si se completa algo, tiene
// que estar completa y existir.
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
