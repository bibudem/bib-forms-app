import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  email: string = '';
  password: string = '';
  confirmPassword: string = '';
  loading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  constructor(
    private supabaseService: SupabaseService,
    private router: Router
  ) {}

  async onRegister() {
  if (!this.email || !this.password || !this.confirmPassword) {
    this.errorMessage = 'Veuillez remplir tous les champs';
    return;
  }
  if (this.password !== this.confirmPassword) {
    this.errorMessage = 'Les mots de passe ne correspondent pas';
    return;
  }

  this.loading = true;
  this.errorMessage = '';
  this.successMessage = '';

  try {
    // 1️⃣ Créer l'utilisateur dans Supabase Auth
    const { data: signUpData, error: signUpError } = await this.supabaseService.signUp(this.email, this.password);

    if (signUpError) {
      this.errorMessage = signUpError.message.includes('already registered')
        ? 'Cet email est déjà utilisé'
        : signUpError.message;
      this.loading = false;
      return;
    }

    // 2️⃣ Créer automatiquement le profil dans "profiles"
    if (signUpData.user) {
      const { data: profileData, error: profileError } =
        await this.supabaseService.createProfile(signUpData.user.id, signUpData.user.email!);

      if (profileError) {
        console.error('[Profile] erreur:', profileError);
      } else {
        console.log('[Profile] créé:', profileData);
      }
    }

    // 3️⃣ Optionnel : connecter immédiatement l'utilisateur si email confirmation désactivée
    const { data: sessionData, error: signInError } = await this.supabaseService.signIn(this.email, this.password);
    if (signInError) {
      console.warn('[SignIn] non connecté automatiquement:', signInError.message);
    } else {
      console.log('[SignIn] connecté:', sessionData.session?.user);
    }

    this.successMessage = 'Compte créé avec succès ! Vérifiez votre email pour confirmer votre inscription.';
    
    setTimeout(() => {
      this.router.navigate(['/login']);
    }, 3000);

  } catch (err: any) {
    this.errorMessage = 'Une erreur est survenue lors de l\'inscription';
    this.loading = false;
  }
}

  goToLogin() {
    this.router.navigate(['/login']);
  }
}