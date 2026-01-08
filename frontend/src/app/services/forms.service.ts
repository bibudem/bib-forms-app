import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Form {
  id: string;
  title: string;
  description?: string;
  json_schema: any;
  status: 'draft' | 'published' | 'archived';
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface FormResponse {
  id: string;
  form_id: string;
  user_id?: string;
  response_data: any;
  submitted_at: string;
  form?: { title: string };
  profile?: { email: string };
}

@Injectable({
  providedIn: 'root'
})
export class FormsService {
  private apiUrl = environment.apiUrl || 'http://localhost:3110/api';

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  /**
   * Obtenir tous les formulaires
   */
  getForms(publishedOnly = false): Observable<Form[]> {
    const params = publishedOnly ? '?status=published' : '';
    return this.http.get<any>(
      `${this.apiUrl}/forms${params}`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      map(response => {
        // Gérer différents formats de réponse
        if (Array.isArray(response)) return response;
        if (response.forms) return response.forms;
        if (response.data) return response.data;
        return [];
      }),
      catchError(error => {
        console.error('Erreur getForms:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Obtenir un formulaire par ID
   */
  getForm(id: string): Observable<Form> {
    return this.http.get<any>(
      `${this.apiUrl}/forms/${id}`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      map(response => response.form || response),
      catchError(error => {
        console.error('Erreur getForm:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Créer un nouveau formulaire
   */
  createForm(form: Partial<Form>): Observable<Form> {
    return this.http.post<any>(
      `${this.apiUrl}/forms`,
      form,
      { headers: this.getAuthHeaders() }
    ).pipe(
      map(response => response.form || response),
      catchError(error => {
        console.error('Erreur createForm:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Mettre à jour un formulaire
   */
  updateForm(id: string, form: Partial<Form>): Observable<Form> {
    return this.http.put<any>(
      `${this.apiUrl}/forms/${id}`,
      form,
      { headers: this.getAuthHeaders() }
    ).pipe(
      map(response => response.form || response),
      catchError(error => {
        console.error('Erreur updateForm:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Publier un formulaire
   */
  publishForm(id: string): Observable<Form> {
    return this.updateForm(id, { status: 'published' });
  }

  /**
   * Archiver un formulaire
   */
  archiveForm(id: string): Observable<Form> {
    return this.updateForm(id, { status: 'archived' });
  }

  /**
   * Supprimer un formulaire
   */
  deleteForm(id: string): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/forms/${id}`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(error => {
        console.error('Erreur deleteForm:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Vérifier si un formulaire a des réponses
   */
  hasResponses(formId: string): Observable<boolean> {
    return this.http.get<any>(
      `${this.apiUrl}/forms/${formId}/has-responses`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      map(response => response.hasResponses || false),
      catchError(error => {
        console.error('Erreur hasResponses:', error);
        return throwError(() => false);
      })
    );
  }

  /**
   * Soumettre une réponse à un formulaire
   */
  submitResponse(formId: string, responseData: any): Observable<FormResponse> {
    return this.http.post<any>(
      `${this.apiUrl}/responses`,
      { form_id: formId, response_data: responseData },
      { headers: this.getAuthHeaders() }
    ).pipe(
      map(response => response.response || response),
      catchError(error => {
        console.error('Erreur submitResponse:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Obtenir toutes les réponses (optionnellement filtrées par formulaire)
   */
  getResponses(formId?: string): Observable<FormResponse[]> {
    const params = formId ? `?form_id=${formId}` : '';
    return this.http.get<any>(
      `${this.apiUrl}/responses${params}`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      map(response => {
        if (Array.isArray(response)) return response;
        if (response.responses) return response.responses;
        if (response.data) return response.data;
        return [];
      }),
      catchError(error => {
        console.error('Erreur getResponses:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Obtenir une réponse spécifique
   */
  getResponse(responseId: string): Observable<FormResponse> {
    return this.http.get<any>(
      `${this.apiUrl}/responses/${responseId}`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      map(response => response.response || response),
      catchError(error => {
        console.error('Erreur getResponse:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Supprimer une réponse
   */
  deleteResponse(responseId: string): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/responses/${responseId}`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(error => {
        console.error('Erreur deleteResponse:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Exporter les réponses en CSV
   */
  exportResponses(formId: string): Observable<Blob> {
    return this.http.get(
      `${this.apiUrl}/forms/${formId}/export`,
      {
        headers: this.getAuthHeaders(),
        responseType: 'blob'
      }
    ).pipe(
      catchError(error => {
        console.error('Erreur exportResponses:', error);
        return throwError(() => error);
      })
    );
  }

  /**
 * Sauvegarder les métadonnées d'un fichier associé à une réponse de formulaire
 */
saveFileMetadata(fileMeta: {
  form_response_id: string;
  question_name: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
}): Observable<any> {
  return this.http.post(
    `${this.apiUrl}/responses/files`, // <-- endpoint à adapter selon ton backend
    fileMeta,
    { headers: this.getAuthHeaders() }
  ).pipe(
    catchError(error => {
      console.error('Erreur saveFileMetadata:', error);
      return throwError(() => error);
    })
  );
}

}