import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.scss',
})
export class AuthComponent implements OnInit {
  isLoginMode = true;
  email = '';
  password = '';
  errorMessage = '';
  successMessage = '';
  isLoading = false;

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  // 🔥 MAGIA AQUÍ: Auto-login si recargas la página 🔥
  ngOnInit() {
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('currentUserId')) {
      this.router.navigate(['/chat']);
    }
  }

  toggleMode() {
    this.isLoginMode = !this.isLoginMode;
    this.errorMessage = '';
    this.successMessage = '';
    this.password = '';
  }

  onSubmit() {
    if (!this.email.endsWith('@universidadean.edu.co')) {
      this.errorMessage = 'Acceso restringido: Debes usar tu correo institucional (@universidadean.edu.co)';
      return;
    }
    if (this.password.length < 6) {
      this.errorMessage = 'La contraseña debe tener al menos 6 caracteres.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    if (this.isLoginMode) {
      this.authService.login(this.email, this.password).subscribe({
        next: (res) => {
          sessionStorage.setItem('currentUserId', res.userId);
          this.router.navigate(['/chat']);
        },
        error: (err) => {
          this.errorMessage = err.error?.error || 'Error al iniciar sesión.';
          this.isLoading = false;
        },
      });
    } else {
      this.authService.register(this.email, this.password).subscribe({
        next: (res) => {
          this.successMessage = 'Registro exitoso. Por favor, inicia sesión.';
          this.isLoginMode = true;
          this.isLoading = false;
          this.password = '';
        },
        error: (err) => {
          this.errorMessage = err?.error?.error || 'Error al conectar con el servidor.';
          this.isLoading = false;
          console.error('Error detallado:', err);
        },
      });
    }
  }
}
