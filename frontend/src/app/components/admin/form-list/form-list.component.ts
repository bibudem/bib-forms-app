import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { SupabaseService } from '../../../services/supabase.service';

interface Form {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'published';
  created_at: string;
  updated_at: string;
}

@Component({
  selector: 'app-form-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './form-list.component.html',
  styleUrls: ['./form-list.component.scss']
})
export class FormListComponent implements OnInit {
  forms: Form[] = [];
  loading = true;
  errorMessage = '';
  showDeleteModal = false;
  formToDelete: Form | null = null;
  deleting = false;
  selectedStatus: 'all' | 'published' | 'draft' = 'all';

  constructor(
    private router: Router,
    private supabaseService: SupabaseService,
    private cd: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    await this.loadForms();
  }

  async loadForms() {
    this.loading = true;
    this.errorMessage = '';

    try {
      const { data, error } = await this.supabaseService.getForms(false);

      if (error) {
        console.error('Erreur:', error);
        this.errorMessage = 'Erreur lors du chargement des formulaires';
      } else if (data) {
        this.forms = data as Form[];
        console.log('📋 Formulaires chargés:', this.forms.length);
      }
    } catch (err: any) {
      console.error('Exception:', err);
      this.errorMessage = err.message || 'Erreur inconnue';
    } finally {
      this.loading = false;
      this.cd.detectChanges();
    }
  }

  /**
   * Filtrer les formulaires selon le statut sélectionné
   */
  getFilteredForms(): Form[] {
    if (this.selectedStatus === 'all') {
      return this.forms;
    }
    return this.forms.filter(f => f.status === this.selectedStatus);
  }

  /**
   * Changer le filtre
   */
  setFilter(status: 'all' | 'published' | 'draft') {
    this.selectedStatus = status;
  }

  /**
   * Compter les formulaires publiés
   */
  getPublishedCount(): number {
    return this.forms.filter(f => f.status === 'published').length;
  }

  /**
   * Compter les brouillons
   */
  getDraftCount(): number {
    return this.forms.filter(f => f.status === 'draft').length;
  }

  /**
   * Obtenir le texte du statut
   */
  getStatusText(status: string): string {
    return status === 'published' ? 'Publié' : 'Brouillon';
  }

  /**
   * Obtenir la classe CSS du badge de statut
   */
  getStatusBadgeClass(status: string): string {
    return status === 'published' ? 'badge-published' : 'badge-draft';
  }

  createNewForm() {
    this.router.navigate(['/admin/forms/new']);
  }

  editForm(formId: string) {
    this.router.navigate(['/admin/forms', formId, 'edit']);
  }

  viewResponses(formId: string) {
    this.router.navigate(['/admin/responses', formId]);
  }

  /**
   * ✅ Publier un formulaire
   */
  async publishForm(formId: string) {
    if (!confirm('Publier ce formulaire ?')) return;

    try {
      const { error } = await this.supabaseService.publishForm(formId);

      if (error) {
        console.error('❌ Erreur publication:', error);
        alert('Erreur lors de la publication');
        return;
      }

      alert('✅ Formulaire publié avec succès !');
      await this.loadForms();
    } catch (err: any) {
      console.error('❌ Exception:', err);
      alert('Erreur: ' + err.message);
    }
  }

  /**
   * ✅ Ouvrir la modal de confirmation de suppression
   */
  confirmDelete(form: Form, event: Event) {
    event.stopPropagation();
    this.formToDelete = form;
    this.showDeleteModal = true;
  }

  /**
   * ✅ Annuler la suppression
   */
  cancelDelete() {
    this.showDeleteModal = false;
    this.formToDelete = null;
  }

  /**
   * ✅ Supprimer le formulaire
   */
  async deleteForm() {
    if (!this.formToDelete) return;

    this.deleting = true;
    const formId = this.formToDelete.id;
    const formTitle = this.formToDelete.title;

    try {
      console.log('🗑️ Suppression du formulaire:', formId);

      // Vérifier s'il y a des réponses
      const hasResponses = await this.supabaseService.hasResponses(formId);

      if (hasResponses) {
        const confirmWithResponses = confirm(
          `⚠️ Ce formulaire a des réponses associées. Êtes-vous sûr de vouloir le supprimer ? Les réponses seront également supprimées.`
        );

        if (!confirmWithResponses) {
          this.deleting = false;
          this.cancelDelete();
          return;
        }
      }

      // Supprimer le formulaire
      const { error } = await this.supabaseService.deleteForm(formId);

      if (error) {
        console.error('❌ Erreur suppression:', error);
        throw error;
      }

      console.log('✅ Formulaire supprimé');
      alert(`✅ Le formulaire "${formTitle}" a été supprimé avec succès.`);

      // Recharger la liste
      await this.loadForms();
      this.cancelDelete();

    } catch (err: any) {
      console.error('❌ Exception suppression:', err);
      alert(`Erreur lors de la suppression : ${err.message}`);
    } finally {
      this.deleting = false;
    }
  }

  /**
   * Retour
   */
  goBack() {
    this.router.navigate(['/admin']);
  }

  /**
   * Formater la date
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-CA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Badge de statut
   */
  getStatusBadge(status: string): string {
    return status === 'published' ? '✅ Publié' : '📝 Brouillon';
  }

  /**
   * Classe CSS pour le badge
   */
  getStatusClass(status: string): string {
    return status === 'published' ? 'badge-published' : 'badge-draft';
  }
}