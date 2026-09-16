import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-login',
  styleUrl: './login.css',
  templateUrl: './login.html',
})
export class Login {
  private auth = inject(Auth);
  private router = inject(Router);

  enviando = signal(false);
  errorServidor = signal<string | null>(null);

  formLogin = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    // Acá no se valida el largo: si la contraseña es incorrecta lo dice Supabase.
    clave: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  tieneError(campo: string, error: string): boolean {
    const control = this.formLogin.get(campo);
    return !!control && control.touched && control.hasError(error);
  }

  async ingresar() {
    if (this.formLogin.invalid) {
      this.formLogin.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    this.errorServidor.set(null);

    const { email, clave } = this.formLogin.getRawValue();
    const { error } = await this.auth.iniciarSesion(email, clave);

    this.enviando.set(false);

    if (error) {
      console.error('Error al iniciar sesión:', error);
      this.errorServidor.set(this.traducirError(error.message));
      return;
    }

    this.router.navigate(['/home']);
  }

  private traducirError(mensaje: string): string {
    const texto = mensaje.toLowerCase();
    if (texto.includes('invalid login credentials')) {
      return 'El email o la contraseña no son correctos.';
    }
    if (texto.includes('email not confirmed')) {
      return 'Todavía no confirmaste tu cuenta desde el mail.';
    }
    return 'No se pudo iniciar sesión. Intentá de nuevo más tarde.';
  }
}
