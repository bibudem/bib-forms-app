// backend/src/middleware/authMiddleware.js
import authService from '../services/authService.js';

// Middleware pour vérifier l'authentification
export const authenticate = async (req, res, next) => {
  try {
    // Récupérer le token depuis l'header Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Token d\'authentification manquant'
      });
    }

    const token = authHeader.substring(7); // Enlever 'Bearer '

    // Vérifier le token
    const user = await authService.verifyToken(token);

    // Ajouter l'utilisateur à la requête
    req.user = user;
    req.token = token;

    next();
  } catch (error) {
    console.error('Erreur d\'authentification:', error);
    return res.status(401).json({
      error: 'Token invalide ou expiré',
      details: error.message
    });
  }
};

// Middleware pour vérifier le rôle admin
export const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentification requise'
      });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Accès refusé: droits administrateur requis'
      });
    }

    next();
  } catch (error) {
    console.error('Erreur de vérification admin:', error);
    return res.status(500).json({
      error: 'Erreur lors de la vérification des droits'
    });
  }
};

// Middleware pour vérifier un rôle spécifique
export const requireRole = (roles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentification requise'
        });
      }

      const allowedRoles = Array.isArray(roles) ? roles : [roles];

      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          error: 'Accès refusé: rôle insuffisant'
        });
      }

      next();
    } catch (error) {
      console.error('Erreur de vérification de rôle:', error);
      return res.status(500).json({
        error: 'Erreur lors de la vérification des droits'
      });
    }
  };
};

// Middleware optionnel: ajoute l'utilisateur s'il est authentifié, sinon continue
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        const user = await authService.verifyToken(token);
        req.user = user;
        req.token = token;
      } catch (error) {
        // Token invalide, mais on continue quand même
        console.log('Token invalide dans optionalAuth, ignoré');
      }
    }

    next();
  } catch (error) {
    console.error('Erreur dans optionalAuth:', error);
    next();
  }
};