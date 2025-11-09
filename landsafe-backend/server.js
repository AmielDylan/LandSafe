require('dotenv').config({ path: require('path').join(__dirname, 'config', '.env') });
const express = require('express');
const cors = require('cors');
const { testConnection } = require('./config/db');

// Import des routes
const documentRoutes = require('./routes/documentRoutes');
const transmissionRoutes = require('./routes/transmissionRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Route de santé
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'LandSafe API is running',
    timestamp: new Date().toISOString(),
  });
});

// Routes API
app.use('/api/documents', documentRoutes);
app.use('/api/transmissions', transmissionRoutes);

// Route 404
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} non trouvée`,
  });
});

// Gestion des erreurs globales
app.use((err, req, res, next) => {
  console.error('Erreur non gérée:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'Une erreur inattendue s\'est produite',
    ...(process.env.NODE_ENV === 'development' && { details: err.message }),
  });
});

// Démarrage du serveur
async function startServer() {
  try {
    // Tester la connexion à la base de données
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('❌ Impossible de se connecter à la base de données');
      process.exit(1);
    }

    // Démarrer le serveur
    app.listen(PORT, () => {
      console.log(`\n🚀 Serveur LandSafe démarré sur le port ${PORT}`);
      console.log(`📡 API disponible sur http://localhost:${PORT}`);
      console.log(`🏥 Health check: http://localhost:${PORT}/health`);
      console.log(`📄 Documents API: http://localhost:${PORT}/api/documents`);
      console.log(`📤 Transmissions API: http://localhost:${PORT}/api/transmissions\n`);
    });
  } catch (error) {
    console.error('❌ Erreur lors du démarrage du serveur:', error);
    process.exit(1);
  }
}

startServer();



