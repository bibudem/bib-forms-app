# BIB Forms App - Système de Gestion de Formulaires

Application complète de création et gestion de formulaires avec intégration n8n pour l'automatisation des workflows.

## Architecture du Projet

```
bib-forms-app/
├── frontend/          # Application Angular
├── backend/           # API Express + TypeScript
└── README.md          # Ce fichier
```

---

## 🎯 Fonctionnalités

### Frontend (Angular)
- Authentification utilisateur (Supabase Auth)
- Création de formulaires avec SurveyJS Creator
- Upload de fichiers (images, documents) dans Supabase
- Remplissage et soumission de formulaires
- Gestion des rôles (Admin / User)
- Tableau de bord administrateur

### 🔧 Backend (Node.js + Express)
- API REST pour notifications
- Intégration webhook n8n
- Export CSV des réponses
- Logging des notifications
- Retry logic pour les webhooks

### 🤖 Intégration n8n
- Notifications automatiques lors des soumissions
- Logging des workflows
- Webhooks configurables (test/production)

---

## 🚀 Installation

### Prérequis

- **Node.js** : v18 ou supérieur
- **npm** : v9 ou supérieur
- **Compte Supabase** : Projet configuré
- **n8n** : Instance en cours d'exécution (optionnel)

---

## 📦 Installation Frontend

### 1. Cloner le projet et installer les dépendances

```bash
cd frontend
npm install
```

### 2. Configuration de l'environnement

Créer un fichier `src/config.local.ts` dans le dossier `frontend/` :

# Supabase
```bash
export const config = {
  supabaseUrl: 'https://votre-projet.supabase.co',
  supabaseKey: 'VOTRE-CLÉ',
  apiUrlDev: 'http://localhost:3000/api',
  apiUrlProd: 'https://api-a-definir/api'
};
```

# Bucket pour uploads
SUPABASE_URL_STORAGE_BUCKET=form-uploads

### 3. Configuration Supabase

#### a) Créer le bucket de stockage

Dans Supabase → Storage → Create bucket :
- **Name** : `form-uploads`
- **Public** : ✅ Activé

### 4. Démarrer le frontend

```bash
ng serve
```

Application disponible sur : `http://localhost:4200`

---

## 🔧 Installation Backend

### 1. Installer les dépendances

```bash
cd backend
npm install
```

### 2. Configuration de l'environnement

Créer un fichier `.env` dans le dossier `backend/` :

```env
# Port serveur
PORT=3000

# Supabase
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_SERVICE_KEY=votre-anon-key

N8N_WEBHOOK_URL=votre-n8n-url

### 3. Démarrer le backend

```bash
npm run dev
```

API disponible sur : `http://localhost:3000`

---

## 🔌 Routes API Backend

### Santé du serveur
```http
GET /health
```

### Notifications
```http
POST /api/responses/notify
Content-Type: application/json

{
  "responseId": "uuid",
  "formId": "uuid",
  "userEmail": "user@example.com"
}
```


### Export CSV
```http
GET /api/admin/forms/:formId/export
```

---

## 🤖 Configuration n8n

### 1. Créer un workflow n8n

1. Aller sur : **https://ordo.bib.umontreal.ca/**
2. Se connecter avec vos identifiants
3. Créer un nouveau workflow
4. Ajouter un nœud **Webhook**


## 🧪 Tests

### Test manuel du workflow complet

1. **Créer un formulaire (Admin)**
   - Se connecter en tant qu'admin
   - Créer un formulaire avec questions
   - Publier le formulaire

2. **Remplir le formulaire (Client)**
   - Se connecter en tant que client
   - Remplir et soumettre le formulaire

3. **Vérifier les logs**
   - Backend : Logs de notification dans la console
   - Supabase : Table `n8n_logs`
   - n8n : Exécutions du workflow

### Endpoints de santé

```bash
# Backend
curl http://localhost:3000/health

# Stats admin
curl http://localhost:3000/api/admin/stats
```

## 📚 Technologies Utilisées

### Frontend
- **Angular 18** - Framework web
- **SurveyJS Creator** (Version gratuite) - Création de formulaires
- **SurveyJS Library** (Version gratuite) - Affichage de formulaires
- **Supabase Client** - Backend-as-a-Service
- **TypeScript** - Langage typé

### Backend
- **Node.js** - Runtime JavaScript
- **Express** - Framework web
- **TypeScript** - Langage typé
- **Axios** - Client HTTP
- **Supabase** - Base de données et auth

### Outils
- **n8n** (Installation locale) - Automatisation de workflows
  - URL: https://ordo.bib.umontreal.ca/
- **Supabase** - Base de données PostgreSQL



## Auteur

**Natalia Jabinschi**
- Email: natalia.jabinschi@umontreal.ca

---

## 📄 Licence

### Projet
Ce projet est la propriété de l’Université de Montréal - Bibliothèques.

### SurveyJS
Ce projet utilise la bibliothèque gratuite de SurveyJS (Form Library) sous licence MIT.

**SurveyJS Form Library — MIT License**

Copyright (c) 2015-2025 Devsoft Baltic OÜ

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction … (insertion intégrale de la licence MIT)


**Version** : 1.0.0  
**Dernière mise à jour** : Novembre 2025