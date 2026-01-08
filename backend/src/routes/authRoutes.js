// backend/src/routes/authRoutes.js
import express from 'express';
import authService from '../services/authService.js';
import { authenticate, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Inscription
router.post('/register', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email et mot de passe requis'
      });
    }

    // Validation du format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Format d\'email invalide'
      });
    }

    // Validation du mot de passe (minimum 8 caractères)
    if (password.length < 8) {
      return res.status(400).json({
        error: 'Le mot de passe doit contenir au moins 8 caractères'
      });
    }

    // Seuls les admins peuvent créer d'autres admins
    let userRole = 'client';
    if (role === 'admin') {
      // Vérifier si l'utilisateur qui crée est admin
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
          error: 'Seuls les administrateurs peuvent créer d\'autres administrateurs'
        });
      }
      userRole = 'admin';
    }

    const result = await authService.register(email, password, userRole);

    res.status(201).json({
      message: 'Inscription réussie',
      user: result.user,
      token: result.token
    });
  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);
    res.status(400).json({
      error: error.message || 'Erreur lors de l\'inscription'
    });
  }
});

// Connexion
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email et mot de passe requis'
      });
    }

    const result = await authService.login(email, password);

    res.json({
      message: 'Connexion réussie',
      user: result.user,
      token: result.token
    });
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(401).json({
      error: error.message || 'Erreur lors de la connexion'
    });
  }
});

// Déconnexion
router.post('/logout', authenticate, async (req, res) => {
  try {
    await authService.logout(req.token);

    res.json({
      message: 'Déconnexion réussie'
    });
  } catch (error) {
    console.error('Erreur lors de la déconnexion:', error);
    res.status(500).json({
      error: 'Erreur lors de la déconnexion'
    });
  }
});

// Obtenir le profil de l'utilisateur connecté
router.get('/me', authenticate, async (req, res) => {
  try {
    res.json({
      user: req.user
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du profil:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération du profil'
    });
  }
});

// Changer son mot de passe
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        error: 'Ancien et nouveau mot de passe requis'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: 'Le nouveau mot de passe doit contenir au moins 8 caractères'
      });
    }

    await authService.changePassword(req.user.userId, oldPassword, newPassword);

    res.json({
      message: 'Mot de passe changé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors du changement de mot de passe:', error);
    res.status(400).json({
      error: error.message || 'Erreur lors du changement de mot de passe'
    });
  }
});

// Réinitialiser le mot de passe d'un utilisateur (admin uniquement)
router.post('/reset-password/:userId', authenticate, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({
        error: 'Nouveau mot de passe requis'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: 'Le nouveau mot de passe doit contenir au moins 8 caractères'
      });
    }

    await authService.resetPassword(userId, newPassword);

    res.json({
      message: 'Mot de passe réinitialisé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la réinitialisation du mot de passe:', error);
    res.status(400).json({
      error: error.message || 'Erreur lors de la réinitialisation du mot de passe'
    });
  }
});

// Nettoyer les sessions expirées (admin uniquement)
router.post('/clean-sessions', authenticate, requireAdmin, async (req, res) => {
  try {
    const count = await authService.cleanExpiredSessions();

    res.json({
      message: 'Nettoyage des sessions réussi',
      deletedCount: count
    });
  } catch (error) {
    console.error('Erreur lors du nettoyage des sessions:', error);
    res.status(500).json({
      error: 'Erreur lors du nettoyage des sessions'
    });
  }
});

export default router;