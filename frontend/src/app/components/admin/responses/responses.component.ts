import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { SupabaseService } from '../../../services/supabase.service';

interface Response {
  id: string;
  form_id: string;
  user_id: string;
  response_data: any;
  submitted_at: string;
  profiles?: {
    email: string;
  };
  forms?: {
    title: string;
  };
}

@Component({
  selector: 'app-responses',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './responses.component.html',
  styleUrl: './responses.component.scss'
})
export class ResponsesComponent implements OnInit {
  responses: Response[] = [];
  loading: boolean = true;
  formId: string | null = null;
  formTitle: string = 'Toutes les réponses';
  selectedResponse: Response | null = null;
  showDetailModal: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private supabaseService: SupabaseService,
    private cd: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    this.formId = this.route.snapshot.paramMap.get('formId');
    await this.loadResponses();
  }

  async loadResponses() {
    this.loading = true;
    try {
      const { data, error } = await this.supabaseService.getResponses(
        this.formId || undefined
      );

      if (error) {
        console.error('Erreur:', error);
      } else if (data) {
        this.responses = data as unknown as Response[];
        
        if (this.formId && this.responses.length > 0 && this.responses[0].forms) {
          this.formTitle = `Réponses : ${this.responses[0].forms.title}`;
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
    } finally {
      this.loading = false;
      this.cd.detectChanges();
    }
  }

  viewDetails(response: Response) {
    this.selectedResponse = response;
    this.showDetailModal = true;
  }

  closeModal() {
    this.showDetailModal = false;
    this.selectedResponse = null;
  }

  exportToCSV() {
    if (this.responses.length === 0) {
      alert('Aucune réponse à exporter');
      return;
    }

    const headers = ['ID', 'Email', 'Date de soumission', 'Réponses'];
    
    const rows = this.responses.map(r => [
      r.id,
      r.profiles?.email || 'N/A',
      this.formatDate(r.submitted_at),
      JSON.stringify(r.response_data)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `reponses-${this.formId || 'all'}-${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  goBack() {
    if (this.formId) {
      this.router.navigate(['/admin/forms']);
    } else {
      this.router.navigate(['/admin']);
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('fr-CA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getResponseKeys(responseData: any): string[] {
    return Object.keys(responseData || {});
  }

  /**
   * ✅ Récupérer la valeur d'une réponse avec support des fichiers
   */
  getResponseValue(responseData: any, key: string): any {
    const value = responseData[key];
    
    // Si c'est un tableau de fichiers (objets avec content)
    if (Array.isArray(value) && value.length > 0) {
      // Vérifier si c'est un tableau d'objets fichier
      if (typeof value[0] === 'object' && value[0].content) {
        return value; // Retourner le tableau d'objets
      }
      // Sinon, tableau simple
      return value.join(', ');
    }
    
    // Objet
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value, null, 2);
    }
    
    return String(value || 'N/A');
  }

  /**
   * ✅ Vérifier si c'est un fichier individuel
   */
  isFileUrl(value: any): boolean {
    return typeof value === 'string' && 
           (value.includes('supabase') || value.includes('/storage/')) &&
           (value.includes('.jpg') || value.includes('.png') || 
            value.includes('.pdf') || value.includes('.doc'));
  }

  /**
   * ✅ Vérifier si c'est un tableau de fichiers
   */
  isFileArray(value: any): boolean {
    if (!Array.isArray(value) || value.length === 0) {
      return false;
    }

    // Vérifier si les éléments ont une propriété 'content' avec une URL
    const firstItem = value[0];
    return typeof firstItem === 'object' && 
           firstItem.content && 
           typeof firstItem.content === 'string' &&
           (firstItem.content.includes('supabase') || 
            firstItem.content.includes('/storage/'));
  }

  /**
   * ✅ Extraire le nom du fichier depuis l'URL
   */
  getFileNameFromUrl(url: string): string {
    if (!url || typeof url !== 'string') return 'Fichier';
    
    try {
      // Extraire le dernier segment après le dernier /
      const parts = url.split('/');
      const fileName = parts[parts.length - 1];
      
      // Enlever le timestamp si présent (format: timestamp-nom.ext)
      const match = fileName.match(/^\d+-(.+)$/);
      return match ? match[1] : fileName;
    } catch (e) {
      return 'Fichier';
    }
  }

  /**
   * ✅ Déterminer le type de fichier pour l'icône
   */
  getFileIcon(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    
    switch (ext) {
      case 'pdf':
        return '📄';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return '🖼️';
      case 'doc':
      case 'docx':
        return '📝';
      case 'xls':
      case 'xlsx':
        return '📊';
      case 'zip':
      case 'rar':
        return '📦';
      default:
        return '📎';
    }
  }

  /**
   * ✅ Ouvrir un fichier dans un nouvel onglet
   */
  openFile(url: string) {
    window.open(url, '_blank');
  }
}