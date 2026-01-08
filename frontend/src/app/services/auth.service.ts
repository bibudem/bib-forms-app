import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'client';
}

export interface AuthResponse {
  user: User;
  token: string;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl || 'http://localhost:3110/api';
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser: Observable<User | null>;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    console.log('[AuthService] Initialisation...');
    
    const storedUser = this.getStoredUser();
    this.currentUserSubject = new BehaviorSubject<User | null>(storedUser);
    this.currentUser = this.currentUserSubject.asObservable();

    if (storedUser && this.getToken()) {
      this.verifyToken();
    }
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({ 'Content-Type': 'application/json' });
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  isAuthenticated(): boolean {
    return !!this.currentUserSubject.value && !!this.getToken();
  }

  private getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  private getStoredUser(): User | null {
    const userJson = localStorage.getItem('auth_user');
    if (!userJson) return null;
    try {
      return JSON.parse(userJson);
    } catch {
      return null;
    }
  }

  private saveSession(response: AuthResponse): void {
    localStorage.setItem('auth_token', response.token);
    localStorage.setItem('auth_user', JSON.stringify(response.user));
    this.currentUserSubject.next(response.user);
  }

  private clearSession(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    this.currentUserSubject.next(null);
  }

  /**
   * Inscription (remplace signUp)
   */
  signUp(email: string, password: string): Observable<AuthResponse> {
    console.log('[signUp] Inscription:', email);
    return this.http.post<AuthResponse>(
      `${this.apiUrl}/auth/register`,
      { email, password },
      { headers: this.getHeaders() }
    ).pipe(
      tap(response => {
        console.log('[signUp] Succès:', response.user.email);
        this.saveSession(response);
      }),
      catchError(error => {
        console.error('[signUp] Erreur:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Connexion classique (remplace signIn)
   */
  signIn(email: string, password: string): Observable<AuthResponse> {
    console.log('[signIn] Connexion:', email);
    return this.http.post<AuthResponse>(
      `${this.apiUrl}/auth/login`,
      { email, password },
      { headers: this.getHeaders() }
    ).pipe(
      tap(response => {
        console.log('[signIn] Succès:', response.user.email);
        this.saveSession(response);
      }),
      catchError(error => {
        console.error('[signIn] Erreur:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * SSO UdeM - Non disponible avec PostgreSQL local
   */
  async signInWithUdeM() {
    console.error('[signInWithUdeM] SSO non disponible avec PostgreSQL local');
    throw new Error('SSO non implémenté. Utilisez la connexion par email/mot de passe.');
  }

  /**
   * Déconnexion (remplace signOut)
   */
  signOut(): Observable<any> {
    console.log('[signOut] Déconnexion...');

    if (!this.getToken()) {
      this.clearSession();
      this.router.navigate(['/login']);
      return new Observable(observer => {
        observer.next(null);
        observer.complete();
      });
    }

    return this.http.post(
      `${this.apiUrl}/auth/logout`,
      {},
      { headers: this.getAuthHeaders() }
    ).pipe(
      tap(() => {
        console.log('[signOut] Succès');
        this.clearSession();
        this.router.navigate(['/login']);
      }),
      catchError(error => {
        console.error('[signOut] Erreur:', error);
        this.clearSession();
        this.router.navigate(['/login']);
        return throwError(() => error);
      })
    );
  }

  /**
   * Vérifier le token
   */
  verifyToken(): void {
    if (!this.getToken()) {
      this.clearSession();
      return;
    }

    this.http.get<{ user: User }>(
      `${this.apiUrl}/auth/me`,
      { headers: this.getAuthHeaders() }
    ).subscribe({
      next: (response) => {
        console.log('[verifyToken] Token valide:', response.user.email);
        localStorage.setItem('auth_user', JSON.stringify(response.user));
        this.currentUserSubject.next(response.user);
      },
      error: (error) => {
        console.error('[verifyToken] Token invalide:', error);
        this.clearSession();
      }
    });
  }

  /**
   * Obtenir le profil (remplace getProfile)
   */
  getProfile(): Observable<{ data: User | null; error: any }> {
    return this.http.get<{ user: User }>(
      `${this.apiUrl}/auth/me`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      map(response => {
        const user = response.user;
        localStorage.setItem('auth_user', JSON.stringify(user));
        this.currentUserSubject.next(user);
        return { data: user, error: null };
      }),
      catchError(error => {
        console.error('[getProfile] Erreur:', error);
        this.clearSession();
        return throwError(() => ({ data: null, error }));
      })
    );
  }

  /**
   * Vérifier si admin (remplace isAdmin)
   */
  async isAdmin(): Promise<boolean> {
    return this.currentUserSubject.value?.role === 'admin' || false;
  }

  /**
   * Observer les changements d'auth (remplace onAuthStateChange)
   */
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return this.currentUser.subscribe(user => {
      const event = user ? 'SIGNED_IN' : 'SIGNED_OUT';
      const session = user ? { user } : null;
      callback(event, session);
    });
  }

  /**
   * Obtenir l'utilisateur courant (remplace getCurrentUser)
   */
  getCurrentUser(): Observable<{ data: { user: User | null }; error: any }> {
    const user = this.currentUserValue;
    return new Observable(observer => {
      observer.next({ data: { user }, error: null });
      observer.complete();
    });
  }

  /**
   * Obtenir la session (remplace getSession)
   */
  async getSession() {
    const user = this.currentUserValue;
    return {
      data: {
        session: user ? { user } : null
      },
      error: null
    };
  }

  /**
   * Changer le mot de passe
   */
  changePassword(oldPassword: string, newPassword: string): Observable<any> {
    console.log('[changePassword] Changement de mot de passe...');
    return this.http.post(
      `${this.apiUrl}/auth/change-password`,
      { oldPassword, newPassword },
      { headers: this.getAuthHeaders() }
    ).pipe(
      tap(() => console.log('[changePassword] Succès')),
      catchError(error => {
        console.error('[changePassword] Erreur:', error);
        return throwError(() => error);
      })
    );
  }
}