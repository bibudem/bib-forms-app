// backend/src/routes/formsRoutes.js
import express from 'express';
import axios from 'axios';
import { query } from '../config/database.js';
import { authenticate, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * GET /api/forms
 * Optionnel : ?status=published
 */
router.get('/', async (req, res) => {
  try {
    console.log('📋 GET /api/forms - Récupération des formulaires');
    
    const { status } = req.query;
    let sql = 'SELECT id, title, description, json_schema, status, created_at, updated_at FROM forms';
    const params = [];

    if (status) {
      sql += ' WHERE status = $1';
      params.push(status);
    }

    sql += ' ORDER BY created_at DESC';

    console.log('📊 Requête SQL:', sql, 'Params:', params);
    
    const result = await query(sql, params);
    
    console.log(`✅ ${result.rows.length} formulaires récupérés`);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ GET /forms erreur:', err.message, err.stack);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des formulaires',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

/**
 * GET /api/forms/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📋 GET /api/forms/${id}`);

    const result = await query(
      'SELECT id, title, description, json_schema, status, created_at, updated_at FROM forms WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      console.log(`❌ Formulaire ${id} non trouvé`);
      return res.status(404).json({ error: 'Formulaire introuvable' });
    }

    console.log(`✅ Formulaire ${id} récupéré`);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(`❌ GET /forms/${req.params.id} erreur:`, err.message, err.stack);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération du formulaire',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

/**
 * POST /api/forms - Créer un formulaire (admin uniquement)
 */
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    console.log('📝 POST /api/forms - Création formulaire');
    console.log('👤 Utilisateur:', req.user);
    console.log('📦 Données reçues:', JSON.stringify(req.body, null, 2));

    const { title, description, json_schema, status = 'draft' } = req.body;

    // Validation stricte
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      console.warn('❌ Validation échouée: titre invalide');
      return res.status(400).json({ 
        error: 'Le titre est requis et doit être une chaîne non vide' 
      });
    }

    if (!json_schema || typeof json_schema !== 'object') {
      console.warn('❌ Validation échouée: json_schema invalide');
      return res.status(400).json({ 
        error: 'Le schéma JSON est requis et doit être un objet' 
      });
    }

    // Validation du status
    const validStatuses = ['draft', 'published', 'archived'];
    if (!validStatuses.includes(status)) {
      console.warn('❌ Validation échouée: status invalide');
      return res.status(400).json({ 
        error: 'Le status doit être draft, published ou archived' 
      });
    }

    // Sérialiser json_schema en JSON string
    const jsonSchemaString = JSON.stringify(json_schema);

    console.log('💾 Insertion dans la base de données...');
    console.log('- Title:', title);
    console.log('- Description:', description);
    console.log('- Status:', status);
    console.log('- JSON Schema length:', jsonSchemaString.length);

    let result;
    
    try {
      // Essayer d'abord avec created_by
      result = await query(
        `INSERT INTO forms (title, description, json_schema, status, created_by) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING id, title, description, json_schema, status, created_at, updated_at`,
        [title, description || '', jsonSchemaString, status, req.user.userId]
      );
      console.log('✅ Formulaire créé avec created_by');
    } catch (dbError) {
      console.log('⚠️ Colonne created_by non disponible, tentative sans...');
      
      // Si la colonne created_by n'existe pas, réessayer sans
      result = await query(
        `INSERT INTO forms (title, description, json_schema, status) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id, title, description, json_schema, status, created_at, updated_at`,
        [title, description || '', jsonSchemaString, status]
      );
      console.log('✅ Formulaire créé sans created_by');
    }

    const newForm = result.rows[0];
    
    // Parser json_schema pour le retour
    if (newForm.json_schema) {
      try {
        newForm.json_schema = JSON.parse(newForm.json_schema);
      } catch (parseError) {
        console.warn('⚠️ Impossible de parser json_schema pour le retour');
      }
    }

    console.log(`✅ Nouveau formulaire créé: ${newForm.id} - ${newForm.title}`);

    res.status(201).json(newForm);

  } catch (err) {
    console.error('❌ POST /forms erreur:', err.message);
    console.error('Stack:', err.stack);
    
    // Détails de l'erreur PostgreSQL si disponible
    if (err.code) {
      console.error('Code erreur PostgreSQL:', err.code);
      console.error('Détail:', err.detail);
      console.error('Contrainte:', err.constraint);
    }
    
    res.status(500).json({ 
      error: 'Erreur lors de la création du formulaire',
      message: err.message,
      details: process.env.NODE_ENV === 'development' ? {
        stack: err.stack,
        code: err.code,
        detail: err.detail
      } : undefined
    });
  }
});

/**
 * PUT /api/forms/:id - Modifier un formulaire (admin uniquement)
 */
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, json_schema, status } = req.body;

    console.log(`📝 PUT /api/forms/${id} - Modification formulaire`);
    console.log('👤 Utilisateur:', req.user);
    console.log('📦 Données reçues:', JSON.stringify(req.body, null, 2));

    // Vérifier si le formulaire existe
    const checkResult = await query(
      'SELECT id FROM forms WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      console.log(`❌ Formulaire ${id} non trouvé`);
      return res.status(404).json({ error: 'Formulaire introuvable' });
    }

    // Validation du status si fourni
    if (status) {
      const validStatuses = ['draft', 'published', 'archived'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
          error: 'Le status doit être draft, published ou archived' 
        });
      }
    }

    // Sérialiser json_schema si fourni
    const jsonSchemaString = json_schema ? JSON.stringify(json_schema) : null;

    const result = await query(
      `UPDATE forms 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           json_schema = COALESCE($3, json_schema),
           status = COALESCE($4, status),
           updated_at = NOW()
       WHERE id = $5
       RETURNING id, title, description, json_schema, status, created_at, updated_at`,
      [title, description, jsonSchemaString, status, id]
    );

    const updatedForm = result.rows[0];
    
    // Parser json_schema pour le retour
    if (updatedForm.json_schema) {
      try {
        updatedForm.json_schema = JSON.parse(updatedForm.json_schema);
      } catch (parseError) {
        console.warn('⚠️ Impossible de parser json_schema pour le retour');
      }
    }

    console.log(`✅ Formulaire ${id} mis à jour`);
    res.json(updatedForm);
  } catch (err) {
    console.error(`❌ PUT /forms/${req.params.id} erreur:`, err.message, err.stack);
    res.status(500).json({ 
      error: 'Erreur lors de la modification du formulaire',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

/**
 * DELETE /api/forms/:id - Supprimer un formulaire (admin uniquement)
 */
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ DELETE /api/forms/${id} - Suppression formulaire`);

    // Vérifier s'il y a des réponses
    const responsesResult = await query(
      'SELECT COUNT(*) as count FROM form_responses WHERE form_id = $1',
      [id]
    );

    const responseCount = parseInt(responsesResult.rows[0].count);
    
    if (responseCount > 0) {
      console.log(`⚠️ Formulaire ${id} a ${responseCount} réponses - suppression refusée`);
      return res.status(400).json({ 
        error: 'Impossible de supprimer ce formulaire car il a des réponses',
        responseCount
      });
    }

    const result = await query(
      'DELETE FROM forms WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      console.log(`❌ Formulaire ${id} non trouvé`);
      return res.status(404).json({ error: 'Formulaire introuvable' });
    }

    console.log(`✅ Formulaire ${id} supprimé`);
    res.json({ 
      success: true, 
      message: 'Formulaire supprimé avec succès',
      deletedId: result.rows[0].id
    });
  } catch (err) {
    console.error(`❌ DELETE /forms/${req.params.id} erreur:`, err.message, err.stack);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/forms/:id/has-responses
 */
router.get('/:id/has-responses', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'SELECT EXISTS(SELECT 1 FROM form_responses WHERE form_id = $1) as has_responses',
      [id]
    );

    res.json({ hasResponses: result.rows[0].has_responses });
  } catch (err) {
    console.error(`❌ GET /forms/${req.params.id}/has-responses erreur:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/forms/:id/responses - Récupérer les réponses d'un formulaire (admin uniquement)
 */
router.get('/:id/responses', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    console.log(`📊 GET /api/forms/${id}/responses - Page ${page}, Limit ${limit}`);

    // Récupérer le total
    const totalResult = await query(
      'SELECT COUNT(*) as total FROM form_responses WHERE form_id = $1',
      [id]
    );

    const total = parseInt(totalResult.rows[0].total);

    // Récupérer les réponses
    const responsesResult = await query(
      `SELECT fr.*, p.email as user_email
       FROM form_responses fr
       LEFT JOIN profiles p ON fr.user_id = p.id
       WHERE fr.form_id = $1
       ORDER BY fr.submitted_at DESC
       LIMIT $2 OFFSET $3`,
      [id, limit, offset]
    );

    console.log(`✅ ${responsesResult.rows.length} réponses récupérées pour le formulaire ${id}`);

    res.json({
      responses: responsesResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error(`❌ GET /forms/${req.params.id}/responses erreur:`, err.message, err.stack);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des réponses',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

/**
 * POST /api/forms/:id/submit - Soumettre une réponse
 */
router.post('/:id/submit', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { response_data } = req.body;

    console.log(`📝 POST /api/forms/${id}/submit - Soumission réponse`);
    console.log('👤 Utilisateur:', req.user.email);
    console.log('📦 Données réponse:', response_data);

    // Vérifier si le formulaire existe et est publié
    const formResult = await query(
      'SELECT id, title, status FROM forms WHERE id = $1',
      [id]
    );

    if (formResult.rows.length === 0) {
      console.log(`❌ Formulaire ${id} non trouvé`);
      return res.status(404).json({ error: 'Formulaire introuvable' });
    }

    const form = formResult.rows[0];
    
    if (form.status !== 'published') {
      console.log(`⚠️ Formulaire ${id} non publié (status: ${form.status})`);
      return res.status(400).json({ error: 'Ce formulaire n\'est pas publié' });
    }

    // Sérialiser response_data
    const responseDataString = JSON.stringify(response_data);

    // Insérer la réponse
    const responseResult = await query(
      `INSERT INTO form_responses (form_id, user_id, response_data) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [id, req.user.userId, responseDataString]
    );

    const response = responseResult.rows[0];
    
    // Parser response_data pour le retour
    if (response.response_data) {
      try {
        response.response_data = JSON.parse(response.response_data);
      } catch (parseError) {
        console.warn('⚠️ Impossible de parser response_data');
      }
    }

    console.log(`✅ Réponse ${response.id} créée pour le formulaire ${id}`);

    // Notifier n8n si configuré (asynchrone)
    if (process.env.N8N_WEBHOOK_URL) {
      setTimeout(async () => {
        try {
          await axios.post(
            `http://localhost:${process.env.PORT || 3110}/api/responses/notify`,
            {
              responseId: response.id,
              formId: id,
              userEmail: req.user.email
            },
            { timeout: 5000 }
          );
          console.log(`✅ Notification n8n envoyée pour la réponse ${response.id}`);
        } catch (webhookError) {
          console.error(`❌ Erreur notification n8n:`, webhookError.message);
        }
      }, 100);
    }

    res.status(201).json({
      message: 'Réponse soumise avec succès',
      response
    });
  } catch (err) {
    console.error(`❌ POST /forms/${req.params.id}/submit erreur:`, err.message, err.stack);
    res.status(500).json({ 
      error: 'Erreur lors de la soumission de la réponse',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

export default router;