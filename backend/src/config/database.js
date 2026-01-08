// backend/src/config/database.js
import pg from 'pg';
const { Pool } = pg;

// Configuration de la connexion PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'db-bibforms',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20, // Nombre maximum de clients dans le pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Vérification de la connexion au démarrage
pool.on('connect', () => {
  console.log('✅ Connexion PostgreSQL établie');
});

pool.on('error', (err) => {
  console.error('❌ Erreur PostgreSQL inattendue:', err);
  process.exit(-1);
});

// Helper pour exécuter des requêtes
export const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Requête exécutée', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Erreur lors de l\'exécution de la requête:', error);
    throw error;
  }
};

// Helper pour obtenir un client du pool (pour les transactions)
export const getClient = async () => {
  const client = await pool.connect();
  const query = client.query.bind(client);
  const release = client.release.bind(client);
  
  // Wrapper pour faciliter les transactions
  const releaseWithLog = () => {
    console.log('Client PostgreSQL libéré');
    release();
  };
  
  client.query = query;
  client.release = releaseWithLog;
  
  return client;
};

// Fonction pour tester la connexion
export const testConnection = async () => {
  try {
    const result = await query('SELECT NOW()');
    console.log('✅ Test de connexion réussi:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('❌ Test de connexion échoué:', error);
    return false;
  }
};

// Fermeture propre du pool
export const closePool = async () => {
  await pool.end();
  console.log('Pool PostgreSQL fermé');
};

export default pool;