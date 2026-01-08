import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsService, Form, FormResponse } from '../../../services/forms.service';
import { FileUploadService } from '../../../services/file-upload.service';
import { Model } from 'survey-core';
import { SurveyModule } from 'survey-angular-ui';
import { PlainLight } from 'survey-core/themes';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-form-fill',
  standalone: true,
  imports: [CommonModule, SurveyModule],
  templateUrl: './form-fill.component.html',
})
export class FormFillComponent implements OnInit {
  surveyModel: Model | null = null;
  loading = true;
  errorMessage = '';
  formId: string | null = null;
  userId: string | null = null;
  private isSubmitting = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private formsService: FormsService,
    private fileUploadService: FileUploadService,
    private cd: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    this.formId = this.route.snapshot.paramMap.get('id');

    if (!this.formId) {
      this.errorMessage = 'Aucun identifiant de formulaire fourni.';
      this.loading = false;
      this.cd.detectChanges();
      return;
    }

    try {
      // ⚡️ Récupérer le formulaire via Observable
      const data: Form = await firstValueFrom(this.formsService.getForm(this.formId));

      if (!data || !data.json_schema) {
        throw new Error('Aucune structure JSON trouvée');
      }

      console.log('✅ JSON reçu du serveur:', data.json_schema);

      // Création du survey
      this.surveyModel = new Model(data.json_schema);
      this.surveyModel.locale = 'fr';
      this.surveyModel.applyTheme(PlainLight);

      // Configuration des boutons
      this.surveyModel.showCompleteButton = true;
      this.surveyModel.showNavigationButtons = true;
      this.surveyModel.completeText = 'Envoyer';

      // Configuration uploads
      this.configureFileUploads();

      // Handler onComplete
      this.surveyModel.onComplete.add(async (sender) => {
        if (this.isSubmitting) return;
        this.isSubmitting = true;
        try {
          await this.submitSurvey(sender.data);
        } catch (err) {
          console.error('❌ Erreur soumission:', err);
          alert('Erreur lors de la soumission');
          this.isSubmitting = false;
        }
      });

      this.loading = false;
      this.cd.detectChanges();

      console.log('🔹 surveyModel prêt');

    } catch (err: any) {
      this.errorMessage = err.message || 'Erreur lors du chargement du formulaire';
      this.loading = false;
      this.cd.detectChanges();
      console.error('❌ Erreur formulaire:', err);
    }
  }

  private configureFileUploads() {
    if (!this.surveyModel) return;

    this.surveyModel.onUploadFiles.add(async (_, options) => {
      if (!this.formId) {
        options.callback('error', []);
        return;
      }

      const resultFiles: any[] = [];
      let responseId: string;

      try {
        // ⚡️ Créer la réponse avant upload
        const response: FormResponse = await firstValueFrom(
          this.formsService.submitResponse(this.formId, this.surveyModel?.data || {})
        );
        responseId = response.id;
      } catch (err) {
        console.error('❌ Création réponse échouée:', err);
        options.callback('error', []);
        return;
      }

      for (const file of options.files) {
        try {
          const upload = await this.fileUploadService.uploadFile(file, responseId, options.name);
          if (upload.success && upload.fileUrl) {
            resultFiles.push({
              file,
              name: file.name,
              type: file.type,
              content: upload.fileUrl,
              size: file.size || 0
            });
          } else {
            console.error('❌ Upload échoué:', upload.error);
          }
        } catch (err) {
          console.error('❌ Exception upload:', err);
        }
      }

      if (resultFiles.length > 0) options.callback('success', resultFiles);
      else options.callback('error', []);
    });
  }

  private async submitSurvey(result: any) {
    if (!this.formId) return;

    try {
      const data: FormResponse = await firstValueFrom(
        this.formsService.submitResponse(this.formId, result)
      );

      if (!data) throw new Error('Pas de données retournées');
      console.log('✅ Réponse sauvegardée, ID:', data.id);

      // Sauvegarde des métadonnées fichiers
      await this.saveFileMetadata(data.id, result);

      alert('Merci ! Vos réponses ont été enregistrées.');
      this.router.navigate(['/client']);

    } catch (err: any) {
      console.error('❌ Erreur soumission:', err);
      alert(`Erreur: ${err.message || 'Échec de la soumission'}`);
      this.isSubmitting = false;
    }
  }

  private async saveFileMetadata(responseId: string, responseData: any) {
    if (!this.surveyModel) return;

    const fileQuestions = this.surveyModel.getAllQuestions().filter(q => q.getType() === 'file');

    for (const question of fileQuestions) {
      const qName = question.name;
      const files = responseData[qName];
      if (!files) continue;

      const fileArray = Array.isArray(files) ? files : [files];

      for (const file of fileArray) {
        const url = file.content || file;
        const path = this.extractFilePathFromUrl(url);
        if (!path) continue;

        const fileName = path.split('/').pop() || 'unknown';
        const fileSize = file.size || 0;
        const fileType = file.type || this.getFileTypeFromPath(path);

        try {
          await firstValueFrom(
            this.formsService.saveFileMetadata({
              form_response_id: responseId,
              question_name: qName,
              file_name: fileName,
              file_path: path,
              file_size: fileSize,
              file_type: fileType
            })
          );
          console.log('✅ Metadata sauvegardée pour:', fileName);
        } catch (err) {
          console.error('❌ Erreur sauvegarde metadata:', err);
        }
      }
    }
  }

  private getFileTypeFromPath(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase() || '';
    const mimeTypes: { [key: string]: string } = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  private extractFilePathFromUrl(url: string): string | null {
    if (!url) return null;
    const regex = /(?:\/object\/public\/|\/storage\/v1\/object\/public\/|form-uploads\/)(.+)$/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  goBack() {
    this.router.navigate(['/client']);
  }
}
