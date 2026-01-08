// backend/src/services/authService.js
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const SALT_ROUNDS = 10;

class AuthService {
  // Inscription d'un nouvel utilisateur
  async register(email, password, role = 'client') {
    try {
      // Vérifier si l'email existe déjà
      const existingUser = await query(
        'SELECT id FROM profiles WHERE email = $1',
        [email]
      );

      if (existingUser.rows.length > 0) {
        throw new Error('Cet email est déjà utilisé');
      }

      // Hasher le mot de passe
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      // Créer l'utilisateur
      const result = await query(
        `INSERT INTO profiles (email, password_hash, role) 
         VALUES ($1, $2, $3) 
         RETURNING id, email, role, created_at`,
        [email, passwordHash, role]
      );

      const user = result.rows[0];

      // Créer une session
      const token = await this.createSession(user.id);

      return {
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        },
        token
      };
    } catch (error) {
      console.error('Erreur lors de l\'inscription:', error);
      throw error;
    }
  }

  // Connexion d'un utilisateur
  async login(email, password) {
    try {
      // Récupérer l'utilisateur
      const result = await query(
        'SELECT id, email, password_hash, role FROM profiles WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        throw new Error('Email ou mot de passe incorrect');
      }

      const user = result.rows[0];

      // Vérifier le mot de passe
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);

      if (!isPasswordValid) {
        throw new Error('Email ou mot de passe incorrect');
      }

      // Créer une session
      const token = await this.createSession(user.id);

      return {
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        },
        token
      };
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
      throw error;
    }
  }

  // Créer une session
  async createSession(userId) {
    try {
      const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 jours

      await query(
        'INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [userId, token, expiresAt]
      );

      return token;
    } catch (error) {
      console.error('Erreur lors de la création de session:', error);
      throw error;
    }
  }

  // Vérifier un token
  async verifyToken(token) {
    try {
      // Vérifier le JWT
      const decoded = jwt.verify(token, JWT_SECRET);

      // Vérifier que la session existe et n'est pas expirée
      const result = await query(
        `SELECT s.id, s.user_id, p.email, p.role 
         FROM sessions s
         JOIN profiles p ON s.user_id = p.id
         WHERE s.token = $1 AND s.expires_at > NOW()`,
        [token]
      );

      if (result.rows.length === 0) {
        throw new Error('Session invalide ou expirée');
      }

      return {
        userId: result.rows[0].user_id,
        email: result.rows[0].email,
        role: result.rows[0].role
      };
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Token invalide');
      }
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token expiré');
      }
      throw error;
    }
  }

  // Déconnexion
  async logout(token) {
    try {
      await query('DELETE FROM sessions WHERE token = $1', [token]);
      return true;
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      throw error;
    }
  }

  // Nettoyer les sessions expirées
  async cleanExpiredSessions() {
    try {
      const result = await query('DELETE FROM sessions WHERE expires_at < NOW()');
      console.log(`${result.rowCount} sessions expirées supprimées`);
      return result.rowCount;
    } catch (error) {
      console.error('Erreur lors du nettoyage des sessions:', error);
      throw error;
    }
  }

  // Changer le mot de passe
  async changePassword(userId, oldPassword, newPassword) {
    try {
      // Récupérer le hash actuel
      const result = await query(
        'SELECT password_hash FROM profiles WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        throw new Error('Utilisateur non trouvé');
      }

      // Vérifier l'ancien mot de passe
      const isPasswordValid = await bcrypt.compare(
        oldPassword,
        result.rows[0].password_hash
      );

      if (!isPasswordValid) {
        throw new Error('Ancien mot de passe incorrect');
      }

      // Hasher le nouveau mot de passe
      const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

      // Mettre à jour
      await query(
        'UPDATE profiles SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [newPasswordHash, userId]
      );

      // Invalider toutes les sessions de l'utilisateur sauf la courante
      await query('DELETE FROM sessions WHERE user_id = $1', [userId]);

      return true;
    } catch (error) {
      console.error('Erreur lors du changement de mot de passe:', error);
      throw error;
    }
  }

  // Réinitialiser le mot de passe (admin uniquement)
  async resetPassword(userId, newPassword) {
    try {
      const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
      
      await query(
        'UPDATE profiles SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [passwordHash, userId]
      );

      // Invalider toutes les sessions de l'utilisateur
      await query('DELETE FROM sessions WHERE user_id = $1', [userId]);

      return true;
    } catch (error) {
      console.error('Erreur lors de la réinitialisation du mot de passe:', error);
      throw error;
    }
  }
}

export default new AuthService();