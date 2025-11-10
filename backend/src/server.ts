import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import multer from 'multer';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Configuration Supabase avec service key pour bypass RLS
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Middleware
app.use(cors());
app.use(express.json());

// Routes de santé
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Webhook pour notifier n8n lors d'une soumission
// Dans votre backend server.ts
// ✅ Webhook pour notifier n8n lors d'une soumission
app.post('/api/responses/notify', async (req: Request, res: Response) => {
  try {
    const { responseId, formId, userEmail } = req.body;

    console.log('📨 Notification reçue:', { responseId, formId, userEmail });

    console.log('✅ n8n: ', process.env.N8N_WEBHOOK_URL);

    // ✅ Retry logic pour attendre que la réponse soit disponible
    let response = null;
    let attempts = 0;
    const maxAttempts = 5;

    while (!response && attempts < maxAttempts) {
      const { data, error } = await supabase
        .from('form_responses')
        .select(`*, forms (title, description)`)
        .eq('id', responseId)
        .maybeSingle();

      if (data) {
        response = data;
        break;
      }

      attempts++;
      console.log(`⏳ Tentative ${attempts}/${maxAttempts} - Réponse pas encore disponible`);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (!response) {
      throw new Error(`Aucune réponse trouvée après ${maxAttempts} tentatives pour l'ID ${responseId}`);
    }

    console.log('✅ Réponse trouvée:', response);

    // ✅ Vérifier que l'URL du webhook est définie
    if (!process.env.N8N_WEBHOOK_URL) {
      console.warn('⚠️ N8N_WEBHOOK_URL non définie dans .env - notification ignorée');
      return res.json({ 
        success: true, 
        message: 'Réponse sauvegardée (webhook désactivé)' 
      });
    }

    // ✅ Préparer le payload
    const payload = {
      event: 'form_submitted',
      timestamp: new Date().toISOString(),
      data: {
        responseId,
        formId,
        formTitle: response.forms?.title || 'Formulaire inconnu',
        userEmail,
        responseData: response.response_data,
        submittedAt: response.submitted_at
      }
    };

    console.log('📤 Envoi à n8n:', process.env.N8N_WEBHOOK_URL);
    console.log('📦 Payload:', JSON.stringify(payload, null, 2));

    // ✅ Envoyer à n8n avec gestion d'erreur améliorée
    try {
      const webhookResponse = await axios.post(
        process.env.N8N_WEBHOOK_URL,
        payload,
        {
          timeout: 10000, // 10 secondes de timeout
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Réponse n8n:', webhookResponse.status, webhookResponse.data);
      
      res.json({ 
        success: true, 
        message: 'Notification envoyée à n8n',
        webhookResponse: webhookResponse.data
      });

    } catch (webhookError: any) {
      // ✅ Gestion spécifique des erreurs n8n
      if (webhookError.response?.status === 404) {
        console.error('❌ Webhook n8n non trouvé (404)');
        console.error('💡 Solution: Dans n8n, cliquez sur "Execute workflow" puis réessayez');
        console.error('💡 Ou activez le workflow en mode production');
        
        // ✅ Ne pas faire échouer la requête si c'est juste le webhook
        return res.json({
          success: true,
          warning: 'Réponse sauvegardée mais webhook n8n non disponible',
          hint: 'Activez le workflow dans n8n'
        });
      }

      console.error('❌ Erreur webhook n8n:', webhookError.message);
      console.error('Détails:', webhookError.response?.data);

      // ✅ Réponse sauvegardée même si webhook échoue
      return res.json({
        success: true,
        warning: 'Réponse sauvegardée mais notification n8n a échoué',
        error: webhookError.message
      });
    }

  } catch (error: any) {
    console.error('❌ Erreur notification:', error);
    res.status(500).json({ 
      error: error.message,
      hint: 'La réponse pourrait avoir été sauvegardée malgré cette erreur'
    });
  }
});

// Statistiques pour l'admin
app.get('/api/admin/stats', async (req: Request, res: Response) => {
  try {
    const { data: forms } = await supabase
      .from('forms')
      .select('id, status');

    const { data: responses } = await supabase
      .from('form_responses')
      .select('id');

    const stats = {
      totalForms: forms?.length || 0,
      publishedForms: forms?.filter(f => f.status === 'published').length || 0,
      draftForms: forms?.filter(f => f.status === 'draft').length || 0,
      totalResponses: responses?.length || 0
    };

    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Export des réponses en CSV
app.get('/api/admin/forms/:formId/export', async (req: Request, res: Response) => {
  try {
    const { formId } = req.params;

    const { data: responses, error } = await supabase
      .from('form_responses')
      .select(`
        *,
        profiles (email)
      `)
      .eq('form_id', formId);

    if (error) throw error;

    // Conversion simple en CSV
    const csv = convertToCSV(responses);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=responses-${formId}.csv`);
    res.send(csv);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

function convertToCSV(data: any[]): string {
  if (!data || data.length === 0) return '';
  
  const headers = ['ID', 'Email', 'Soumis le', 'Réponses'];
  const rows = data.map(row => [
    row.id,
    row.profiles?.email || 'N/A',
    new Date(row.submitted_at).toLocaleString(),
    JSON.stringify(row.response_data)
  ]);

  return [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
}

app.listen(PORT, () => {
  console.log(`🚀 Serveur backend démarré sur http://localhost:${PORT}`);
});