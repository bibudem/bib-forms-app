import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsService } from '../../../services/forms.service';

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
    private formsService: FormsService,
    private router: Router,
    private cd: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    this.loading = true;
    try {
      await this.loadStats();
    } catch (err) {
      console.error('Erreur au chargement du dashboard:', err);
    } finally {
      this.loading = false; 
      this.cd.detectChanges();
    }
  }

  async loadStats() {
    try {
      // Charger les formulaires
      this.formsService.getForms().subscribe({
        next: (forms) => {
          if (forms) {
            this.stats.totalForms = forms.length;
            this.stats.publishedForms = forms.filter((f: any) => f.status === 'published').length;
            this.stats.draftForms = forms.filter((f: any) => f.status === 'draft').length;
          }
          this.cd.detectChanges();
        },
        error: (error) => {
          console.error('[Dashboard] Erreur forms:', error);
        }
      });

      // Charger les réponses
      this.formsService.getResponses().subscribe({
        next: (responses) => {
          if (responses) {
            this.stats.totalResponses = responses.length;
          }
          this.cd.detectChanges();
        },
        error: (error) => {
          console.error('[Dashboard] Erreur responses:', error);
        }
      });
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