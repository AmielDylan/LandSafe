// Blockchain utilities - to be implemented
// Cette fonction sera implémentée à l'étape 7

/**
 * Enregistre le hash d'un document sur la blockchain Polygon Mumbai
 * @param {string} ipfsHash - Le hash IPFS du document
 * @returns {Promise<string|null>} - Le hash de la transaction blockchain ou null
 */
async function recordDocumentHashOnChain(ipfsHash) {
  // TODO: Implémenter l'enregistrement sur Polygon Mumbai
  // Pour l'instant, retourner null (pas d'enregistrement blockchain)
  console.log(`[Mock] Enregistrement du hash IPFS ${ipfsHash} sur la blockchain (non implémenté)`);
  return null;
}

module.exports = {
  recordDocumentHashOnChain,
};



