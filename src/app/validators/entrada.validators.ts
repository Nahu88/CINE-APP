import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

// El código de una entrada se genera con crypto.randomUUID(), que siempre devuelve un texto de 36 caracteres.
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