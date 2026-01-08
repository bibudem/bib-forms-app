export const environment = {
  production: false,
  
  // ✅ Configuration de l'API locale (PostgreSQL)
  apiUrl: 'http://localhost:3110/api',
  
  // ❌ Supabase désactivé - garder pour compatibilité mais vide
  supabase: {
    url: '', // Non utilisé
    anonKey: '' // Non utilisé
  },

  // Configuration de l'application
  appName: 'Bib-Forms',
  version: '2.0.0',
  
  // Limites de fichiers
  maxFileSize: 50 * 1024 * 1024, // 50MB
  allowedFileTypes: [
    'pdf',
    'doc',
    'docx',
    'xls',
    'xlsx',
    'txt',
    'csv',
    'jpg',
    'jpeg',
    'png',
    'gif',
    'webp'
  ]
};

// Environment production
export const environmentProd = {
  production: true,
  
  // URL de production (à adapter)
  apiUrl: 'https://votre-domaine.com/api',
  
  supabase: {
    url: '',
    anonKey: ''
  },

  appName: 'Bib-Forms',
  version: '2.0.0',
  
  maxFileSize: 50 * 1024 * 1024,
  allowedFileTypes: [
    'pdf', 'doc', 'docx', 'xls', 'xlsx',
    'txt', 'csv', 'jpg', 'jpeg', 'png', 'gif', 'webp'
  ]
};