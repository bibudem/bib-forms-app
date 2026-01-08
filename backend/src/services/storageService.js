// backend/src/services/storageService.js
import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database.js';

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024; // 10MB par défaut

class StorageService {
  constructor() {
    this.uploadDir = UPLOAD_DIR;
    this.ensureUploadDir();
  }

  // S'assurer que le dossier uploads existe
  async ensureUploadDir() {
    try {
      if (!existsSync(this.uploadDir)) {
        await fs.mkdir(this.uploadDir, { recursive: true });
        console.log(`✅ Dossier uploads créé: ${this.uploadDir}`);
      }
    } catch (error) {
      console.error('Erreur lors de la création du dossier uploads:', error);
      throw error;
    }
  }

  // Créer un sous-dossier pour un formulaire spécifique
  async ensureFormDir(formId) {
    const formDir = path.join(this.uploadDir, formId);
    if (!existsSync(formDir)) {
      await fs.mkdir(formDir, { recursive: true });
    }
    return formDir;
  }

  // Upload d'un fichier
  async uploadFile(file, formResponseId, questionName, uploadedBy) {
    try {
      // Valider la taille du fichier
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(`Fichier trop volumineux. Maximum: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
      }

      // Récupérer l'ID du formulaire depuis la réponse
      const responseResult = await query(
        'SELECT form_id FROM form_responses WHERE id = $1',
        [formResponseId]
      );

      if (responseResult.rows.length === 0) {
        throw new Error('Réponse au formulaire non trouvée');
      }

      const formId = responseResult.rows[0].form_id;

      // Créer le dossier du formulaire
      const formDir = await this.ensureFormDir(formId);

      // Générer un nom de fichier unique
      const fileExtension = path.extname(file.originalname);
      const fileName = `${uuidv4()}${fileExtension}`;
      const filePath = path.join(formDir, fileName);

      // Sauvegarder le fichier
      await fs.writeFile(filePath, file.buffer);

      // Chemin relatif pour la base de données
      const relativeFilePath = path.join(formId, fileName);

      // Enregistrer dans la base de données
      const result = await query(
        `INSERT INTO form_file_uploads 
         (form_response_id, question_name, file_name, file_path, file_size, file_type, uploaded_by) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         RETURNING *`,
        [
          formResponseId,
          questionName,
          file.originalname,
          relativeFilePath,
          file.size,
          file.mimetype,
          uploadedBy
        ]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Erreur lors de l\'upload du fichier:', error);
      throw error;
    }
  }

  // Upload de plusieurs fichiers
  async uploadMultipleFiles(files, formResponseId, questionName, uploadedBy) {
    try {
      const uploadedFiles = [];

      for (const file of files) {
        const uploadedFile = await this.uploadFile(file, formResponseId, questionName, uploadedBy);
        uploadedFiles.push(uploadedFile);
      }

      return uploadedFiles;
    } catch (error) {
      console.error('Erreur lors de l\'upload multiple:', error);
      throw error;
    }
  }

  // Récupérer un fichier
  async getFile(fileId) {
    try {
      const result = await query(
        'SELECT * FROM form_file_uploads WHERE id = $1',
        [fileId]
      );

      if (result.rows.length === 0) {
        throw new Error('Fichier non trouvé');
      }

      const fileRecord = result.rows[0];
      const absolutePath = path.join(this.uploadDir, fileRecord.file_path);

      // Vérifier que le fichier existe
      if (!existsSync(absolutePath)) {
        throw new Error('Fichier physique non trouvé');
      }

      return {
        record: fileRecord,
        path: absolutePath
      };
    } catch (error) {
      console.error('Erreur lors de la récupération du fichier:', error);
      throw error;
    }
  }

  // Supprimer un fichier
  async deleteFile(fileId, userId = null, isAdmin = false) {
    try {
      // Récupérer les infos du fichier
      const result = await query(
        'SELECT * FROM form_file_uploads WHERE id = $1',
        [fileId]
      );

      if (result.rows.length === 0) {
        throw new Error('Fichier non trouvé');
      }

      const fileRecord = result.rows[0];

      // Vérifier les droits (si l'utilisateur n'est pas admin)
      if (!isAdmin && userId && fileRecord.uploaded_by !== userId) {
        throw new Error('Accès refusé: vous n\'êtes pas propriétaire de ce fichier');
      }

      // Supprimer le fichier physique
      const absolutePath = path.join(this.uploadDir, fileRecord.file_path);
      
      if (existsSync(absolutePath)) {
        await fs.unlink(absolutePath);
      }

      // Supprimer l'enregistrement de la base de données
      await query('DELETE FROM form_file_uploads WHERE id = $1', [fileId]);

      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression du fichier:', error);
      throw error;
    }
  }

  // Lister les fichiers d'une réponse
  async listFilesByResponse(formResponseId) {
    try {
      const result = await query(
        'SELECT * FROM form_file_uploads WHERE form_response_id = $1 ORDER BY uploaded_at DESC',
        [formResponseId]
      );

      return result.rows;
    } catch (error) {
      console.error('Erreur lors de la liste des fichiers:', error);
      throw error;
    }
  }

  // Nettoyer les fichiers orphelins
  async cleanOrphanFiles() {
    try {
      // Récupérer tous les fichiers de la BD
      const dbFiles = await query('SELECT file_path FROM form_file_uploads');
      const dbFilePaths = new Set(dbFiles.rows.map(f => f.file_path));

      // Parcourir le dossier uploads
      const formDirs = await fs.readdir(this.uploadDir);
      let deletedCount = 0;

      for (const formDir of formDirs) {
        const formDirPath = path.join(this.uploadDir, formDir);
        const stat = await fs.stat(formDirPath);

        if (stat.isDirectory()) {
          const files = await fs.readdir(formDirPath);

          for (const file of files) {
            const relativePath = path.join(formDir, file);

            if (!dbFilePaths.has(relativePath)) {
              // Fichier orphelin, supprimer
              await fs.unlink(path.join(this.uploadDir, relativePath));
              deletedCount++;
              console.log(`Fichier orphelin supprimé: ${relativePath}`);
            }
          }
        }
      }

      console.log(`${deletedCount} fichiers orphelins supprimés`);
      return deletedCount;
    } catch (error) {
      console.error('Erreur lors du nettoyage des fichiers orphelins:', error);
      throw error;
    }
  }

  // Obtenir la taille totale des fichiers
  async getTotalStorageSize() {
    try {
      const result = await query(
        'SELECT COALESCE(SUM(file_size), 0) as total_size FROM form_file_uploads'
      );

      return parseInt(result.rows[0].total_size);
    } catch (error) {
      console.error('Erreur lors du calcul de la taille totale:', error);
      throw error;
    }
  }
}

export default new StorageService();