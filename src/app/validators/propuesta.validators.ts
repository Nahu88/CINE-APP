import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

// Sin tildes, sin mayúsculas y sin espacios de más: "Matrix " y "matrix" son la misma película.
function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

// Recibe una función porque los títulos llegan después de crear el formulario.
export function tituloNuevoValidator(titulosCartelera: () => string[]): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const titulo = normalizar(control.value ?? '');
    if (!titulo) return null; // de lo vacío se encarga Validators.required

    for (const existente of titulosCartelera()) {
      if (normalizar(existente) === titulo) {
        return { yaEnCartelera: true };
      }
    }
    return null;
  };
}
