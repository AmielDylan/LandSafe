const crypto = require('crypto');

// Configuration
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;      // 256 bits
const IV_LENGTH = 16;       // 128 bits
const SALT_LENGTH = 64;     // 512 bits
const TAG_LENGTH = 16;      // 128 bits

/**
 * Dérive une clé de chiffrement à partir d'un mot de passe
 */
function deriveKey(password, salt) {
  return crypto.scryptSync(password, salt, KEY_LENGTH);
}

/**
 * Chiffre un fichier avec AES-256-GCM
 * @param {Buffer} fileBuffer - Contenu du fichier
 * @param {string} userPassword - Mot de passe utilisateur
 * @returns {Object} - Fichier chiffré + métadonnées
 */
function encryptFile(fileBuffer, userPassword) {
  try {
    // Générer salt et IV aléatoires
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Dériver la clé
    const key = deriveKey(userPassword, salt);
    
    // Créer le cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    // Chiffrer
    const encryptedData = Buffer.concat([
      cipher.update(fileBuffer),
      cipher.final()
    ]);
    
    // Récupérer le tag d'authentification
    const authTag = cipher.getAuthTag();
    
    // Combiner : [salt][iv][authTag][données]
    const encryptedFile = Buffer.concat([
      salt,
      iv,
      authTag,
      encryptedData
    ]);
    
    return {
      success: true,
      encryptedBuffer: encryptedFile,
      metadata: {
        algorithm: ALGORITHM,
        saltLength: SALT_LENGTH,
        ivLength: IV_LENGTH,
        tagLength: TAG_LENGTH,
        originalSize: fileBuffer.length,
        encryptedSize: encryptedFile.length
      }
    };
    
  } catch (error) {
    console.error('❌ Erreur chiffrement:', error);
    throw new Error(`Erreur de chiffrement: ${error.message}`);
  }
}

/**
 * Déchiffre un fichier
 * @param {Buffer} encryptedBuffer - Fichier chiffré complet
 * @param {string} userPassword - Mot de passe
 * @returns {Buffer} - Fichier déchiffré
 */
function decryptFile(encryptedBuffer, userPassword) {
  try {
    // Extraire les composants
    let offset = 0;
    
    const salt = encryptedBuffer.slice(offset, offset + SALT_LENGTH);
    offset += SALT_LENGTH;
    
    const iv = encryptedBuffer.slice(offset, offset + IV_LENGTH);
    offset += IV_LENGTH;
    
    const authTag = encryptedBuffer.slice(offset, offset + TAG_LENGTH);
    offset += TAG_LENGTH;
    
    const encryptedData = encryptedBuffer.slice(offset);
    
    // Dériver la clé
    const key = deriveKey(userPassword, salt);
    
    // Créer le decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    // Déchiffrer
    const decryptedData = Buffer.concat([
      decipher.update(encryptedData),
      decipher.final()
    ]);
    
    return {
      success: true,
      decryptedBuffer: decryptedData
    };
    
  } catch (error) {
    console.error('❌ Erreur déchiffrement:', error);
    
    if (error.message.includes('Unsupported state') || 
        error.message.includes('authenticate')) {
      throw new Error('Mot de passe incorrect ou fichier corrompu');
    }
    
    throw new Error(`Erreur de déchiffrement: ${error.message}`);
  }
}

/**
 * Génère un mot de passe sécurisé aléatoire
 */
function generateSecurePassword() {
  return crypto.randomBytes(32).toString('base64');
}

/**
 * Hash un mot de passe pour stockage DB
 */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Vérifie un mot de passe
 */
function verifyPassword(password, storedHash) {
  try {
    const [salt, hash] = storedHash.split(':');
    const derivedHash = crypto.scryptSync(password, salt, 64).toString('hex');
    return hash === derivedHash;
  } catch {
    return false;
  }
}

module.exports = {
  encryptFile,
  decryptFile,
  generateSecurePassword,
  hashPassword,
  verifyPassword
};

