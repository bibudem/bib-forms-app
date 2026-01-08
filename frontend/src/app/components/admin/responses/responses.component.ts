import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsService, FormResponse } from '../../../services/forms.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-responses',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './responses.component.html',
  styleUrls: ['./responses.component.scss']
})
export class ResponsesComponent implements OnInit {
  responses: FormResponse[] = [];
  loading = true;
  formId: string | null = null;
  formTitle = 'Toutes les réponses';
  selectedResponse: FormResponse | null = null;
  showDetailModal = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private formsService: FormsService,
    private cd: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    this.formId = this.route.snapshot.paramMap.get('formId');
    await this.loadResponses();
  }

  async loadResponses() {
    this.loading = true;

    try {
      const data = await firstValueFrom(
        this.formsService.getResponses(this.formId || undefined)
      );

      this.responses = data;

      // ✅ Correction: vérifier form au lieu de forms
      if (this.formId && data.length > 0 && data[0].form?.title) {
        this.formTitle = `Réponses : ${data[0].form.title}`;
      }

    } catch (err) {
      console.error('❌ Erreur chargement réponses:', err);
    } finally {
      this.loading = false;
      this.cd.detectChanges();
    }
  }

  viewDetails(response: FormResponse) {
    this.selectedResponse = response;
    this.showDetailModal = true;
  }

  closeModal() {
    this.selectedResponse = null;
    this.showDetailModal = false;
  }

  exportToCSV() {
    if (!this.responses.length) {
      alert('Aucune réponse à exporter');
      return;
    }

    const headers = ['ID', 'Email', 'Date', 'Réponses'];

    const rows = this.responses.map(r => [
      r.id,
      r.profile?.email || 'N/A',
      this.formatDate(r.submitted_at),
      JSON.stringify(r.response_data)
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(r => r.map(v => `"${v}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `reponses-${this.formId || 'all'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  goBack() {
    this.router.navigate(this.formId ? ['/admin/forms'] : ['/admin']);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleString('fr-CA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getResponseKeys(data: any): string[] {
    return Object.keys(data || {});
  }

  getResponseValue(data: any, key: string): any {
    const value = data[key];

    if (Array.isArray(value)) {
      if (value[0]?.content) return value;
      return value.join(', ');
    }

    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value, null, 2);
    }

    return value ?? 'N/A';
  }

  isFileArray(value: any): boolean {
    return Array.isArray(value) && value[0]?.content;
  }

  getFileNameFromUrl(url: string): string {
    return url?.split('/').pop() || 'Fichier';
  }

  getFileIcon(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    return {
      pdf: '📄',
      jpg: '🖼️',
      jpeg: '🖼️',
      png: '🖼️',
      doc: '📝',
      docx: '📝',
      xls: '📊',
      xlsx: '📊'
    }[ext || ''] || '📎';
  }

  openFile(url: string) {
    window.open(url, '_blank');
  }

flattenResponse(response: FormResponse): Record<string, any> {
  const flat: any = {
    ID: response.id,
    Email: response.profile?.email || 'Anonyme',
    Date: this.formatDate(response.submitted_at)
  };

  for (const key of Object.keys(response.response_data || {})) {
    const value = response.response_data[key];

    if (Array.isArray(value)) {
      // fichiers ou multi-choix
      flat[key] = value[0]?.content
        ? value.map(f => f.name).join(', ')
        : value.join(', ');
    } else if (typeof value === 'object' && value !== null) {
      flat[key] = JSON.stringify(value);
    } else {
      flat[key] = value ?? '';
    }
  }

  return flat;
}

exportSingleResponseToCSV(response: FormResponse) {
  const row = this.flattenResponse(response);
  const headers = Object.keys(row);

  const csv = [
    headers.join(','),
    headers.map(h => `"${row[h] ?? ''}"`).join(',')
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `reponse-${response.id}.csv`;
  link.click();

  URL.revokeObjectURL(url);
}

}