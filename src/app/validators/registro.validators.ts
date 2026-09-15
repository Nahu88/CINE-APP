import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

// De grupo para que se reevalúe al cambiar cualquiera de las dos claves.
export function clavesCoincidenValidator(nombreClave: string, nombreConfirmacion: string): ValidatorFn {
  return (grupo: AbstractControl): ValidationErrors | null => {
    const clave = grupo.get(nombreClave)?.value;
    const confirmacion = grupo.get(nombreConfirmacion)?.value;

    if (!confirmacion) {
      return null;
    }
    return clave === confirmacion ? null : { clavesNoCoinciden: true };
  };
}

// Letras con tildes y ñ, espacios, apóstrofo y guion.
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

// De grupo porque solo con día, mes y año juntos se sabe si la fecha existe (ej: 31/02).
export function fechaNacimientoValidator(edadMaxima = 120): ValidatorFn {
  return (grupo: AbstractControl): ValidationErrors | null => {
    const diaTexto: string = grupo.get('dia')?.value ?? '';
    const mesTexto: string = grupo.get('mes')?.value ?? '';
    const anioTexto: string = grupo.get('anio')?.value ?? '';

    if (!diaTexto || !mesTexto || !anioTexto) {
      return null;
    }

    const dia = Number(diaTexto);
    const mes = Number(mesTexto);
    const anio = Number(anioTexto);

    // new Date convierte 31/02 en 03/03: si no coincide con lo ingresado, la fecha no existe.
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
