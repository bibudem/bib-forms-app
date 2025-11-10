import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SurveyModule } from 'survey-angular-ui';
import { ActivatedRoute, Router } from '@angular/router';
import { SupabaseService } from '../../../services/supabase.service';

import { Model } from 'survey-core';
import { DefaultLight } from 'survey-core/themes';

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
  previewSurvey!: Model; // ✅ plus de null
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
    private supabaseService: SupabaseService,
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
    const { data, error } = await this.supabaseService.getForm(formId);
    if (error || !data) throw new Error('Formulaire non trouvé');

    this.formTitle = data.title;
    this.formDescription = data.description || '';
    this.jsonSchema = JSON.stringify(data.json_schema, null, 2);
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
        this.previewSurvey.applyTheme(DefaultLight);
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

      const formData = {
        title: surveyJSON.title || this.formTitle,
        description: surveyJSON.description || this.formDescription,
        json_schema: surveyJSON,
        status: shouldPublish ? 'published' : 'draft'
      };

      if (this.isEditMode && this.formId) {
        const { error } = await this.supabaseService.updateForm(this.formId, formData);
        if (error) throw error;
        alert(shouldPublish ? 'Formulaire publié !' : 'Formulaire mis à jour !');
      } else {
        const { data, error } = await this.supabaseService.createForm(formData);
        if (error) throw error;
        if (data) {
          this.formId = data.id;
          this.isEditMode = true;
          alert('Formulaire créé !');
          this.router.navigate(['/admin/forms', data.id, 'edit']);
        }
      }
    } catch (error: any) {
      console.error('Erreur:', error);
      alert('Erreur : ' + error.message);
    } finally {
      this.saving = false;
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
    case 'file':  // ← Nouveau type pour fichier
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
