import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  email: string = '';
  password: string = '';
  loading: boolean = false;
  errorMessage: string = '';

  constructor(
    private supabaseService: SupabaseService,
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
      const { data, error } = await this.supabaseService.signIn(this.email, this.password);

      if (error) {
        this.errorMessage = 'Email ou mot de passe incorrect';
        this.loading = false;
        return;
      }

      // Vérifier si admin ou client
      const isAdmin = await this.supabaseService.isAdmin();
      
      if (isAdmin) {
        this.router.navigate(['/admin']);
      } else {
        this.router.navigate(['/client']);
      }
    } catch (err: any) {
      this.errorMessage = 'Une erreur est survenue';
      this.loading = false;
    }
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }
}