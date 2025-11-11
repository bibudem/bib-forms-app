import { Component, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './header/header.component';
import { FooterComponent } from './footer/footer.component';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    HeaderComponent,
    FooterComponent
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
  standalone: true,
})
export class App implements OnInit {
  protected readonly title = signal('frontend');

  constructor(private translate: TranslateService) {}

  ngOnInit() {
    // Initialiser la traduction
    this.translate.setDefaultLang('fr');
    this.translate.use('fr');
  }
}