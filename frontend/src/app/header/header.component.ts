import { Component, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit, OnDestroy {
  loading = true;
  userEmail = '';
  isAuthenticated = false;

  private userSub?: Subscription;

  constructor(
    private router: Router,
    private supabaseService: SupabaseService,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // On s'abonne directement au BehaviorSubject du service
    this.userSub = this.supabaseService.currentUser.subscribe(async (user) => {
      if (user) {
        this.isAuthenticated = true;
        this.userEmail = user.email ?? 'Invité';
      } else {
        this.isAuthenticated = false;
        this.userEmail = 'Invité';
      }

      this.loading = false;
      this.cd.detectChanges();
    });
  }

  ngOnDestroy() {
    this.userSub?.unsubscribe();
  }

  async logout() {
    try {
      await this.supabaseService.signOut();
      this.isAuthenticated = false;
      this.userEmail = 'Invité';
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  }

  getDisplayName(): string {
    return this.userEmail !== 'Invité'
      ? this.userEmail.split('@')[0]
      : this.userEmail;
  }
}
