require('dotenv').config({ path: require('path').join(__dirname, '..', 'config', '.env') });
const axios = require('axios');
const FormData = require('form-data');

/**
 * Upload un fichier sur IPFS via Pinata
 * @param {Buffer} fileBuffer - Le buffer du fichier à uploader
 * @param {string} fileName - Le nom du fichier
 * @returns {Promise<{ipfsHash: string, ipfsUrl: string}>} - Le hash IPFS et l'URL
 */
async function uploadToIPFS(fileBuffer, fileName) {
  try {
    // Vérifier que le buffer et le nom de fichier sont fournis (validation en premier)
    if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
      throw new Error('fileBuffer doit être un Buffer valide');
    }

    if (!fileName || typeof fileName !== 'string') {
      throw new Error('fileName doit être une chaîne de caractères valide');
    }

    // Vérifier que le token Pinata est configuré
    const pinataJWT = process.env.PINATA_JWT;
    if (!pinataJWT) {
      throw new Error('PINATA_JWT n\'est pas configuré dans les variables d\'environnement');
    }

    // Créer un FormData pour l'upload multipart
    const formData = new FormData();
    
    // Ajouter le fichier au FormData
    // Pinata attend le fichier dans un champ nommé "file"
    formData.append('file', fileBuffer, {
      filename: fileName,
      contentType: 'application/octet-stream',
    });

    // Optionnel : ajouter des métadonnées
    const metadata = JSON.stringify({
      name: fileName,
    });
    formData.append('pinataMetadata', metadata);

    // Optionnel : options de pinning
    const pinataOptions = JSON.stringify({
      cidVersion: 0,
    });
    formData.append('pinataOptions', pinataOptions);

    // Faire la requête à l'API Pinata
    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      formData,
      {
        headers: {
          'Authorization': `Bearer ${pinataJWT}`,
          ...formData.getHeaders(),
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );

    // Vérifier la réponse
    if (!response.data || !response.data.IpfsHash) {
      throw new Error('Réponse Pinata invalide : hash IPFS manquant');
    }

    const ipfsHash = response.data.IpfsHash;
    const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;

    console.log(`[IPFS] Upload réussi - Hash: ${ipfsHash}, Fichier: ${fileName}`);

    return {
      ipfsHash,
      ipfsUrl,
    };
  } catch (error) {
    console.error(`[IPFS] Échec - Erreur lors de l'upload du fichier ${fileName}:`, error.message);
    
    // Gérer les erreurs spécifiques
    if (error.response) {
      // Erreur de réponse HTTP
      const status = error.response.status;
      const message = error.response.data?.error?.details || error.response.data?.error?.message || error.message;
      
      if (status === 401) {
        throw new Error('Token Pinata invalide ou expiré. Vérifiez votre PINATA_JWT.');
      } else if (status === 403) {
        throw new Error('Accès refusé par Pinata. Vérifiez les permissions de votre compte.');
      } else if (status === 429) {
        throw new Error('Limite de taux Pinata dépassée. Réessayez plus tard.');
      } else {
        throw new Error(`Erreur Pinata (${status}): ${message}`);
      }
    } else if (error.request) {
      // Erreur de requête (pas de réponse)
      throw new Error(`Impossible de contacter l'API Pinata: ${error.message}`);
    } else {
      // Autre erreur
      throw error;
    }
  }
}

module.exports = {
  uploadToIPFS,
};
