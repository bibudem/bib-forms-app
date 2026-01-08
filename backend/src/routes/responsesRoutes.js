// backend/src/routes/responsesRoutes.js
import express from 'express';
import { query } from '../config/database.js';
import { authenticate, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * GET /api/responses
 * Récupérer toutes les réponses (admin) ou filtrées par form_id
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { form_id } = req.query;
    const isAdmin = req.user.role === 'admin';

    console.log('📊 GET /api/responses');
    console.log('👤 Utilisateur:', req.user.email, 'Role:', req.user.role);
    console.log('🔍 Filtre form_id:', form_id);

    let sql;
    let params;

    if (form_id) {
      // Filtrer par formulaire
      sql = `
        SELECT 
          fr.*,
          f.title as form_title,
          p.email as user_email
        FROM form_responses fr
        LEFT JOIN forms f ON fr.form_id = f.id
        LEFT JOIN profiles p ON fr.user_id = p.id
        WHERE fr.form_id = $1
      `;
      params = [form_id];

      // Si non admin, filtrer aussi par user_id
      if (!isAdmin) {
        sql += ' AND fr.user_id = $2';
        params.push(req.user.userId);
      }
    } else {
      // Toutes les réponses
      sql = `
        SELECT 
          fr.*,
          f.title as form_title,
          p.email as user_email
        FROM form_responses fr
        LEFT JOIN forms f ON fr.form_id = f.id
        LEFT JOIN profiles p ON fr.user_id = p.id
      `;
      params = [];

      // Si non admin, filtrer par user_id
      if (!isAdmin) {
        sql += ' WHERE fr.user_id = $1';
        params.push(req.user.userId);
      }
    }

    sql += ' ORDER BY fr.submitted_at DESC';

    console.log('📝 SQL:', sql);
    console.log('📝 Params:', params);

    const result = await query(sql, params);

    // Parser response_data pour chaque réponse
    const responses = result.rows.map(row => {
      try {
        if (typeof row.response_data === 'string') {
          row.response_data = JSON.parse(row.response_data);
        }
      } catch (e) {
        console.warn('⚠️ Impossible de parser response_data pour:', row.id);
      }

      // Créer un objet form et profile pour compatibilité frontend
      return {
        ...row,
        form: row.form_title ? { title: row.form_title } : null,
        profile: row.user_email ? { email: row.user_email } : null
      };
    });

    console.log(`✅ ${responses.length} réponses récupérées`);
    res.json(responses);

  } catch (err) {
    console.error('❌ GET /responses erreur:', err.message, err.stack);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des réponses',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

/**
 * GET /api/responses/:id
 * Récupérer une réponse spécifique
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user.role === 'admin';

    console.log(`📊 GET /api/responses/${id}`);

    const result = await query(
      `SELECT 
        fr.*,
        f.title as form_title,
        p.email as user_email
      FROM form_responses fr
      LEFT JOIN forms f ON fr.form_id = f.id
      LEFT JOIN profiles p ON fr.user_id = p.id
      WHERE fr.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      console.log(`❌ Réponse ${id} non trouvée`);
      return res.status(404).json({ error: 'Réponse introuvable' });
    }

    const response = result.rows[0];

    // Vérifier les droits d'accès (si non admin)
    if (!isAdmin && response.user_id !== req.user.userId) {
      console.warn('❌ Accès refusé à la réponse', id);
      return res.status(403).json({ 
        error: 'Accès refusé à cette réponse' 
      });
    }

    // Parser response_data
    try {
      if (typeof response.response_data === 'string') {
        response.response_data = JSON.parse(response.response_data);
      }
    } catch (e) {
      console.warn('⚠️ Impossible de parser response_data');
    }

    // Ajouter les objets form et profile
    response.form = response.form_title ? { title: response.form_title } : null;
    response.profile = response.user_email ? { email: response.user_email } : null;

    console.log(`✅ Réponse ${id} récupérée`);
    res.json(response);

  } catch (err) {
    console.error(`❌ GET /responses/${req.params.id} erreur:`, err.message);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération de la réponse',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

/**
 * POST /api/responses
 * Créer une nouvelle réponse (soumettre un formulaire)
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { form_id, response_data } = req.body;

    console.log('📝 POST /api/responses - Soumission réponse');
    console.log('👤 Utilisateur:', req.user.email);
    console.log('📋 Formulaire ID:', form_id);
    console.log('📦 Données:', response_data);

    // Validation
    if (!form_id) {
      return res.status(400).json({ 
        error: 'form_id est requis' 
      });
    }

    if (!response_data || typeof response_data !== 'object') {
      return res.status(400).json({ 
        error: 'response_data doit être un objet' 
      });
    }

    // Vérifier si le formulaire existe et est publié
    const formResult = await query(
      'SELECT id, title, status FROM forms WHERE id = $1',
      [form_id]
    );

    if (formResult.rows.length === 0) {
      console.log(`❌ Formulaire ${form_id} non trouvé`);
      return res.status(404).json({ error: 'Formulaire introuvable' });
    }

    const form = formResult.rows[0];

    // Autoriser draft pour les admins, sinon seulement published
    if (form.status !== 'published' && req.user.role !== 'admin') {
      console.log(`⚠️ Formulaire ${form_id} non publié (status: ${form.status})`);
      return res.status(400).json({ 
        error: 'Ce formulaire n\'est pas encore publié' 
      });
    }

    // Sérialiser response_data
    const responseDataString = JSON.stringify(response_data);

    // Insérer la réponse
    const result = await query(
      `INSERT INTO form_responses (form_id, user_id, response_data) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [form_id, req.user.userId, responseDataString]
    );

    const newResponse = result.rows[0];

    // Parser response_data pour le retour
    try {
      if (typeof newResponse.response_data === 'string') {
        newResponse.response_data = JSON.parse(newResponse.response_data);
      }
    } catch (e) {
      console.warn('⚠️ Impossible de parser response_data');
    }

    console.log(`✅ Réponse ${newResponse.id} créée pour le formulaire ${form_id}`);

    res.status(201).json({
      message: 'Réponse soumise avec succès',
      response: newResponse
    });

  } catch (err) {
    console.error('❌ POST /responses erreur:', err.message, err.stack);
    res.status(500).json({ 
      error: 'Erreur lors de la soumission de la réponse',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

/**
 * DELETE /api/responses/:id
 * Supprimer une réponse (admin ou propriétaire)
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user.role === 'admin';

    console.log(`🗑️ DELETE /api/responses/${id}`);

    // Récupérer la réponse
    const checkResult = await query(
      'SELECT id, user_id FROM form_responses WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      console.log(`❌ Réponse ${id} non trouvée`);
      return res.status(404).json({ error: 'Réponse introuvable' });
    }

    const response = checkResult.rows[0];

    // Vérifier les droits (admin ou propriétaire)
    if (!isAdmin && response.user_id !== req.user.userId) {
      console.warn('❌ Accès refusé pour supprimer la réponse', id);
      return res.status(403).json({ 
        error: 'Vous ne pouvez supprimer que vos propres réponses' 
      });
    }

    // Supprimer la réponse
    await query('DELETE FROM form_responses WHERE id = $1', [id]);

    console.log(`✅ Réponse ${id} supprimée`);
    res.json({ 
      success: true, 
      message: 'Réponse supprimée avec succès' 
    });

  } catch (err) {
    console.error(`❌ DELETE /responses/${req.params.id} erreur:`, err.message);
    res.status(500).json({ 
      error: 'Erreur lors de la suppression de la réponse',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

/**
 * POST /api/responses/files
 * Sauvegarder les métadonnées d'un fichier uploadé
 */
router.post('/files', authenticate, async (req, res) => {
  try {
    const { 
      form_response_id, 
      question_name, 
      file_name, 
      file_path, 
      file_size, 
      file_type 
    } = req.body;

    console.log('📎 POST /api/responses/files - Métadonnées fichier');

    // Validation
    if (!form_response_id || !question_name || !file_name || !file_path) {
      return res.status(400).json({ 
        error: 'Paramètres manquants: form_response_id, question_name, file_name, file_path requis' 
      });
    }

    // Vérifier que la réponse existe
    const responseCheck = await query(
      'SELECT id, user_id FROM form_responses WHERE id = $1',
      [form_response_id]
    );

    if (responseCheck.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Réponse de formulaire introuvable' 
      });
    }

    // Vérifier les droits (propriétaire ou admin)
    const isOwner = responseCheck.rows[0].user_id === req.user.userId;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ 
        error: 'Accès refusé' 
      });
    }

    // Insérer les métadonnées du fichier
    const result = await query(
      `INSERT INTO form_file_uploads 
       (form_response_id, question_name, file_name, file_path, file_size, file_type, uploaded_by) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [
        form_response_id,
        question_name,
        file_name,
        file_path,
        file_size || 0,
        file_type || 'application/octet-stream',
        req.user.userId
      ]
    );

    console.log('✅ Métadonnées fichier sauvegardées:', result.rows[0].id);
    res.status(201).json({
      message: 'Métadonnées fichier sauvegardées',
      file: result.rows[0]
    });

  } catch (err) {
    console.error('❌ POST /responses/files erreur:', err.message);
    res.status(500).json({ 
      error: 'Erreur lors de la sauvegarde des métadonnées',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

export default router;