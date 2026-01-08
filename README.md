# Bib-Forms App

**Application web de gestion de formulaires et de réponses**
Frontend : Angular | Backend : Node.js/Express | Base de données : PostgreSQL

## Frontend (Angular)

### Stack technique
- **Framework** : Angular
- **UI** : Bootstrap + Bootstrap Icons
- **Formulaires** : SurveyJS
- **Styles** : SCSS

### Ressources incluses
- **Styles** : `bootstrap-icons`, `survey-core`, styles personnalisés
- **Scripts** : jQuery, Popper, Bootstrap Bundle

### Lancement
```bash
cd frontend
npm install
ng serve
```
- **URL** : [http://localhost:4200](http://localhost:4200)

---

## Backend (Node.js / Express)

### Fonctionnalités
- API REST pour la gestion des formulaires, réponses, authentification et upload de fichiers
- Base de données **PostgreSQL locale** (plus de Supabase)

### Stack technique
- **Node.js**, **Express**
- **PostgreSQL** (via `pg`)
- **Authentification** : JWT
- **Upload** : Multer
- **Sécurité** : Helmet, CORS

### Dépendances principales
- `express`, `pg`, `jsonwebtoken`, `bcrypt`, `multer`, `dotenv`

### Lancement
```bash
cd backend
npm install
npm run dev
```
- **API** : [http://localhost:3110](http://localhost:3110)

---

## Base de données
- **PostgreSQL** (connexion via `.env`)
- Script d’initialisation :
  ```bash
  npm run init-db
  ```

---

## Authentification
- Basée sur **JWT**
- Gestion des utilisateurs côté backend
- Sécurité renforcée (Helmet)

---

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

Voir `LICENSES/SURVEYJS_LICENSE.txt` pour les détails complets.


**Version** : 1.0.0  
**Dernière mise à jour** : Janvier 2026