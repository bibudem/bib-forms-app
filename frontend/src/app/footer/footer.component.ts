import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css'],
  standalone: true,
  imports: [
    CommonModule,   
    TranslateModule,
  ]
})
export class FooterComponent implements OnInit {

  dateObj = new Date();

  constructor() { }

  ngOnInit(): void { }
}
