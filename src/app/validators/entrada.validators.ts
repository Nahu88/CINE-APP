import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

// crypto.randomUUID() siempre devuelve 36 caracteres.
export function codigoEntradaValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor: string = control.value ?? '';

    if (valor && valor.trim().length !== 36) {
      return { codigoInvalido: true };
    } else {
      return null;
    }
  };
}