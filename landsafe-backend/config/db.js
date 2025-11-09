require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { Pool } = require('pg');

// Configuration de la connexion PostgreSQL
const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || '',
  database: process.env.PGDATABASE || 'landsafe',
  port: process.env.PGPORT || 5432,
});

// Test de connexion au démarrage
pool.on('connect', () => {
  console.log('✅ Connexion PostgreSQL établie avec succès');
});

pool.on('error', (err) => {
  console.error('❌ Erreur de connexion PostgreSQL:', err.message);
  process.exit(-1);
});

// Fonction pour tester la connexion
const testConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✅ Test de connexion PostgreSQL réussi:', result.rows[0].now);
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Erreur lors du test de connexion PostgreSQL:', error.message);
    return false;
  }
};

module.exports = {
  pool,
  testConnection,
};



