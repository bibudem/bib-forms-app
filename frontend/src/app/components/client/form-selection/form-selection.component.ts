import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsService, Form } from '../../../services/forms.service';
import { AuthService } from '../../../services/auth.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-form-selection',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './form-selection.component.html',
  styleUrls: ['./form-selection.component.scss'] // ⚡️ correction styleUrls
})
export class FormSelectionComponent implements OnInit {
  forms: Form[] = [];
  loading = true;
  userEmail = '';

  constructor(
    private formsService: FormsService,
    private authService: AuthService,
    private router: Router,
    private cd: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    await this.loadPublishedForms();
    await this.loadUserInfo();
  }

  async loadPublishedForms() {
    this.loading = true;
    try {
      const data: Form[] = await firstValueFrom(this.formsService.getForms(true));
      this.forms = data;
      console.log('📋 Formulaires publiés chargés:', this.forms.length);
    } catch (err: any) {
      console.error('❌ Erreur lors du chargement des formulaires:', err);
    } finally {
      this.loading = false;
      this.cd.detectChanges();
    }
  }

  async loadUserInfo() {
    try {
      const profile = await firstValueFrom(this.authService.getProfile());
      if (profile && profile.data) {
        this.userEmail = profile.data.email;
        console.log('👤 Utilisateur connecté:', this.userEmail);
      }
    } catch (err) {
      console.error('❌ Erreur récupération profil:', err);
    } finally {
      this.cd.detectChanges();
    }
  }

  openForm(formId: string) {
    this.router.navigate(['/client/form', formId]);
  }

  async logout() {
    try {
      await firstValueFrom(this.authService.signOut());
      // navigation gérée dans AuthService.signOut()
    } catch (err) {
      console.error('❌ Erreur lors de la déconnexion:', err);
    }
  }
}
