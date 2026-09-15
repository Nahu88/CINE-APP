import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

// Validador de grupo (se aplica al FormGroup, no a un control) para que se
// vuelva a evaluar cuando cambia cualquiera de las dos claves, no solo la confirmación.
export function clavesCoincidenValidator(nombreClave: string, nombreConfirmacion: string): ValidatorFn {
  return (grupo: AbstractControl): ValidationErrors | null => {
    const clave = grupo.get(nombreClave)?.value;
    const confirmacion = grupo.get(nombreConfirmacion)?.value;

    // Si la confirmación está vacía, de eso ya se encarga Validators.required
    if (!confirmacion) {
      return null;
    }
    return clave === confirmacion ? null : { clavesNoCoinciden: true };
  };
}

// Letras (incluye tildes y ñ), espacios, apóstrofo y guion. Ej: "María José", "O'Connor"
export function soloLetrasValidator(): ValidatorFn {
  const patron = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]+$/;

  return (control: AbstractControl): ValidationErrors | null => {
    const valor: string = control.value ?? '';
    if (!valor) {
      return null;
    }
    return patron.test(valor.trim()) ? null : { soloLetras: true };
  };
}

// Validador de grupo para la fecha cargada en tres campos (dia, mes, anio).
// Se valida en el grupo porque ningún campo por separado sabe si la fecha existe (ej: 31/02).
// La fecha importa porque después se usa para la restricción de edad y los cupones de mayores de 50.
export function fechaNacimientoValidator(edadMaxima = 120): ValidatorFn {
  return (grupo: AbstractControl): ValidationErrors | null => {
    const diaTexto: string = grupo.get('dia')?.value ?? '';
    const mesTexto: string = grupo.get('mes')?.value ?? '';
    const anioTexto: string = grupo.get('anio')?.value ?? '';

    // Mientras falte algún campo no se valida la fecha: de eso se encarga Validators.required
    if (!diaTexto || !mesTexto || !anioTexto) {
      return null;
    }

    const dia = Number(diaTexto);
    const mes = Number(mesTexto);
    const anio = Number(anioTexto);

    // new Date "corrige" fechas imposibles (31/02 pasa a 03/03), así que si
    // al volver a leerla no coincide con lo ingresado, la fecha no existe.
    const fecha = new Date(anio, mes - 1, dia);
    if (fecha.getFullYear() !== anio || fecha.getMonth() !== mes - 1 || fecha.getDate() !== dia) {
      return { fechaInexistente: true };
    }

    const hoy = new Date();
    if (fecha > hoy) {
      return { fechaFutura: true };
    }

    const limite = new Date();
    limite.setFullYear(hoy.getFullYear() - edadMaxima);
    if (fecha < limite) {
      return { fechaDemasiadoAntigua: true };
    }

    return null;
  };
}
