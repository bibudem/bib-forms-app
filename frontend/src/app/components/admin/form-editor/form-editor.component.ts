import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SurveyModule } from 'survey-angular-ui';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsService } from '../../../services/forms.service';
import { surveyLocalization } from 'survey-core';
import { PlainLight } from 'survey-core/themes';
import { HttpErrorResponse } from '@angular/common/http';

import 'survey-core/i18n/french';

import { Model } from 'survey-core';

// Définit la langue française par défaut pour SurveyJS
surveyLocalization.defaultLocale = 'fr';

@Component({
  selector: 'app-form-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, SurveyModule],
  templateUrl: './form-editor.component.html',
  styleUrl: './form-editor.component.scss'
})
export class FormEditorComponent implements OnInit {
  formId: string | null = null;
  isEditMode = false;
  loading = true;
  saving = false;
  
  formTitle = 'Mon nouveau formulaire';
  formDescription = '';
  jsonSchema = '';

  showPreview = false;
  previewSurvey!: Model; 
  jsonError = '';

  defaultTemplate = {
    title: 'Mon nouveau formulaire',
    description: 'Description du formulaire',
    pages: [
      {
        name: 'page1',
        elements: [
          {
            type: 'text',
            name: 'question1',
            title: 'Question exemple',
            isRequired: true
          },
          {
            type: 'comment',
            name: 'question2',
            title: 'Commentaires'
          }
        ]
      }
    ]
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private formsService: FormsService,
    private cd: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    this.formId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.formId;

    try {
      if (this.isEditMode && this.formId) {
        await this.loadForm(this.formId);
      } else {
        this.jsonSchema = JSON.stringify(this.defaultTemplate, null, 2);
      }
    } catch (e) {
      console.error('Erreur lors du chargement', e);
      alert('Erreur lors du chargement du formulaire');
      this.router.navigate(['/admin/forms']);
    } finally {
      this.loading = false; 
      this.cd.detectChanges();
    }
  }

  async loadForm(formId: string) {
    try {
      const form = await this.formsService.getForm(formId).toPromise();
      
      if (!form) {
        throw new Error('Formulaire non trouvé');
      }

      this.formTitle = form.title;
      this.formDescription = form.description || '';
      this.jsonSchema = JSON.stringify(form.json_schema, null, 2);
      
    } catch (error) {
      console.error('Erreur loadForm:', error);
      throw error;
    }
  }

  validateJSON(): boolean {
    try {
      const parsed = JSON.parse(this.jsonSchema);
      if (!parsed || typeof parsed !== 'object') {
        this.jsonError = 'Le JSON doit être un objet';
        return false;
      }

      if (parsed.title) this.formTitle = parsed.title;
      if (parsed.description) this.formDescription = parsed.description;

      this.jsonError = '';
      return true;
    } catch (e: any) {
      this.jsonError = 'JSON invalide : ' + e.message;
      return false;
    }
  }

  togglePreview() {
    if (!this.validateJSON()) {
      alert('Corrigez les erreurs JSON avant de prévisualiser');
      return;
    }

    this.showPreview = !this.showPreview;

    if (this.showPreview) {
      try {
        const surveyJSON = JSON.parse(this.jsonSchema);
        this.previewSurvey = new Model(surveyJSON);
        this.previewSurvey.applyTheme(PlainLight);
        this.previewSurvey.locale = 'fr';
      } catch (e) {
        alert('Erreur JSON');
        this.showPreview = false;
      }
    }
  }

  async saveForm(shouldPublish: boolean = false) {
    if (!this.validateJSON()) {
      alert('Corrigez les erreurs JSON avant de sauvegarder');
      return;
    }

    this.saving = true;

    try {
      const surveyJSON = JSON.parse(this.jsonSchema);

      // S'assurer que title et description sont dans surveyJSON
      if (!surveyJSON.title) {
        surveyJSON.title = this.formTitle;
      }
      if (!surveyJSON.description) {
        surveyJSON.description = this.formDescription;
      }

      const formData = {
        title: surveyJSON.title,
        description: surveyJSON.description,
        json_schema: surveyJSON, // Envoyer l'objet directement
        status: shouldPublish ? 'published' as const : 'draft' as const
      };

      console.log('📤 Envoi formData:', JSON.stringify(formData, null, 2));

      if (this.isEditMode && this.formId) {
        // Mode édition
        const updatedForm = await this.formsService.updateForm(this.formId, formData).toPromise();
        
        if (!updatedForm) {
          throw new Error('Erreur lors de la mise à jour');
        }
        
        alert(shouldPublish ? 'Formulaire publié !' : 'Formulaire mis à jour !');
        
      } else {
        // Mode création
        console.log('🆕 Création d\'un nouveau formulaire...');
        
        const createdForm = await this.formsService.createForm(formData).toPromise();
        
        if (!createdForm) {
          throw new Error('Erreur lors de la création');
        }
        
        console.log('✅ Formulaire créé:', createdForm);
        
        this.formId = createdForm.id;
        this.isEditMode = true;
        alert('Formulaire créé avec succès !');
        this.router.navigate(['/admin/forms', createdForm.id, 'edit']);
      }
      
    } catch (error: any) {
      console.error('❌ Erreur saveForm:', error);
      
      // Gestion détaillée des erreurs HTTP
      if (error instanceof HttpErrorResponse) {
        console.error('Status:', error.status);
        console.error('Error body:', error.error);
        console.error('Message:', error.message);
        
        let errorMessage = 'Une erreur est survenue';
        
        if (error.error?.error) {
          errorMessage = error.error.error;
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.status === 0) {
          errorMessage = 'Impossible de contacter le serveur. Vérifiez que le backend est démarré.';
        } else if (error.status === 401) {
          errorMessage = 'Non authentifié. Veuillez vous reconnecter.';
        } else if (error.status === 403) {
          errorMessage = 'Accès refusé. Droits administrateur requis.';
        } else if (error.status === 500) {
          errorMessage = 'Erreur serveur. Consultez les logs du backend.';
        }
        
        alert('Erreur : ' + errorMessage);
      } else {
        alert('Erreur : ' + (error.message || 'Une erreur est survenue'));
      }
    } finally {
      this.saving = false;
      this.cd.detectChanges();
    }
  }

  async saveDraft() {
    await this.saveForm(false);
  }

  async saveAndPublish() {
    if (confirm('Publier ce formulaire ?')) {
      await this.saveForm(true);
    }
  }

  goBack() {
    this.router.navigate(['/admin/forms']);
  }

  insertTemplate(type: string) {
    let template = '';

    switch (type) {
      case 'text':
        template = `{
  "type": "text",
  "name": "question_${Date.now()}",
  "title": "Votre question",
  "isRequired": false
}`;
        break;
      case 'comment':
        template = `{
  "type": "comment",
  "name": "question_${Date.now()}",
  "title": "Commentaires",
  "rows": 4
}`;
        break;
      case 'dropdown':
        template = `{
  "type": "dropdown",
  "name": "question_${Date.now()}",
  "title": "Sélectionnez une option",
  "choices": ["Option 1", "Option 2", "Option 3"]
}`;
        break;
      case 'checkbox':
        template = `{
  "type": "checkbox",
  "name": "question_${Date.now()}",
  "title": "Cochez les options",
  "choices": ["Option 1", "Option 2", "Option 3"]
}`;
        break;
      case 'radiogroup':
        template = `{
  "type": "radiogroup",
  "name": "question_${Date.now()}",
  "title": "Choisissez une option",
  "choices": ["Option 1", "Option 2", "Option 3"]
}`;
        break;
      case 'rating':
        template = `{
  "type": "rating",
  "name": "question_${Date.now()}",
  "title": "Évaluez",
  "rateMin": 1,
  "rateMax": 5
}`;
        break;
      case 'boolean':
        template = `{
  "type": "boolean",
  "name": "question_${Date.now()}",
  "title": "Oui ou Non ?",
  "labelTrue": "Oui",
  "labelFalse": "Non"
}`;
        break;
      case 'file':
        template = `{
  "type": "file",
  "name": "question_${Date.now()}",
  "title": "Téléversez un fichier",
  "storeDataAsText": false,
  "maxSize": 1024000
}`;
        break;
    }

    const textarea = document.getElementById('jsonEditor') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = this.jsonSchema;
      this.jsonSchema = text.substring(0, start) + template + text.substring(end);
    }
  }
}