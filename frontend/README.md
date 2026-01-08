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

## Export des réponses
- Formats : CSV, Excel
- Options : export global, par réponse, ou réponse individuelle

---

## Licence – SurveyJS
Ce projet utilise des bibliothèques SurveyJS pour la création et l’affichage des formulaires.
https://surveyjs.io/Licenses