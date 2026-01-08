import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import { query } from './config/database.js';
import authRoutes from './routes/authRoutes.js';
import formsRoutes from './routes/formsRoutes.js';
import responsesRoutes from './routes/responsesRoutes.js'; // ← NOUVEAU
import fileRoutes from './routes/fileRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3110;

// Middleware
app.use(cors());
app.use(express.json());

// Routes de santé
app.get('/health', async (_req, res) => {
  try {
    const result = await query('SELECT NOW() as time');
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      database: 'connected',
      dbTime: result.rows[0].time
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message 
    });
  }
});

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/forms', formsRoutes);
app.use('/api/responses', responsesRoutes); // ← NOUVEAU
app.use('/api/files', fileRoutes);

/**
 * Webhook pour notifier n8n lors d'une soumission
 */
app.post('/api/responses/notify', async (req, res) => {
  try {
    const { responseId, formId, userEmail } = req.body;

    console.log('📨 Notification reçue:', { responseId, formId, userEmail });

    if (!process.env.N8N_WEBHOOK_URL) {
      console.warn('⚠️ N8N_WEBHOOK_URL non définie - notification ignorée');
      return res.json({ 
        success: true, 
        message: 'Réponse sauvegardée (webhook désactivé)' 
      });
    }

    if (!responseId || !formId || !userEmail) {
      return res.status(400).json({ 
        error: 'Paramètres manquants: responseId, formId et userEmail sont requis' 
      });
    }

    let response = null;
    const maxAttempts = 5;
    for (let attempts = 1; attempts <= maxAttempts; attempts++) {
      const result = await query(
        `SELECT fr.*, f.title AS form_title
         FROM form_responses fr
         LEFT JOIN forms f ON fr.form_id = f.id
         WHERE fr.id = $1`,
        [responseId]
      );

      if (result.rows.length > 0) {
        response = result.rows[0];
        break;
      }

      console.log(`⏳ Tentative ${attempts}/${maxAttempts} - Réponse pas encore disponible`);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (!response) {
      console.warn(`Aucune réponse trouvée après ${maxAttempts} tentatives pour l'ID ${responseId}`);
      return res.json({ 
        success: false, 
        warning: `Réponse non disponible après ${maxAttempts} tentatives` 
      });
    }

    console.log('✅ Réponse trouvée:', response.id);

    const payload = {
      event: 'form_submitted',
      timestamp: new Date().toISOString(),
      data: {
        responseId,
        formId,
        formTitle: response.form_title || 'Formulaire inconnu',
        userEmail,
        responseData: response.response_data,
        submittedAt: response.submitted_at
      }
    };

    console.log('📤 Envoi à n8n:', process.env.N8N_WEBHOOK_URL);

    try {
      const webhookResponse = await axios.post(
        process.env.N8N_WEBHOOK_URL, 
        payload, 
        {
          timeout: 10000,
          headers: { 'Content-Type': 'application/json' }
        }
      );

      console.log('✅ Réponse n8n:', webhookResponse.status);

      res.json({ 
        success: true, 
        message: 'Notification envoyée à n8n', 
        webhookStatus: webhookResponse.status 
      });

    } catch (webhookError) {
      console.error('❌ Erreur webhook n8n:', webhookError.message);
      
      return res.json({
        success: true,
        warning: 'Réponse sauvegardée mais notification n8n a échoué',
        error: webhookError.message
      });
    }

  } catch (error) {
    console.error('❌ Erreur notification:', error);
    res.status(500).json({ 
      error: error.message, 
      hint: 'La réponse a été sauvegardée mais la notification a échoué' 
    });
  }
});

/**
 * Statistiques pour l'admin
 */
app.get('/api/admin/stats', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token d\'authentification requis' });
    }

    const formsResult = await query('SELECT id, status FROM forms');
    const responsesResult = await query('SELECT id FROM form_responses');
    const usersResult = await query('SELECT id, role FROM profiles');

    const forms = formsResult.rows;
    const responses = responsesResult.rows;
    const users = usersResult.rows;

    const stats = {
      totalForms: forms.length,
      publishedForms: forms.filter(f => f.status === 'published').length,
      draftForms: forms.filter(f => f.status === 'draft').length,
      archivedForms: forms.filter(f => f.status === 'archived').length,
      totalResponses: responses.length,
      totalUsers: users.length,
      adminUsers: users.filter(u => u.role === 'admin').length,
      clientUsers: users.filter(u => u.role === 'client').length
    };

    res.json(stats);
  } catch (error) {
    console.error('❌ Erreur stats admin:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Export des réponses en CSV
 */
app.get('/api/admin/forms/:formId/export', async (req, res) => {
  try {
    const { formId } = req.params;
    
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token d\'authentification requis' });
    }

    const responsesResult = await query(
      `SELECT fr.*, p.email AS user_email
       FROM form_responses fr
       LEFT JOIN profiles p ON fr.user_id = p.id
       WHERE fr.form_id = $1
       ORDER BY fr.submitted_at DESC`,
      [formId]
    );

    const responses = responsesResult.rows;

    if (responses.length === 0) {
      return res.status(404).json({ error: 'Aucune réponse trouvée pour ce formulaire' });
    }

    const csv = convertToCSV(responses);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=responses-${formId}-${Date.now()}.csv`);
    res.send(csv);

  } catch (error) {
    console.error('❌ Erreur export CSV:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper CSV
function convertToCSV(data) {
  if (!data || data.length === 0) return '';
  
  try {
    const headers = ['ID', 'Email', 'Soumis le', 'Réponses'];
    
    const rows = data.map(row => {
      const safeData = JSON.stringify(row.response_data || {})
        .replace(/"/g, '""')
        .replace(/\n/g, ' ');
      
      return [
        row.id,
        row.user_email || 'N/A',
        new Date(row.submitted_at).toLocaleString('fr-FR'),
        `"${safeData}"`
      ];
    });

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  } catch (error) {
    console.error('Erreur conversion CSV:', error);
    return '';
  }
}

// Middleware pour gérer les erreurs 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

// Middleware global de gestion des erreurs
app.use((error, req, res, next) => {
  console.error('🔥 Erreur globale:', error);
  res.status(500).json({ 
    error: 'Erreur interne du serveur',
    message: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur backend démarré sur http://localhost:${PORT}`);
  console.log(`📝 Environnement: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Base de données: ${process.env.DATABASE_URL ? 'Configurée' : 'Non configurée'}`);
});