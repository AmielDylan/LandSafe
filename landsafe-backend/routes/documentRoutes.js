const express = require('express');
const multer = require('multer');
const { authenticateToken } = require('../middleware/auth');
const { pool } = require('../config/db');
const { uploadToIPFS } = require('../utils/ipfs');
const { recordDocumentHashOnChain, verifyDocumentOnChain } = require('../utils/blockchain');
const { encryptFile, decryptFile, generateSecurePassword, hashPassword } = require('../utils/encryption');
const axios = require('axios');

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

    // 1. Récupérer ou générer le mot de passe
    const userPassword = req.body.password || generateSecurePassword();
    const isPasswordGenerated = !req.body.password;

    console.log('🔒 Chiffrement du document...');

    // 2. Chiffrer le fichier
    const fileBuffer = req.file.buffer;
    const fileName = req.file.originalname;
    
    let encryptionResult;
    try {
      encryptionResult = encryptFile(fileBuffer, userPassword);
      console.log('✅ Document chiffré');
      console.log('   Taille originale:', encryptionResult.metadata.originalSize, 'bytes');
      console.log('   Taille chiffrée:', encryptionResult.metadata.encryptedSize, 'bytes');
      console.log('   Algorithme:', encryptionResult.metadata.algorithm);
    } catch (encryptionError) {
      console.error('❌ Erreur lors du chiffrement:', encryptionError);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Échec du chiffrement du document',
        details: encryptionError.message,
      });
    }

    // 3. Upload du fichier CHIFFRÉ sur IPFS
    let ipfsHash, ipfsUrl;
    try {
      const ipfsResult = await uploadToIPFS(encryptionResult.encryptedBuffer, fileName);
      ipfsHash = ipfsResult.ipfsHash;
      ipfsUrl = ipfsResult.ipfsUrl;
      console.log('📤 Document chiffré uploadé sur IPFS:', ipfsHash);
    } catch (ipfsError) {
      console.error('Erreur lors de l\'upload IPFS:', ipfsError);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Échec de l\'upload sur IPFS',
        details: ipfsError.message,
      });
    }

    // Certification blockchain
    // Créer ou récupérer l'utilisateur dans la base de données avec un UUID valide
    let userId;
    const userCheckQuery = `SELECT id FROM users WHERE email = $1 LIMIT 1`;
    const userCheckResult = await pool.query(userCheckQuery, [req.user.email || 'test-api@landsafe.com']);
    
    if (userCheckResult.rows.length > 0) {
      userId = userCheckResult.rows[0].id;
      console.log('   Utilisation utilisateur existant:', userId);
    } else {
      // Créer un nouvel utilisateur
      const createUserQuery = `
        INSERT INTO users (email, nom, rôle)
        VALUES ($1, $2, $3)
        RETURNING id
      `;
      const createUserResult = await pool.query(createUserQuery, [
        req.user.email || 'test-api@landsafe.com',
        req.user.name || 'Test User',
        'proprietaire'
      ]);
      userId = createUserResult.rows[0].id;
      console.log('   Utilisateur créé:', userId);
    }
    
    let blockchainResult = null;
    let statut = 'en_attente';

    try {
      console.log('⛓️ Certification sur la blockchain...');
      blockchainResult = await recordDocumentHashOnChain(ipfsHash);
      
      console.log('✅ Document certifié sur blockchain');
      console.log('   Document ID:', blockchainResult.documentId);
      console.log('   Transaction:', blockchainResult.transactionHash);
      console.log('   Explorer:', blockchainResult.explorerUrl);
      
      statut = 'certifié';
    } catch (blockchainError) {
      console.error('❌ Erreur certification blockchain:', blockchainError.message);
      // On continue quand même, le document sera enregistré avec statut 'en_attente_certification'
      statut = 'en_attente_certification';
    }

    // Enregistrer le document en base de données
    let insertQuery;
    let values;

    if (blockchainResult) {
      // Enregistrement avec infos blockchain
      insertQuery = `
        INSERT INTO documents (
          user_id, titre, ipfs_hash, file_url, type, statut,
          blockchain_tx_hash, blockchain_document_id, blockchain_block_number, blockchain_network,
          is_encrypted, encryption_method
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id, statut, created_at, blockchain_tx_hash, blockchain_document_id, blockchain_block_number
      `;

      values = [
        userId,
        titre,
        ipfsHash,
        ipfsUrl,
        type,
        statut,
        blockchainResult.transactionHash,
        blockchainResult.documentId,
        blockchainResult.blockNumber,
        blockchainResult.network || 'polygon-amoy',
        true, // is_encrypted
        encryptionResult.metadata.algorithm, // encryption_method
      ];
    } else {
      // Enregistrement sans infos blockchain (certification échouée)
      insertQuery = `
        INSERT INTO documents (
          user_id, titre, ipfs_hash, file_url, type, statut,
          is_encrypted, encryption_method
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, statut, created_at
      `;

      values = [
        userId,
        titre,
        ipfsHash,
        ipfsUrl,
        type,
        statut,
        true, // is_encrypted
        encryptionResult.metadata.algorithm, // encryption_method
      ];
    }

    const result = await pool.query(insertQuery, values);
    const document = result.rows[0];

    // 4. Enregistrer métadonnées chiffrement en DB
    try {
      await pool.query(`
        INSERT INTO encryption_metadata (
          document_id, algorithm, key_derivation, 
          salt_length, iv_length, tag_length, password_hash
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        document.id,
        encryptionResult.metadata.algorithm,
        'scrypt',
        encryptionResult.metadata.saltLength,
        encryptionResult.metadata.ivLength,
        encryptionResult.metadata.tagLength,
        userPassword ? hashPassword(userPassword) : null
      ]);
      console.log('✅ Métadonnées de chiffrement enregistrées');
    } catch (encryptionMetaError) {
      console.error('⚠️ Erreur enregistrement métadonnées chiffrement:', encryptionMetaError);
      // Ne pas faire échouer la requête, mais logger l'erreur
    }

    // Préparer la réponse
    const response = {
      success: true,
      message: blockchainResult 
        ? 'Document uploadé et certifié avec succès' 
        : 'Document uploadé mais certification blockchain échouée',
      document: {
        id: document.id,
        titre: titre,
        ipfsHash: ipfsHash,
        ipfsUrl: ipfsUrl,
        type: type,
        statut: document.statut,
        created_at: document.created_at,
        is_encrypted: true,
        encryption_method: encryptionResult.metadata.algorithm,
      },
    };

    // Ajouter les infos blockchain si disponibles
    if (blockchainResult) {
      response.blockchain = {
        documentId: blockchainResult.documentId,
        transactionHash: blockchainResult.transactionHash,
        blockNumber: blockchainResult.blockNumber,
        explorerUrl: blockchainResult.explorerUrl,
        network: blockchainResult.network,
      };
    } else {
      response.warning = 'Certification blockchain échouée. Le document est enregistré mais non certifié.';
      response.blockchainError = 'Vérifiez votre solde POL et réessayez plus tard.';
    }

    // Ajouter les infos de chiffrement
    if (isPasswordGenerated) {
      response.encryption = {
        password: userPassword,  // ⚠️ IMPORTANT : l'user DOIT le sauvegarder
        warning: '⚠️ SAUVEGARDEZ CE MOT DE PASSE ! Il est nécessaire pour déchiffrer le document. Perte = document irrécupérable.',
        encrypted: true,
        algorithm: encryptionResult.metadata.algorithm,
      };
    } else {
      response.encryption = {
        encrypted: true,
        message: 'Document chiffré avec votre mot de passe',
        algorithm: encryptionResult.metadata.algorithm,
      };
    }

    res.status(201).json(response);
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
 * GET /api/documents/by-id/:id
 * Récupère un document spécifique par son ID avec vérification blockchain
 * 
 * Params:
 * - id: UUID du document
 */
router.get('/by-id/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user.uid;

    // Récupérer le document
    const query = `
      SELECT 
        id,
        user_id,
        titre,
        ipfs_hash,
        file_url,
        type,
        statut,
        blockchain_tx_hash,
        blockchain_document_id,
        blockchain_block_number,
        blockchain_network,
        created_at
      FROM documents
      WHERE id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Document non trouvé',
      });
    }

    const document = result.rows[0];

    // Vérifier les permissions
    if (document.user_id !== currentUserId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Vous n\'avez pas accès à ce document',
      });
    }

    // Vérification blockchain en temps réel si le document est certifié
    if (document.blockchain_document_id) {
      try {
        const blockchainVerif = await verifyDocumentOnChain(document.blockchain_document_id);
        
        document.blockchainVerification = {
          verified: blockchainVerif.exists,
          onChainOwner: blockchainVerif.owner,
          certificationDate: blockchainVerif.certificationDate,
          ipfsHashMatches: blockchainVerif.ipfsHash === document.ipfs_hash,
          timestamp: blockchainVerif.timestamp,
        };

        if (document.blockchain_tx_hash) {
          document.blockchainVerification.explorerUrl = 
            `https://amoy.polygonscan.com/tx/${document.blockchain_tx_hash}`;
        }
      } catch (error) {
        console.error('Erreur vérification blockchain:', error);
        document.blockchainVerification = {
          verified: false,
          error: error.message,
        };
      }
    }

    res.json(document);
  } catch (error) {
    console.error('Erreur lors de la récupération du document:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Erreur lors de la récupération du document',
      details: error.message,
    });
  }
});

/**
 * GET /api/documents/verify-blockchain/:id
 * Vérifie un document sur la blockchain
 * 
 * Params:
 * - id: UUID du document
 */
router.get('/verify-blockchain/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user.uid;

    // Récupérer le document
    const query = `
      SELECT 
        blockchain_document_id, 
        ipfs_hash,
        blockchain_tx_hash,
        user_id
      FROM documents 
      WHERE id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Document non trouvé',
      });
    }

    const doc = result.rows[0];

    // Vérifier les permissions
    if (doc.user_id !== currentUserId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Vous n\'avez pas accès à ce document',
      });
    }

    if (!doc.blockchain_document_id) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Document non certifié sur la blockchain',
      });
    }

    // Vérifier sur la blockchain
    const verification = await verifyDocumentOnChain(doc.blockchain_document_id);

    const response = {
      success: true,
      verified: verification.exists,
      documentId: doc.blockchain_document_id,
      ipfsHash: verification.ipfsHash,
      owner: verification.owner,
      certificationDate: verification.certificationDate,
      timestamp: verification.timestamp,
      ipfsHashMatches: verification.ipfsHash === doc.ipfs_hash,
    };

    if (doc.blockchain_tx_hash) {
      response.explorerUrl = `https://amoy.polygonscan.com/tx/${doc.blockchain_tx_hash}`;
    }

    res.json(response);
  } catch (error) {
    console.error('Erreur vérification blockchain:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Erreur lors de la vérification blockchain',
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
    const currentUserEmail = req.user.email || 'test-api@landsafe.com';

    // Récupérer l'UUID de l'utilisateur depuis la base de données
    const userQuery = `SELECT id FROM users WHERE email = $1 LIMIT 1`;
    const userResult = await pool.query(userQuery, [currentUserEmail]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Utilisateur non trouvé dans la base de données',
      });
    }
    
    const currentUserId = userResult.rows[0].id;

    // Vérifier que l'utilisateur demande ses propres documents
    // Si userId est un UUID, comparer directement
    // Sinon, utiliser l'UUID de l'utilisateur actuel
    let targetUserId = userId;
    
    // Si userId n'est pas un UUID valide, utiliser l'UUID de l'utilisateur actuel
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      targetUserId = currentUserId;
    }
    
    if (targetUserId !== currentUserId) {
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
        blockchain_tx_hash,
        blockchain_document_id,
        blockchain_block_number,
        blockchain_network,
        created_at
      FROM documents
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;

    const result = await pool.query(query, [currentUserId]);

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

/**
 * POST /api/documents/download/:id
 * Télécharge et déchiffre un document
 * 
 * Params:
 * - id: UUID du document
 * 
 * Body (JSON):
 * - password: Mot de passe pour déchiffrer le document
 */
router.post('/download/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    const currentUserEmail = req.user.email || 'test-api@landsafe.com';

    if (!password) {
      return res.status(400).json({ 
        error: 'Bad Request',
        message: 'Mot de passe requis pour déchiffrer le document' 
      });
    }

    // Récupérer l'UUID de l'utilisateur depuis la base de données
    const userQuery = `SELECT id FROM users WHERE email = $1 LIMIT 1`;
    const userResult = await pool.query(userQuery, [currentUserEmail]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Utilisateur non trouvé dans la base de données',
      });
    }
    
    const currentUserId = userResult.rows[0].id;

    // Récupérer le document
    const docResult = await pool.query(`
      SELECT d.*, e.password_hash 
      FROM documents d
      LEFT JOIN encryption_metadata e ON d.id = e.document_id
      WHERE d.id = $1 AND d.user_id = $2
    `, [id, currentUserId]);

    if (docResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Not Found',
        message: 'Document non trouvé' 
      });
    }

    const document = docResult.rows[0];

    if (!document.is_encrypted) {
      return res.status(400).json({ 
        error: 'Bad Request',
        message: 'Document non chiffré (ancien document?)' 
      });
    }

    // Télécharger depuis IPFS
    console.log('📥 Téléchargement depuis IPFS:', document.ipfs_hash);
    const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${document.ipfs_hash}`;
    
    let ipfsResponse;
    try {
      ipfsResponse = await axios.get(ipfsUrl, { 
        responseType: 'arraybuffer',
        timeout: 30000
      });
    } catch (ipfsError) {
      console.error('❌ Erreur téléchargement IPFS:', ipfsError.message);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Impossible de télécharger le document depuis IPFS',
        details: ipfsError.message
      });
    }

    const encryptedBuffer = Buffer.from(ipfsResponse.data);

    // Déchiffrer
    console.log('🔓 Déchiffrement du document...');
    let decryptionResult;
    try {
      decryptionResult = decryptFile(encryptedBuffer, password);
      console.log('✅ Document déchiffré');
    } catch (decryptError) {
      console.error('❌ Erreur déchiffrement:', decryptError.message);
      
      if (decryptError.message.includes('Mot de passe incorrect')) {
        return res.status(401).json({ 
          error: 'Unauthorized',
          message: 'Mot de passe incorrect',
          hint: 'Vérifiez votre mot de passe et réessayez'
        });
      }
      
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Erreur lors du déchiffrement',
        details: decryptError.message
      });
    }

    // Déterminer le Content-Type
    const contentType = document.type || 'application/octet-stream';

    // Retourner le fichier déchiffré
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${document.titre}"`);
    res.setHeader('Content-Length', decryptionResult.decryptedBuffer.length);
    res.send(decryptionResult.decryptedBuffer);

  } catch (error) {
    console.error('❌ Erreur téléchargement:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: 'Erreur lors du téléchargement',
      details: error.message 
    });
  }
});

module.exports = router;



