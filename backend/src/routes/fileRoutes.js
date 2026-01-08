// backend/src/routes/fileRoutes.js
import express from 'express';
import multer from 'multer';
import storageService from '../services/storageService.js';
import { authenticate, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Configuration de multer pour le stockage en mémoire
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    // Liste des types MIME autorisés
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non autorisé'));
    }
  }
});

// Upload d'un fichier unique
router.post('/upload', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'Aucun fichier fourni'
      });
    }

    const { formResponseId, questionName } = req.body;

    if (!formResponseId || !questionName) {
      return res.status(400).json({
        error: 'formResponseId et questionName requis'
      });
    }

    const uploadedFile = await storageService.uploadFile(
      req.file,
      formResponseId,
      questionName,
      req.user.userId
    );

    res.status(201).json({
      message: 'Fichier uploadé avec succès',
      file: uploadedFile
    });
  } catch (error) {
    console.error('Erreur lors de l\'upload:', error);
    res.status(500).json({
      error: error.message || 'Erreur lors de l\'upload du fichier'
    });
  }
});

// Upload de plusieurs fichiers
router.post('/upload-multiple', authenticate, upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: 'Aucun fichier fourni'
      });
    }

    const { formResponseId, questionName } = req.body;

    if (!formResponseId || !questionName) {
      return res.status(400).json({
        error: 'formResponseId et questionName requis'
      });
    }

    const uploadedFiles = await storageService.uploadMultipleFiles(
      req.files,
      formResponseId,
      questionName,
      req.user.userId
    );

    res.status(201).json({
      message: `${uploadedFiles.length} fichiers uploadés avec succès`,
      files: uploadedFiles
    });
  } catch (error) {
    console.error('Erreur lors de l\'upload multiple:', error);
    res.status(500).json({
      error: error.message || 'Erreur lors de l\'upload des fichiers'
    });
  }
});

// Télécharger un fichier
router.get('/download/:fileId', authenticate, async (req, res) => {
  try {
    const { fileId } = req.params;

    const { record, path } = await storageService.getFile(fileId);

    // Vérifier les droits d'accès
    if (req.user.role !== 'admin' && record.uploaded_by !== req.user.userId) {
      return res.status(403).json({
        error: 'Accès refusé'
      });
    }

    // Envoyer le fichier
    res.download(path, record.file_name);
  } catch (error) {
    console.error('Erreur lors du téléchargement:', error);
    res.status(404).json({
      error: error.message || 'Fichier non trouvé'
    });
  }
});

// Obtenir les infos d'un fichier
router.get('/:fileId', authenticate, async (req, res) => {
  try {
    const { fileId } = req.params;

    const { record } = await storageService.getFile(fileId);

    // Vérifier les droits d'accès
    if (req.user.role !== 'admin' && record.uploaded_by !== req.user.userId) {
      return res.status(403).json({
        error: 'Accès refusé'
      });
    }

    res.json({
      file: record
    });
  } catch (error) {
    console.error('Erreur lors de la récupération:', error);
    res.status(404).json({
      error: error.message || 'Fichier non trouvé'
    });
  }
});

// Lister les fichiers d'une réponse
router.get('/response/:formResponseId', authenticate, async (req, res) => {
  try {
    const { formResponseId } = req.params;

    const files = await storageService.listFilesByResponse(formResponseId);

    // Filtrer selon les droits
    let filteredFiles = files;
    if (req.user.role !== 'admin') {
      filteredFiles = files.filter(f => f.uploaded_by === req.user.userId);
    }

    res.json({
      files: filteredFiles
    });
  } catch (error) {
    console.error('Erreur lors de la liste:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des fichiers'
    });
  }
});

// Supprimer un fichier
router.delete('/:fileId', authenticate, async (req, res) => {
  try {
    const { fileId } = req.params;
    const isAdmin = req.user.role === 'admin';

    await storageService.deleteFile(fileId, req.user.userId, isAdmin);

    res.json({
      message: 'Fichier supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression:', error);
    res.status(500).json({
      error: error.message || 'Erreur lors de la suppression du fichier'
    });
  }
});

// Nettoyer les fichiers orphelins (admin uniquement)
router.post('/admin/clean-orphans', authenticate, requireAdmin, async (req, res) => {
  try {
    const deletedCount = await storageService.cleanOrphanFiles();

    res.json({
      message: 'Nettoyage terminé',
      deletedCount
    });
  } catch (error) {
    console.error('Erreur lors du nettoyage:', error);
    res.status(500).json({
      error: 'Erreur lors du nettoyage'
    });
  }
});

// Obtenir la taille totale du stockage (admin uniquement)
router.get('/admin/storage-size', authenticate, requireAdmin, async (req, res) => {
  try {
    const totalSize = await storageService.getTotalStorageSize();

    res.json({
      totalSize,
      totalSizeMB: (totalSize / 1024 / 1024).toFixed(2)
    });
  } catch (error) {
    console.error('Erreur lors du calcul:', error);
    res.status(500).json({
      error: 'Erreur lors du calcul de la taille'
    });
  }
});

// Gestion des erreurs multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'Fichier trop volumineux'
      });
    }
    return res.status(400).json({
      error: error.message
    });
  }
  next(error);
});

export default router;