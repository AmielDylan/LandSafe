require('dotenv').config({ path: require('path').join(__dirname, '..', 'config', '.env') });
const admin = require('firebase-admin');

// Initialisation de Firebase Admin (si pas déjà initialisé)
if (!admin.apps.length) {
  try {
    // Option 1 : Utiliser les variables d'environnement
    if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        }),
      });
      console.log('✅ Firebase Admin initialisé avec les variables d\'environnement');
    }
    // Option 2 : Utiliser un fichier de service account (si disponible)
    else {
      const serviceAccount = require('../config/firebase-service-account.json');
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('✅ Firebase Admin initialisé avec le fichier service account');
    }
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation de Firebase Admin:', error.message);
    console.warn('⚠️  Le middleware d\'authentification ne fonctionnera pas correctement');
  }
}

/**
 * Middleware d'authentification Firebase
 * Vérifie le token JWT Firebase et charge les informations utilisateur dans req.user
 */
const authenticateToken = async (req, res, next) => {
  try {
    // Vérifier que Firebase Admin est initialisé
    if (!admin.apps.length) {
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Firebase Admin n\'est pas initialisé. Vérifiez la configuration.',
      });
    }

    // Récupérer le token depuis le header Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token d\'authentification manquant. Format attendu: Bearer <token>',
      });
    }

    // Extraire le token (enlever "Bearer ")
    const token = authHeader.split('Bearer ')[1];

    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token d\'authentification invalide',
      });
    }

    // Vérifier et décoder le token avec Firebase Admin
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Charger les informations utilisateur dans req.user
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
      name: decodedToken.name || null,
      picture: decodedToken.picture || null,
      firebaseClaims: decodedToken,
    };

    // Passer au middleware suivant
    next();
  } catch (error) {
    console.error('Erreur d\'authentification:', error.message);

    // Gérer les différents types d'erreurs Firebase
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token expiré. Veuillez vous reconnecter.',
      });
    }

    if (error.code === 'auth/id-token-revoked') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token révoqué. Veuillez vous reconnecter.',
      });
    }

    if (error.code === 'auth/argument-error') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token invalide ou malformé.',
      });
    }

    // Erreur générique
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Échec de l\'authentification. Token invalide ou expiré.',
    });
  }
};

/**
 * Middleware optionnel pour vérifier si l'utilisateur est authentifié
 * (utilisé pour les routes qui nécessitent une authentification mais avec gestion d'erreur différente)
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1];
      if (token) {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = {
          uid: decodedToken.uid,
          email: decodedToken.email,
          emailVerified: decodedToken.email_verified,
          name: decodedToken.name || null,
          picture: decodedToken.picture || null,
          firebaseClaims: decodedToken,
        };
      }
    }
    next();
  } catch (error) {
    // En cas d'erreur, on continue sans authentification (req.user sera undefined)
    next();
  }
};

module.exports = {
  authenticateToken,
  optionalAuth,
};



