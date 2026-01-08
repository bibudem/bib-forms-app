import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'] // ⚡ correction styleUrls
})
export class LoginComponent {
  email: string = '';
  password: string = '';
  loading: boolean = false;
  errorMessage: string = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  async onLogin() {
    if (!this.email || !this.password) {
      this.errorMessage = 'Veuillez remplir tous les champs';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    try {
      // Utiliser AuthService pour la connexion
      const response = await firstValueFrom(this.authService.signIn(this.email, this.password));

      if (!response || !response.user) {
        this.errorMessage = 'Email ou mot de passe incorrect';
        this.loading = false;
        return;
      }

      // Vérifier le rôle
      if (response.user.role === 'admin') {
        this.router.navigate(['/admin']);
      } else {
        this.router.navigate(['/client']);
      }

    } catch (err: any) {
      console.error('❌ Erreur connexion:', err);
      this.errorMessage = err?.error?.message || 'Une erreur est survenue';
    } finally {
      this.loading = false;
    }
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }
}
