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
- Upload de fichiers (images, documents)
- Remplissage et soumission de formulaires
- Gestion des rôles (Admin / Client)
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

Créer un fichier `.env` dans le dossier `frontend/` :

```env
# Supabase
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-anon-key

# Bucket pour uploads
VITE_SUPABASE_STORAGE_BUCKET=form-uploads
```

### 3. Configuration Supabase

#### a) Créer le bucket de stockage

Dans Supabase → Storage → Create bucket :
- **Name** : `form-uploads`
- **Public** : ✅ Activé


### 4. Démarrer le frontend

```bash
npm run dev
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
SUPABASE_SERVICE_KEY=votre-service-role-key

# n8n Webhook (Installation locale UdeM)
# Mode test (nécessite de cliquer sur "Execute workflow" à chaque fois)
N8N_WEBHOOK_URL=https://ordo.bib.umontreal.ca/webhook-test/form-achat

# Mode production (workflow toujours actif)
# N8N_WEBHOOK_URL=https://ordo.bib.umontreal.ca/webhook/form-achat
```

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

### Statistiques (Admin)
```http
GET /api/admin/stats
```

Retourne :
```json
{
  "totalForms": 5,
  "publishedForms": 3,
  "draftForms": 2,
  "totalResponses": 42,
  "notifications": {
    "total": 42,
    "success": 38,
    "failed": 3,
    "pending": 1
  }
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

### 2. Configurer le webhook

**Paramètres du webhook :**
- **HTTP Method** : POST
- **Path** : `form-achat` (ou autre nom)
- **Authentication** : None
- **Respond** : Immediately

### 3. Ajouter le logging (optionnel)

Après le webhook, ajouter un nœud **Supabase** :

**Configuration :**
- **Resource** : Row
- **Operation** : Insert
- **Table** : `n8n_logs`

**Champs :**
```javascript
{
  "response_id": "{{ $json.data.responseId }}",
  "form_response_id": "{{ $json.data.responseId }}",
  "form_id": "{{ $json.data.formId }}",
  "event_type": "{{ $json.event }}",
  "status": "success",
  "payload": {{ $json }},
  "n8n_response": {
    "workflow_id": "{{ $workflow.id }}",
    "execution_id": "{{ $execution.id }}"
  }
}
```
## 📊 Structure des Données

### Payload envoyé à n8n

```json
{
  "event": "form_submitted",
  "timestamp": "2025-11-07T20:03:57.430Z",
  "data": {
    "responseId": "uuid",
    "formId": "uuid",
    "userId": "uuid",
    "formTitle": "Mon formulaire",
    "userEmail": "user@example.com",
    "responseData": {
      "question1": "Réponse 1",
      "question2": true,
      "question_file": [
        {
          "name": "document.pdf",
          "type": "application/pdf",
          "content": "https://supabase.co/storage/.../file.pdf"
        }
      ]
    },
    "submittedAt": "2025-11-07T20:03:57.145217+00:00"
  }
}
```

---

## 👥 Gestion des Rôles

### Rôles disponibles

| Rôle | Permissions |
|------|-------------|
| **admin** | Créer/modifier/supprimer des formulaires, voir toutes les réponses, export CSV |
| **client** | Voir et remplir les formulaires publiés, voir ses propres réponses |


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
Ce projet est la propriété de l'Université de Montréal - Bibliothèques.

### SurveyJS
Ce projet utilise SurveyJS dans sa version gratuite (Community Edition) sous licence MIT.

**SurveyJS Library & Creator - MIT License**

Copyright (c) 2015-2025 Devsoft Baltic OÜ

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

**Note importante** : La version gratuite de SurveyJS affiche un badge "Powered by SurveyJS" dans l'interface. Pour retirer ce badge, une licence commerciale est requise : https://surveyjs.io/buy

---

## 🆘 Support

Pour toute question ou problème :
1. Consulter ce README
2. Vérifier les logs backend et Supabase
3. Contacter l'équipe de développement

---

**Version** : 1.0.0  
**Dernière mise à jour** : Novembre 2025