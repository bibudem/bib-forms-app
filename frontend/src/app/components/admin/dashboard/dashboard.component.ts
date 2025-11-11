import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SupabaseService } from '../../../services/supabase.service';

interface Stats {
  totalForms: number;
  publishedForms: number;
  draftForms: number;
  totalResponses: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  stats: Stats = {
    totalForms: 0,
    publishedForms: 0,
    draftForms: 0,
    totalResponses: 0
  };
  loading: boolean = true;
  userEmail: string = '';

  constructor(
    private supabaseService: SupabaseService,
    private router: Router,
    private cd: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    this.loading = false;
    try {
      await Promise.all([this.loadStats()]);
      this.loading = false;
    } catch (err) {
      console.error('Erreur au chargement du dashboard:', err);
    } finally {
      this.loading = false; 
      this.cd.detectChanges();
    }
  }


  async loadStats() {
    try {
      const { data: forms, error: formsError } = await this.supabaseService.getForms();
      if (forms) {
        this.stats.totalForms = forms.length;
        this.stats.publishedForms = forms.filter(f => f.status === 'published').length;
        this.stats.draftForms = forms.filter(f => f.status === 'draft').length;
      } else if (formsError) {
        console.error('[Dashboard] Erreur forms:', formsError);
      }

      const { data: responses, error: responsesError } = await this.supabaseService.getResponses();
      if (responses) {
        this.stats.totalResponses = responses.length;
      } else if (responsesError) {
        console.error('[Dashboard] Erreur responses:', responsesError);
      }
    } catch (err) {
      console.error('[Dashboard] Exception loadStats:', err);
    }
  }


  goToForms() {
    this.router.navigate(['/admin/forms']);
  }

  goToResponses() {
    this.router.navigate(['/admin/responses']);
  }

  createNewForm() {
    this.router.navigate(['/admin/forms/new']);
  }

}