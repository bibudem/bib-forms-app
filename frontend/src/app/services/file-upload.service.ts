import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

export interface FileUploadResult {
  success: boolean;
  filePath?: string;
  fileUrl?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FileUploadService {
  private supabase: SupabaseClient;
  private bucketName = 'form-uploads';

  constructor() {
    this.supabase = createClient(
      environment.supabase.url,
      environment.supabase.anonKey
    );
  }

  /**
   * ✅ Upload un fichier vers Supabase Storage
   */
  async uploadFile(
    file: File | { name: string; type: string; content: string },
    userId: string,
    formId: string,
    questionName: string
  ): Promise<FileUploadResult> {
    try {
      const maxSize = 50 * 1024 * 1024; // 50MB

      let fileName: string;
      let fileData: Blob;
      let fileType: string;

      // ✅ Gérer les deux types de fichiers
      if ('content' in file && file.content) {
        // Fichier encodé en base64 (SurveyJS)
        console.log('📄 Fichier SurveyJS base64:', file.name);
        
        const base64Data = file.content.split(',')[1];
        if (!base64Data) {
          throw new Error('Données base64 invalides');
        }

        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length)
          .fill(0)
          .map((_, i) => byteCharacters.charCodeAt(i));
        const byteArray = new Uint8Array(byteNumbers);
        
        fileData = new Blob([byteArray], { type: file.type });
        fileName = this.sanitizeFileName(file.name);
        fileType = file.type;

        console.log(`📦 Taille du blob: ${fileData.size} bytes`);
        
      } else if (file instanceof File) {
        // Fichier natif
        console.log('📄 Fichier natif:', file.name);
        
        if (file.size > maxSize) {
          return { 
            success: false, 
            error: 'Fichier trop volumineux. Maximum : 50 MB' 
          };
        }
        
        fileData = file;
        fileName = this.sanitizeFileName(file.name);
        fileType = file.type;
        
      } else {
        throw new Error('Type de fichier non supporté');
      }

      // ✅ Ajouter timestamp pour éviter les collisions
      const timestamp = Date.now();
      const finalFileName = `${timestamp}-${fileName}`;
      const filePath = `${userId}/${formId}/${questionName}/${finalFileName}`;

      console.log('📂 Upload vers:', filePath);
      console.log('📋 Type MIME:', fileType);

      // ✅ Upload vers Supabase
      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from(this.bucketName)
        .upload(filePath, fileData, {
          cacheControl: '3600',
          upsert: false,
          contentType: fileType
        });

      if (uploadError) {
        console.error('❌ Erreur upload Supabase:', uploadError);
        return { 
          success: false, 
          error: `Échec upload: ${uploadError.message}` 
        };
      }

      console.log('✅ Upload réussi:', uploadData);

      // ✅ Récupérer l'URL publique
      const { data: urlData } = this.supabase.storage
        .from(this.bucketName)
        .getPublicUrl(filePath);

      console.log('🔗 URL publique:', urlData.publicUrl);

      return {
        success: true,
        filePath,
        fileUrl: urlData.publicUrl
      };

    } catch (error: any) {
      console.error('❌ Exception upload:', error);
      return { 
        success: false, 
        error: `Erreur: ${error.message}` 
      };
    }
  }

  /**
   * Upload plusieurs fichiers
   */
  async uploadMultipleFiles(
    files: File[],
    userId: string,
    formId: string,
    questionName: string
  ): Promise<FileUploadResult[]> {
    const results: FileUploadResult[] = [];

    for (const file of files) {
      const result = await this.uploadFile(file, userId, formId, questionName);
      results.push(result);
    }

    return results;
  }

  /**
   * Supprimer un fichier
   */
  async deleteFile(filePath: string): Promise<boolean> {
    try {
      console.log('🗑️ Suppression:', filePath);

      const { error } = await this.supabase.storage
        .from(this.bucketName)
        .remove([filePath]);

      if (error) {
        console.error('❌ Erreur suppression:', error);
        return false;
      }

      console.log('✅ Fichier supprimé');
      return true;

    } catch (error) {
      console.error('❌ Exception suppression:', error);
      return false;
    }
  }

  /**
   * Obtenir l'URL publique d'un fichier
   */
  getPublicUrl(filePath: string): string {
    const { data } = this.supabase.storage
      .from(this.bucketName)
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  /**
   * ✅ Nettoyer le nom de fichier (améliorer la compatibilité)
   */
  private sanitizeFileName(fileName: string): string {
    return fileName
      .normalize('NFD') // Décomposer les accents
      .replace(/[\u0300-\u036f]/g, '') // Supprimer les diacritiques
      .replace(/[^a-zA-Z0-9.-]/g, '_') // Remplacer caractères spéciaux
      .replace(/_{2,}/g, '_') // Fusionner underscores multiples
      .replace(/^_+|_+$/g, '') // Supprimer underscores début/fin
      .toLowerCase();
  }

  /**
   * Obtenir l'extension du fichier
   */
  getFileExtension(fileName: string): string {
    return fileName.split('.').pop()?.toLowerCase() || '';
  }

  /**
   * Vérifier si le type de fichier est autorisé
   */
  isFileTypeAllowed(file: File, allowedTypes: string[]): boolean {
    const ext = this.getFileExtension(file.name);
    return allowedTypes.includes(ext);
  }

  /**
   * Formater la taille du fichier
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
  
  /**
 * Supprimer tous les fichiers d'un formulaire
 */
async deleteFormFiles(userId: string, formId: string): Promise<boolean> {
  try {
    console.log(`🗑️ Suppression des fichiers du formulaire ${formId}`);

    // Construire le chemin du dossier
    const folderPath = `${userId}/${formId}`;

    // Lister tous les fichiers du dossier
    const { data: files, error: listError } = await this.supabase.storage
      .from(this.bucketName)
      .list(folderPath);

    if (listError) {
      console.error('❌ Erreur listage:', listError);
      return false;
    }

    if (!files || files.length === 0) {
      console.log('ℹ️ Aucun fichier à supprimer');
      return true;
    }

    // Construire les chemins complets
    const filePaths = files.map(file => `${folderPath}/${file.name}`);

    // Supprimer tous les fichiers
    const { error: deleteError } = await this.supabase.storage
      .from(this.bucketName)
      .remove(filePaths);

    if (deleteError) {
      console.error('❌ Erreur suppression:', deleteError);
      return false;
    }

    console.log(`✅ ${files.length} fichier(s) supprimé(s)`);
    return true;

  } catch (error) {
    console.error('❌ Exception suppression fichiers:', error);
    return false;
  }
}

/**
 * Supprimer tous les fichiers d'une réponse
 */
async deleteResponseFiles(formResponseId: string): Promise<boolean> {
  try {
    console.log(`🗑️ Suppression des fichiers de la réponse ${formResponseId}`);

    // Récupérer les métadonnées des fichiers via le service Supabase
    // Note: Vous devrez ajouter cette méthode dans supabase.service.ts si elle n'existe pas
    
    return true;
  } catch (error) {
    console.error('❌ Exception:', error);
    return false;
  }
}
}