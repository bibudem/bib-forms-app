import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SupabaseService } from '../../../services/supabase.service';

interface Form {
  id: string;
  title: string;
  description: string;
  status: string;
}

@Component({
  selector: 'app-form-selection',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './form-selection.component.html',
  styleUrl: './form-selection.component.scss'
})
export class FormSelectionComponent implements OnInit {
  forms: Form[] = [];
  loading: boolean = true;
  userEmail: string = '';

  constructor(
    private supabaseService: SupabaseService,
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
      const { data, error } = await this.supabaseService.getForms(true);
      
      if (error) {
        console.error('Erreur:', error);
      } else if (data) {
        this.forms = data;
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
    } finally {
      this.loading = false;
      this.cd.detectChanges();
    }
  }

  async loadUserInfo() {
    const profile = await this.supabaseService.getProfile();
    if (profile && profile.data) {
      this.userEmail = profile.data.email;
    }
  }

  openForm(formId: string) {
    this.router.navigate(['/client/form', formId]);
  }

  async logout() {
    await this.supabaseService.signOut();
    this.router.navigate(['/login']);
  }
}