const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { pool } = require('../config/db');
const { recordDocumentHashOnChain, verifyDocumentOnChain } = require('../utils/blockchain');

const router = express.Router();

/**
 * POST /api/transmissions
 * Crée une nouvelle transmission de document
 * 
 * Body (JSON):
 * - document_id: UUID du document
 * - héritiers_json: objet JSON avec les informations des héritiers
 * - video_url: URL de la vidéo de transmission (optionnel)
 * - gps_lat: latitude GPS (optionnel)
 * - gps_long: longitude GPS (optionnel)
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { document_id, héritiers_json, video_url, gps_lat, gps_long } = req.body;

    // Vérifier que les champs requis sont présents
    if (!document_id) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Le champ "document_id" est requis',
      });
    }

    // Vérifier que le document existe et appartient à l'utilisateur
    const documentCheckQuery = `
      SELECT id, user_id, ipfs_hash
      FROM documents
      WHERE id = $1
    `;
    const documentResult = await pool.query(documentCheckQuery, [document_id]);

    if (documentResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Document non trouvé',
      });
    }

    const document = documentResult.rows[0];
    const currentUserId = req.user.uid;

    // Vérifier que l'utilisateur est propriétaire du document
    // TODO: Vérifier les droits admin/notaire depuis la base de données
    if (document.user_id !== currentUserId) {
      // Pour l'instant, seul le propriétaire peut créer une transmission
      // On pourra ajouter une vérification de rôle depuis la base de données plus tard
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Vous n\'avez pas accès à ce document',
      });
    }

    // Valider et formater héritiers_json
    let héritiersJsonb = null;
    if (héritiers_json) {
      try {
        // S'assurer que c'est un objet JSON valide
        héritiersJsonb = typeof héritiers_json === 'string' 
          ? JSON.parse(héritiers_json) 
          : héritiers_json;
      } catch (jsonError) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Le champ "héritiers_json" doit être un JSON valide',
        });
      }
    }

    // Valider et formater witnesses (optionnel)
    let witnessesJsonb = null;
    if (req.body.witnesses) {
      try {
        witnessesJsonb = typeof req.body.witnesses === 'string'
          ? JSON.parse(req.body.witnesses)
          : req.body.witnesses;
      } catch (jsonError) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Le champ "witnesses" doit être un JSON valide',
        });
      }
    }

    // Valider les coordonnées GPS si fournies
    let gpsLat = null;
    let gpsLong = null;
    if (gps_lat !== undefined || gps_long !== undefined) {
      if (gps_lat === undefined || gps_long === undefined) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Les coordonnées GPS doivent être fournies ensemble (gps_lat et gps_long)',
        });
      }
      gpsLat = parseFloat(gps_lat);
      gpsLong = parseFloat(gps_long);
      
      if (isNaN(gpsLat) || isNaN(gpsLong)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Les coordonnées GPS doivent être des nombres valides',
        });
      }
    }

    // Enregistrer la transmission en base de données
    const insertQuery = `
      INSERT INTO transmissions (
        document_id,
        héritiers_json,
        video_url,
        witnesses,
        gps_lat,
        gps_long,
        hash_blockchain
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, created_at, hash_blockchain
    `;

    // Initialiser hash_blockchain à null, sera mis à jour si l'enregistrement blockchain réussit
    let hashBlockchain = null;

    const result = await pool.query(insertQuery, [
      document_id,
      héritiersJsonb ? JSON.stringify(héritiersJsonb) : null,
      video_url || null,
      witnessesJsonb ? JSON.stringify(witnessesJsonb) : null,
      gpsLat,
      gpsLong,
      hashBlockchain,
    ]);

    const transmission = result.rows[0];

    // Optionnel : Enregistrer le hash sur la blockchain si le document n'est pas déjà certifié
    // Note: Le document devrait déjà être certifié lors de l'upload, mais on peut vérifier
    if (document.ipfs_hash) {
      try {
        // Vérifier d'abord si le document est déjà certifié
        // Si oui, on peut utiliser le hash_blockchain existant du document
        const docCheckQuery = `
          SELECT blockchain_tx_hash, blockchain_document_id
          FROM documents
          WHERE id = $1
        `;
        const docCheckResult = await pool.query(docCheckQuery, [document_id]);
        
        if (docCheckResult.rows[0]?.blockchain_tx_hash) {
          // Le document est déjà certifié, utiliser son hash
          hashBlockchain = docCheckResult.rows[0].blockchain_tx_hash;
          console.log('📋 Document déjà certifié, utilisation du hash existant');
        } else {
          // Le document n'est pas certifié, on peut le certifier maintenant
          console.log('⛓️ Certification du document pour la transmission...');
          const blockchainResult = await recordDocumentHashOnChain(document.ipfs_hash);
          hashBlockchain = blockchainResult.transactionHash;
          
          // Mettre à jour la transmission avec le hash blockchain
          const updateQuery = `
            UPDATE transmissions
            SET hash_blockchain = $1
            WHERE id = $2
            RETURNING hash_blockchain
          `;
          const updateResult = await pool.query(updateQuery, [hashBlockchain, transmission.id]);
          hashBlockchain = updateResult.rows[0].hash_blockchain;
          console.log('✅ Transmission mise à jour avec hash blockchain:', hashBlockchain);
        }
      } catch (blockchainError) {
        console.error('❌ Erreur lors de l\'enregistrement blockchain:', blockchainError.message);
        // Ne pas faire échouer la requête si l'enregistrement blockchain échoue
        // La transmission est déjà créée en base
      }
    }

    // Retourner la réponse
    res.status(201).json({
      transmissionId: transmission.id,
      created_at: transmission.created_at,
      hash_blockchain: hashBlockchain || transmission.hash_blockchain,
      statut: 'created',
    });
  } catch (error) {
    console.error('Erreur lors de la création de la transmission:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Erreur lors de la création de la transmission',
      details: error.message,
    });
  }
});

/**
 * GET /api/transmissions/:id
 * Récupère les détails d'une transmission par son ID
 * 
 * Params:
 * - id: UUID de la transmission
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Récupérer la transmission avec les informations du document
    const query = `
      SELECT 
        t.id,
        t.document_id,
        t.héritiers_json,
        t.video_url,
        t.witnesses,
        t.gps_lat,
        t.gps_long,
        t.hash_blockchain,
        t.created_at,
        d.titre as document_titre,
        d.ipfs_hash as document_ipfs_hash,
        d.user_id as document_user_id,
        d.type as document_type,
        d.statut as document_statut
      FROM transmissions t
      INNER JOIN documents d ON t.document_id = d.id
      WHERE t.id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Transmission non trouvée',
      });
    }

    const transmission = result.rows[0];
    const currentUserId = req.user.uid;

    // Vérifier que l'utilisateur a accès à cette transmission
    // TODO: Vérifier les droits admin/notaire depuis la base de données
    if (transmission.document_user_id !== currentUserId) {
      // Pour l'instant, seul le propriétaire peut accéder à la transmission
      // On pourra ajouter une vérification de rôle depuis la base de données plus tard
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Vous n\'avez pas accès à cette transmission',
      });
    }

    res.json({
      transmission: {
        id: transmission.id,
        document_id: transmission.document_id,
        document: {
          titre: transmission.document_titre,
          ipfs_hash: transmission.document_ipfs_hash,
          type: transmission.document_type,
          statut: transmission.document_statut,
        },
        héritiers_json: transmission.héritiers_json,
        video_url: transmission.video_url,
        witnesses: transmission.witnesses,
        gps: {
          lat: transmission.gps_lat,
          long: transmission.gps_long,
        },
        hash_blockchain: transmission.hash_blockchain,
        created_at: transmission.created_at,
      },
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de la transmission:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Erreur lors de la récupération de la transmission',
      details: error.message,
    });
  }
});

module.exports = router;



