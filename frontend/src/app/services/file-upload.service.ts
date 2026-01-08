import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { environment } from '../../environments/environment';

export interface FileUploadResult {
  success: boolean;
  filePath?: string;
  fileUrl?: string;
  file?: UploadedFile;
  error?: string;
}

export interface UploadedFile {
  id: string;
  form_response_id: string;
  question_name: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  uploaded_by: string;
  uploaded_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class FileUploadService {
  private apiUrl = environment.apiUrl || 'http://localhost:3000/api';
  private maxFileSize = 50 * 1024 * 1024; // 50MB

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  /**
   * ✅ Upload un fichier vers le serveur local
   * CHANGEMENT: userId et formId sont remplacés par formResponseId
   */
  async uploadFile(
    file: File | { name: string; type: string; content: string },
    formResponseId: string,
    questionName: string
  ): Promise<FileUploadResult> {
    try {
      const formData = new FormData();
      let fileToUpload: File;

      // ✅ Gérer les deux types de fichiers (natif et SurveyJS base64)
      if ('content' in file && file.content) {
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
        
        const blob = new Blob([byteArray], { type: file.type });
        const sanitizedName = this.sanitizeFileName(file.name);
        
        fileToUpload = new File([blob], sanitizedName, { type: file.type });
        console.log(`📦 Taille du fichier: ${fileToUpload.size} bytes`);
        
      } else if (file instanceof File) {
        console.log('📄 Fichier natif:', file.name);
        
        if (file.size > this.maxFileSize) {
          return { 
            success: false, 
            error: 'Fichier trop volumineux. Maximum : 50 MB' 
          };
        }
        
        fileToUpload = file;
        
      } else {
        throw new Error('Type de fichier non supporté');
      }

      // Préparer le FormData
      formData.append('file', fileToUpload);
      formData.append('formResponseId', formResponseId);
      formData.append('questionName', questionName);

      console.log('📂 Upload vers le serveur...');

      // Upload via l'API
      const result = await this.http.post<any>(
        `${this.apiUrl}/files/upload`,
        formData,
        { headers: this.getAuthHeaders() }
      ).toPromise();

      console.log('✅ Upload réussi:', result);

      // Construire l'URL du fichier
      const fileUrl = `${this.apiUrl}/files/download/${result.file.id}`;

      return {
        success: true,
        filePath: result.file.file_path,
        fileUrl: fileUrl,
        file: result.file
      };

    } catch (error: any) {
      console.error('❌ Exception upload:', error);
      return { 
        success: false, 
        error: `Erreur: ${error.message || error.error?.error}` 
      };
    }
  }

  /**
   * Upload plusieurs fichiers
   * CHANGEMENT: Signature adaptée pour formResponseId
   */
  async uploadMultipleFiles(
    files: File[],
    formResponseId: string,
    questionName: string
  ): Promise<FileUploadResult[]> {
    const results: FileUploadResult[] = [];

    for (const file of files) {
      const result = await this.uploadFile(file, formResponseId, questionName);
      results.push(result);
    }

    return results;
  }

  /**
   * Supprimer un fichier
   * CHANGEMENT: Utilise l'ID du fichier au lieu du path
   */
  async deleteFile(fileId: string): Promise<boolean> {
    try {
      console.log('🗑️ Suppression:', fileId);

      await this.http.delete(
        `${this.apiUrl}/files/${fileId}`,
        { headers: this.getAuthHeaders() }
      ).toPromise();

      console.log('✅ Fichier supprimé');
      return true;

    } catch (error) {
      console.error('❌ Exception suppression:', error);
      return false;
    }
  }

  /**
   * Obtenir l'URL publique d'un fichier
   * CHANGEMENT: Utilise l'ID du fichier
   */
  getPublicUrl(fileId: string): string {
    return `${this.apiUrl}/files/download/${fileId}`;
  }

  /**
   * Lister les fichiers d'une réponse
   */
  getResponseFiles(responseId: string): Observable<UploadedFile[]> {
    return this.http.get<{ files: UploadedFile[] }>(
      `${this.apiUrl}/files/response/${responseId}`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      map((response: any) => response.files || [])
    );
  }

  /**
   * Supprimer tous les fichiers d'une réponse
   */
  async deleteResponseFiles(responseId: string): Promise<boolean> {
    try {
      console.log(`🗑️ Suppression des fichiers de la réponse ${responseId}`);

      const files = await this.getResponseFiles(responseId).toPromise();

      if (!files || files.length === 0) {
        console.log('ℹ️ Aucun fichier à supprimer');
        return true;
      }

      const deletePromises = files.map(file => this.deleteFile(file.id));
      await Promise.all(deletePromises);

      console.log(`✅ ${files.length} fichier(s) supprimé(s)`);
      return true;

    } catch (error) {
      console.error('❌ Exception suppression fichiers:', error);
      return false;
    }
  }

  /**
   * ✅ Nettoyer le nom de fichier
   */
  private sanitizeFileName(fileName: string): string {
    return fileName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_+|_+$/g, '')
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
}

// Helper pour map
function map<T, R>(fn: (value: T) => R) {
  return (source: Observable<T>): Observable<R> => {
    return new Observable(observer => {
      return source.subscribe({
        next: value => observer.next(fn(value)),
        error: err => observer.error(err),
        complete: () => observer.complete()
      });
    });
  };
}