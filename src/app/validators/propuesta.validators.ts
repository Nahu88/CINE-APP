import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

// Sin tildes, sin mayúsculas y sin espacios de más: "Matrix " y "matrix" son la misma película.
function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

// La propuesta tiene que ser de una película que NO esté en la cartelera.
// Recibe una función que devuelve los títulos, porque la cartelera se carga
// después de crear el formulario (llega de Supabase en ngOnInit).
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
