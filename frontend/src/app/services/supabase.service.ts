import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser: Observable<User | null>;

  constructor() {
    console.log('[SupabaseService] Initialisation...');
    this.supabase = createClient(environment.supabase.url, environment.supabase.anonKey);
    this.currentUserSubject = new BehaviorSubject<User | null>(null);
    this.currentUser = this.currentUserSubject.asObservable();
    this.checkUser();
  }

  private async checkUser() {
    try {
      const { data, error } = await this.supabase.auth.getSession();
      if (error) {
        console.error('[checkUser] Erreur getSession:', error);
      } else {
        console.log('[checkUser] Session actuelle:', data.session);
      }
      this.currentUserSubject.next(data.session?.user ?? null);

      this.supabase.auth.onAuthStateChange((event, session) => {
        console.log('[onAuthStateChange] Event:', event, 'Session:', session);
        this.currentUserSubject.next(session?.user ?? null);
      });
    } catch (err) {
      console.error('[checkUser] Exception:', err);
    }
  }

  async signUp(email: string, password: string) {
    //console.log('[signUp] Tentative d’inscription:', email);
    const { data: userData, error: signUpError } = await this.supabase.auth.signUp({ email, password });
    console.log('[signUp] Résultat auth.signUp:', userData, signUpError);

    if (signUpError) return { data: null, error: signUpError };

    if (userData.user) {
      const { data: profileData, error: profileError } = await this.supabase
        .from('profiles')
        .insert({
          id: userData.user.id,
          email: email,
          role: 'user'
        })
        .select()
        .single();

      //console.log('[signUp] Création du profil:', profileData, profileError);
      return { data: profileData, error: profileError };
    }

    return { data: null, error: null };
  }

  async signIn(email: string, password: string) {
    console.log('[signIn] Tentative de connexion:', email);
    try {
      const result = await this.supabase.auth.signInWithPassword({ email, password });
      //console.log('[signIn] Résultat:', result);
      return result;
    } catch (err) {
      console.error('[signIn] Exception:', err);
      throw err;
    }
  }

  async signOut() {
    console.log('[signOut] Déconnexion...');
    try {
      const result = await this.supabase.auth.signOut();
      //console.log('[signOut] Résultat:', result);
      this.currentUserSubject.next(null);
      return result;
    } catch (err) {
      console.error('[signOut] Exception:', err);
      throw err;
    }
  }

  async getProfile() {
    const user = this.currentUserSubject.value;
    if (!user) {
      console.warn('[getProfile] Aucun utilisateur connecté');
      return null;
    }

    console.log('[getProfile] Récupération du profil pour user id:', user.id);
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('id, email, role')
        .eq('id', user.id)
        .single();
      if (error) {
        console.error('[getProfile] Erreur:', error);
      } else {
        console.log('[getProfile] Profil trouvé:', data);
      }
      return { data, error };
    } catch (err) {
      console.error('[getProfile] Exception:', err);
      throw err;
    }
  }

  async isAdmin(): Promise<boolean> {
    const profile = await this.getProfile();
    const isAdmin = profile?.data?.role === 'admin';
    //console.log('[isAdmin] Rôle admin:', isAdmin);
    return isAdmin;
  }

  // ✅ Formulaires
  async getForms(publishedOnly = false) {
    let query = this.supabase
      .from('forms')
      .select('id, title, description, status, created_at, updated_at');

    if (publishedOnly) {
      query = query.eq('status', 'published');
    }

    return await query.order('created_at', { ascending: false });
  }

  async getForm(id: string) {
    return await this.supabase
      .from('forms')
      .select('*')
      .eq('id', id)
      .single();
  }

  async createForm(form: any) {
    const user = this.currentUserSubject.value;
    return await this.supabase
      .from('forms')
      .insert({
        ...form,
        created_by: user?.id
      })
      .select()
      .single();
  }

  async updateForm(id: string, form: any) {
    return await this.supabase
      .from('forms')
      .update(form)
      .eq('id', id)
      .select()
      .single();
  }

  async publishForm(id: string) {
    return await this.updateForm(id, { status: 'published' });
  }

  // ✅ Réponses
  async submitResponse(formId: string, responseData: any) {
    const user = this.currentUserSubject.value;
    return await this.supabase
      .from('form_responses')
      .insert({
        form_id: formId,
        user_id: user?.id,
        response_data: responseData
      })
      .select()
      .single();
  }

  async getResponses(formId?: string) {
    let query = this.supabase
      .from('form_responses')
      .select(`
        id,
        form_id,
        user_id,
        response_data,
        submitted_at,
        forms (title),
        profiles (email)
      `);

    if (formId) {
      query = query.eq('form_id', formId);
    }

    return await query.order('submitted_at', { ascending: false });
  }

  async createProfile(userId: string, email: string, role: string = 'client') {
    return await this.supabase
      .from('profiles')
      .insert({ id: userId, email, role })
      .select()
      .single();
  }
  /**
   * Sauvegarder les métadonnées d'un fichier uploadé
   */
  async saveFileMetadata(fileMetadata: {
    form_response_id: string;
    question_name: string;
    file_name: string;
    file_path: string;
    file_size: number;
    file_type: string;
  }) {
    const user = this.currentUserSubject.value;
    
    return await this.supabase
      .from('form_file_uploads')
      .insert({
        ...fileMetadata,
        uploaded_by: user?.id
      })
      .select()
      .single();
  }

  /**
   * Récupérer les fichiers d'une réponse
   */
  async getResponseFiles(responseId: string) {
    return await this.supabase
      .from('form_file_uploads')
      .select('*')
      .eq('form_response_id', responseId)
      .order('uploaded_at', { ascending: false });
  }

  /**
   * Supprimer les métadonnées d'un fichier
   */
  async deleteFileMetadata(fileId: string) {
    return await this.supabase
      .from('form_file_uploads')
      .delete()
      .eq('id', fileId);
  }
  // Ajoutez ces méthodes dans supabase.service.ts après la méthode publishForm()

/**
 * Supprimer un formulaire
 */
async deleteForm(id: string) {
  return await this.supabase
    .from('forms')
    .delete()
    .eq('id', id);
}

/**
 * Vérifier si un formulaire a des réponses
 */
async hasResponses(formId: string): Promise<boolean> {
  try {
    const { data, error } = await this.supabase
      .from('form_responses')
      .select('id')
      .eq('form_id', formId)
      .limit(1);
    
    if (error) {
      console.error('[hasResponses] Erreur:', error);
      return false;
    }
    
    return (data && data.length > 0);
  } catch (err) {
    console.error('[hasResponses] Exception:', err);
    return false;
  }
}

/**
 * Récupérer la session actuelle
 */
async getSession() {
  try {
    const result = await this.supabase.auth.getSession();
    //console.log('[getSession] Résultat:', result);
    return result;
  } catch (error) {
    console.error('[getSession] Erreur:', error);
    throw error;
  }
}
}