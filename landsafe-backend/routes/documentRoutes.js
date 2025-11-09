const express = require('express');
const multer = require('multer');
const { authenticateToken } = require('../middleware/auth');
const { pool } = require('../config/db');
const { uploadToIPFS } = require('../utils/ipfs');

const router = express.Router();

// Configuration de Multer pour gérer les uploads de fichiers
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB max
  },
  fileFilter: (req, file, cb) => {
    // Accepter tous les types de fichiers pour l'instant
    // Vous pouvez ajouter une validation de type si nécessaire
    cb(null, true);
  },
});

/**
 * POST /api/documents/upload-document
 * Upload un document, le stocke sur IPFS et enregistre les métadonnées en base
 * 
 * Body (multipart/form-data):
 * - file: fichier à uploader
 * - titre: titre du document
 * - type: type de document (titre_foncier, succession, autre)
 */
router.post('/upload-document', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    // Vérifier que le fichier est présent
    if (!req.file) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Aucun fichier fourni',
      });
    }

    // Vérifier que les champs requis sont présents
    const { titre, type } = req.body;
    if (!titre || !type) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Les champs "titre" et "type" sont requis',
      });
    }

    // Valider le type de document
    const validTypes = ['titre_foncier', 'succession', 'autre'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Type de document invalide. Types acceptés: ${validTypes.join(', ')}`,
      });
    }

    // Upload du fichier sur IPFS
    const fileBuffer = req.file.buffer;
    const fileName = req.file.originalname;
    
    let ipfsHash, ipfsUrl;
    try {
      const ipfsResult = await uploadToIPFS(fileBuffer, fileName);
      ipfsHash = ipfsResult.ipfsHash;
      ipfsUrl = ipfsResult.ipfsUrl;
    } catch (ipfsError) {
      console.error('Erreur lors de l\'upload IPFS:', ipfsError);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Échec de l\'upload sur IPFS',
        details: ipfsError.message,
      });
    }

    // Enregistrer le document en base de données
    const userId = req.user.uid; // Utiliser l'UID Firebase comme identifiant
    const statut = 'en_attente';

    const insertQuery = `
      INSERT INTO documents (user_id, titre, ipfs_hash, file_url, type, statut)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, statut, created_at
    `;

    const result = await pool.query(insertQuery, [
      userId,
      titre,
      ipfsHash,
      ipfsUrl,
      type,
      statut,
    ]);

    const document = result.rows[0];

    // Retourner la réponse
    res.status(201).json({
      documentId: document.id,
      ipfsUrl: ipfsUrl,
      statut: document.statut,
      created_at: document.created_at,
    });
  } catch (error) {
    console.error('Erreur lors de l\'upload du document:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Erreur lors de l\'enregistrement du document',
      details: error.message,
    });
  }
});

/**
 * GET /api/documents/:userId
 * Récupère tous les documents d'un utilisateur
 * 
 * Params:
 * - userId: UUID de l'utilisateur
 */
router.get('/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.uid;

    // Vérifier que l'utilisateur demande ses propres documents
    // TODO: Vérifier les droits admin/notaire depuis la base de données
    if (userId !== currentUserId) {
      // Pour l'instant, seul le propriétaire peut accéder à ses documents
      // On pourra ajouter une vérification de rôle depuis la base de données plus tard
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Vous n\'avez pas accès aux documents de cet utilisateur',
      });
    }

    // Récupérer les documents de l'utilisateur
    const query = `
      SELECT 
        id,
        user_id,
        titre,
        ipfs_hash,
        file_url,
        type,
        statut,
        created_at
      FROM documents
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;

    const result = await pool.query(query, [userId]);

    res.json({
      documents: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des documents:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Erreur lors de la récupération des documents',
      details: error.message,
    });
  }
});

module.exports = router;



