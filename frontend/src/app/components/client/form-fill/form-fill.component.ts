import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { SupabaseService } from '../../../services/supabase.service';
import { FileUploadService } from '../../../services/file-upload.service';
import { Model } from 'survey-core';
import { SurveyModule } from 'survey-angular-ui';
import { PlainLight } from 'survey-core/themes';

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
  private isSubmitting = false; // ✅ Éviter double soumission

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private supabaseService: SupabaseService,
    private fileUploadService: FileUploadService,
    private cd: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    this.formId = this.route.snapshot.paramMap.get('id');
    
    // Récupérer l'ID de l'utilisateur connecté
    this.supabaseService.currentUser.subscribe(user => {
      this.userId = user?.id || null;
      console.log('👤 User ID:', this.userId);
    });

    if (!this.formId) {
      this.errorMessage = 'Aucun identifiant de formulaire fourni.';
      this.loading = false;
      this.cd.detectChanges();
      return;
    }

    try {
      const { data, error } = await this.supabaseService.getForm(this.formId);

      if (error) throw error;
      if (!data || !data.json_schema) throw new Error('Aucune structure JSON trouvée');

      console.log('✅ JSON reçu du serveur:', data.json_schema);

      // Création du survey
      this.surveyModel = new Model(data.json_schema);
      this.surveyModel.locale = 'fr';
      this.surveyModel.applyTheme(PlainLight);

      // ✅ Configuration des boutons
      this.surveyModel.showCompleteButton = true;
      this.surveyModel.showNavigationButtons = true;
      this.surveyModel.completeText = "Envoyer"; // Texte du bouton

      // ✅ Configuration uploads AVANT le handler onComplete
      this.configureFileUploads();

      // ✅ UN SEUL handler onComplete
      this.surveyModel.onComplete.add(async (sender) => {
        if (this.isSubmitting) {
          console.warn('⚠️ Soumission déjà en cours, ignorée');
          return;
        }
        
        this.isSubmitting = true;
        console.log('🎯 onComplete déclenché !');
        
        try {
          await this.submitSurvey(sender.data);
        } catch (error) {
          console.error('❌ Erreur soumission:', error);
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

  /**
   * ✅ Configuration pour gérer les uploads de fichiers dans SurveyJS
   */
  private configureFileUploads() {
    if (!this.surveyModel) return;

    this.surveyModel.onUploadFiles.add(async (_, options) => {
      console.log('📤 Upload de fichiers déclenché');
      console.log('📋 Question:', options.name);
      console.log('📁 Fichiers:', options.files);

      if (!this.userId || !this.formId) {
        console.error('❌ Missing userId/formId');
        alert('Vous devez être connecté pour uploader des fichiers');
        options.callback('error', []);
        return;
      }

      const resultFiles: any[] = [];

      for (const file of options.files) {
        try {
          console.log(`⬆️ Upload de ${file.name}...`);
          
          const upload = await this.fileUploadService.uploadFile(
            file,
            this.userId,
            this.formId,
            options.name
          );

          if (upload.success && upload.fileUrl) {
            console.log(`✅ Fichier uploadé: ${upload.fileUrl}`);
            
            // ✅ Format attendu par SurveyJS
            const fileResult = {
              file: file, // ✅ Objet File original
              name: file.name,
              type: file.type,
              content: upload.fileUrl,
              size: file.size || 0
            };
            
            console.log('📦 Objet fichier créé:', fileResult);
            resultFiles.push(fileResult);
          } else {
            console.error('❌ Upload échoué:', upload.error);
          }
        } catch (e) {
          console.error('❌ Exception upload:', e);
        }
      }

      if (resultFiles.length > 0) {
        console.log('✅ Tous les fichiers uploadés:', resultFiles);
        options.callback('success', resultFiles);
      } else {
        console.error('❌ Aucun fichier uploadé');
        options.callback('error', []);
      }
    });
  }

  /**
   * ✅ Soumission du formulaire
   */
  async submitSurvey(result: any) {
    if (!this.formId) {
      console.error('❌ Pas de formId');
      return;
    }

    console.log('📤 Soumission des réponses');
    console.log('📋 Données brutes:', result);
    console.log('📋 Type de result:', typeof result);
    console.log('📋 Clés:', Object.keys(result));

    // ✅ Vérifier les fichiers dans les données
    Object.keys(result).forEach(key => {
      const value = result[key];
      console.log(`🔑 ${key}:`, value);
      console.log(`   Type:`, typeof value, Array.isArray(value) ? '(array)' : '');
      
      if (Array.isArray(value) && value.length > 0) {
        console.log(`   Premier élément:`, value[0]);
        if (value[0]?.content) {
          console.log(`   ✅ Fichier détecté dans ${key}:`, value);
        }
      }
    });

    try {
      // ✅ Sauvegarder la réponse dans Supabase
      const { data, error } = await this.supabaseService.submitResponse(
        this.formId, 
        result
      );

      if (error) {
        console.error('❌ Erreur Supabase:', error);
        throw error;
      }

      if (!data) {
        throw new Error('Pas de données retournées');
      }

      console.log('✅ Réponse sauvegardée, ID:', data.id);

      // ✅ Sauvegarder les métadonnées des fichiers
      await this.saveFileMetadata(data.id, result);

      if (error) {
        throw error;
      }

      // Appeler le backend pour notifier n8n
      try {
        const profile = await this.supabaseService.getProfile();
        const userEmail = profile?.data?.email || 'inconnu@exemple.com';

        await fetch('http://localhost:3000/api/responses/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            responseId: data.id,
            formId: this.formId,
            userEmail: userEmail
          })
        });
      } catch (notifyError) {
        console.error('Erreur notification:', notifyError);
        // Ne pas bloquer si la notification échoue
      }

      alert('Merci ! Vos réponses ont été enregistrées.');
      this.router.navigate(['/client']);

    } catch (err: any) {
      console.error('❌ Erreur soumission:', err);
      alert(`Erreur: ${err.message || 'Échec de la soumission'}`);
      this.isSubmitting = false;
    }
  }

  /**
   * ✅ Sauvegarder les métadonnées des fichiers uploadés
   */
  private async saveFileMetadata(responseId: string, responseData: any) {
    if (!this.surveyModel) return;

    const fileQuestions = this.surveyModel.getAllQuestions()
      .filter(q => q.getType() === "file");

    console.log(`📋 ${fileQuestions.length} question(s) de type file`);
    console.log('📦 Données complètes:', responseData);

    for (const question of fileQuestions) {
      const qName = question.name;
      const files = responseData[qName];

      console.log(`🔍 Question "${qName}":`, files);
      console.log('🔍 Type:', typeof files, 'isArray:', Array.isArray(files));

      // ✅ Vérifier si files existe et est un tableau
      if (!files) {
        console.log(`⏭️ Aucune donnée pour ${qName}`);
        continue;
      }

      // ✅ Si c'est un objet unique, le transformer en tableau
      const fileArray = Array.isArray(files) ? files : [files];

      if (fileArray.length === 0) {
        console.log(`⏭️ Tableau vide pour ${qName}`);
        continue;
      }

      for (const file of fileArray) {
        console.log('📄 Traitement du fichier:', file);

        // ✅ Gérer les deux formats possibles
        const url = file.content || file;
        
        if (!url || typeof url !== 'string') {
          console.warn('⚠️ URL invalide:', url);
          continue;
        }

        console.log('🔗 URL du fichier:', url);

        const path = this.extractFilePathFromUrl(url);
        
        if (!path) {
          console.error('❌ Impossible d\'extraire le path de:', url);
          continue;
        }

        console.log('📂 Path extrait:', path);

        try {
          const fileName = path.split('/').pop() || 'unknown';
          const fileSize = file.size || 0;
          const fileType = file.type || this.getFileTypeFromPath(path);

          console.log('💾 Sauvegarde metadata:', {
            form_response_id: responseId,
            question_name: qName,
            file_name: fileName,
            file_path: path,
            file_size: fileSize,
            file_type: fileType
          });

          const { error } = await this.supabaseService.saveFileMetadata({
            form_response_id: responseId,
            question_name: qName,
            file_name: fileName,
            file_path: path,
            file_size: fileSize,
            file_type: fileType
          });

          if (error) {
            console.error('❌ Erreur sauvegarde metadata:', error);
          } else {
            console.log('✅ Metadata sauvegardée pour:', fileName);
          }
        } catch (e) {
          console.error('❌ Exception sauvegarde metadata:', e);
        }
      }
    }
  }

  /**
   * Obtenir le type MIME depuis l'extension
   */
  private getFileTypeFromPath(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase() || '';
    const mimeTypes: { [key: string]: string } = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * ✅ Extraire le path du fichier depuis l'URL Supabase
   */
  private extractFilePathFromUrl(url: string): string | null {
    if (!url || typeof url !== 'string') {
      console.error('❌ URL invalide:', url);
      return null;
    }

    // Pattern 1: /object/public/form-uploads/{path}
    const regex1 = /\/object\/public\/form-uploads\/(.+)$/;
    const match1 = url.match(regex1);
    if (match1) {
      console.log('✅ Path extrait (pattern 1):', match1[1]);
      return match1[1];
    }

    // Pattern 2: /storage/v1/object/public/form-uploads/{path}
    const regex2 = /\/storage\/v1\/object\/public\/form-uploads\/(.+)$/;
    const match2 = url.match(regex2);
    if (match2) {
      console.log('✅ Path extrait (pattern 2):', match2[1]);
      return match2[1];
    }

    // Pattern 3: form-uploads/{path} (direct)
    const regex3 = /form-uploads\/(.+)$/;
    const match3 = url.match(regex3);
    if (match3) {
      console.log('✅ Path extrait (pattern 3):', match3[1]);
      return match3[1];
    }

    console.error('❌ Aucun pattern ne correspond:', url);
    return null;
  }

  goBack() {
    this.router.navigate(['/client']);
  }

  /**
   * ✅ Bouton de test pour forcer la soumission
   */
  manualSubmit() {
    console.log('🧪 Soumission manuelle');
    
    if (!this.surveyModel) {
      console.error('❌ Pas de surveyModel');
      return;
    }

    if (this.isSubmitting) {
      console.warn('⚠️ Déjà en soumission');
      return;
    }

    const data = this.surveyModel.data;
    console.log('📋 Données:', data);
    
    if (!data || Object.keys(data).length === 0) {
      alert('Veuillez remplir le formulaire');
      return;
    }

    // ✅ Forcer la validation
    if (!this.surveyModel.isLastPage || !this.surveyModel.validate()) {
      alert('Veuillez compléter toutes les questions requises');
      return;
    }

    this.isSubmitting = true;
    this.submitSurvey(data).catch(() => {
      this.isSubmitting = false;
    });
  }
}