import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';
import {
  clavesCoincidenValidator,
  fechaNacimientoValidator,
  soloLetrasValidator,
} from '../../validators/registro.validators';

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-registro',
  styleUrl: './registro.css',
  templateUrl: './registro.html',
})
export class Registro {
  private auth = inject(Auth);
  private router = inject(Router);

  readonly tiposSangre = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', '0+', '0-'];
  readonly coloresOjos = ['Marrón', 'Negro', 'Miel', 'Verde', 'Azul', 'Gris', 'Otro'];
  readonly meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];

  enviando = signal(false);
  errorServidor = signal<string | null>(null);

  formRegistro = new FormGroup(
    {
      email: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.email],
      }),
      // 6 es el mínimo de Supabase Auth
      clave: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(6)],
      }),
      confirmarClave: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      nombre: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.maxLength(50), soloLetrasValidator()],
      }),
      apellido: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.maxLength(50), soloLetrasValidator()],
      }),
      // Sin calendario: lo pidió el cliente en el mail del 28/02
      fecha_nacimiento: new FormGroup(
        {
          dia: new FormControl('', {
            nonNullable: true,
            validators: [Validators.required, Validators.pattern(/^\d{1,2}$/)],
          }),
          mes: new FormControl('', {
            nonNullable: true,
            validators: [Validators.required],
          }),
          anio: new FormControl('', {
            nonNullable: true,
            validators: [Validators.required, Validators.pattern(/^\d{4}$/)],
          }),
        },
        { validators: [fechaNacimientoValidator()] }
      ),
      tipo_sangre: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      color_ojos: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      dias_vacaciones: new FormControl<number | null>(null, {
        validators: [
          Validators.required,
          Validators.min(0),
          Validators.max(365),
          Validators.pattern(/^\d+$/),
        ],
      }),
    },
    { validators: [clavesCoincidenValidator('clave', 'confirmarClave')] }
  );

  tieneError(campo: string, error: string): boolean {
    const control = this.formRegistro.get(campo);
    return !!control && control.touched && control.hasError(error);
  }

  clavesNoCoinciden(): boolean {
    return (
      this.formRegistro.controls.confirmarClave.touched &&
      this.formRegistro.hasError('clavesNoCoinciden')
    );
  }

  // Se muestra recién cuando el usuario pasó por el año, el último campo de la fecha
  fechaIncompleta(): boolean {
    const { dia, mes, anio } = this.formRegistro.controls.fecha_nacimiento.controls;
    return anio.touched && [dia, mes, anio].some((control) => control.hasError('required'));
  }

  fechaConError(): boolean {
    const fecha = this.formRegistro.controls.fecha_nacimiento;
    return fecha.touched && fecha.errors !== null;
  }

  async registrar() {
    if (this.formRegistro.invalid) {
      this.formRegistro.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    this.errorServidor.set(null);

    const { confirmarClave, clave, fecha_nacimiento, dias_vacaciones, ...datos } =
      this.formRegistro.getRawValue();

    const { error } = await this.auth.registrar({
      ...datos,
      password: clave,
      fecha_nacimiento: this.aFechaIso(fecha_nacimiento),
      dias_vacaciones: Number(dias_vacaciones),
    });

    this.enviando.set(false);

    if (error) {
      console.error('Error al registrar:', error);
      this.errorServidor.set(this.traducirError(error.message));
      return;
    }

    // signUp ya deja la sesión iniciada porque la confirmación de email está desactivada
    this.router.navigate(['/home']);
  }

  private aFechaIso(fecha: { dia: string; mes: string; anio: string }): string {
    const dia = fecha.dia.padStart(2, '0');
    const mes = fecha.mes.padStart(2, '0');
    return `${fecha.anio}-${mes}-${dia}`;
  }

  private traducirError(mensaje: string): string {
    const texto = mensaje.toLowerCase();
    if (texto.includes('already registered')) {
      return 'Ya existe una cuenta con ese email.';
    }
    if (texto.includes('rate limit')) {
      return 'Hubo demasiados intentos. Esperá unos minutos y volvé a probar.';
    }
    if (texto.includes('password')) {
      return 'La contraseña no cumple los requisitos de seguridad.';
    }
    return 'No se pudo crear la cuenta. Intentá de nuevo más tarde.';
  }
}
