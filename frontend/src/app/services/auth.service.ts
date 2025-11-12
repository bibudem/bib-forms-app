import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabase.url,
      environment.supabase.anonKey
    );
  }

  /**
   * ✅ Connexion via SSO UdeM
   */
  async signInWithUdeM() {
    const { data, error } = await this.supabase.auth.signInWithSSO({
      domain: 'umontreal.ca', // Domaine de l'organisation
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });

    if (error) {
      console.error('Erreur SSO:', error);
      throw error;
    }

    // Redirection automatique vers le SSO UdeM
    if (data?.url) {
      window.location.href = data.url;
    }

    return data;
  }

  /**
   * ✅ Connexion classique Supabase (pour admins/dev)
   */
  async signInWithEmail(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    return data;
  }

  /**
   * ✅ Vérifier si l'utilisateur est admin BIB
   */
  async isAdmin(): Promise<boolean> {
    const { data: { user } } = await this.supabase.auth.getUser();
    
    if (!user) return false;

    const { data: profile } = await this.supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    return profile?.role === 'admin';
  }

  /**
   * ✅ Déconnexion
   */
  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    if (error) throw error;
  }

  /**
   * ✅ Obtenir l'utilisateur actuel
   */
  getCurrentUser() {
    return this.supabase.auth.getUser();
  }

  /**
   * ✅ Observer les changements d'authentification
   */
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return this.supabase.auth.onAuthStateChange(callback);
  }
}