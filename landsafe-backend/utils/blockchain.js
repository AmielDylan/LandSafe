require('dotenv').config({ path: require('path').join(__dirname, '..', 'config', '.env') });
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Charger l'ABI depuis le fichier généré
const CONTRACT_ABI = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../config/DocumentCertifier-ABI.json'), 'utf8')
);

// Charger les infos de déploiement
let deploymentInfo = null;
try {
  deploymentInfo = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../config/contract-deployment.json'), 'utf8')
  );
} catch (error) {
  console.warn('⚠️  Fichier contract-deployment.json non trouvé, utilisation de CONTRACT_ADDRESS depuis .env');
}

// Configuration
const RPC_URL = process.env.POLYGON_TESTNET_RPC_URL || 'https://rpc-amoy.polygon.technology/';
const CHAIN_ID = 80002;
const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || (deploymentInfo?.address);

// Timeout pour les appels RPC (30 secondes)
const RPC_TIMEOUT = 30000;

/**
 * Initialise la connexion à la blockchain
 * @returns {Promise<{provider: ethers.Provider, wallet: ethers.Wallet, contract: ethers.Contract}>}
 */
async function initBlockchain() {
  if (!PRIVATE_KEY) {
    throw new Error('WALLET_PRIVATE_KEY n\'est pas configuré dans le fichier .env');
  }

  if (!CONTRACT_ADDRESS) {
    throw new Error('CONTRACT_ADDRESS n\'est pas configuré. Vérifiez votre .env ou contract-deployment.json');
  }

  // Créer le provider avec timeout
  const provider = new ethers.JsonRpcProvider(RPC_URL, {
    name: 'Polygon Amoy',
    chainId: CHAIN_ID,
  });

  // Créer le wallet
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  // Créer l'instance du contrat
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);

  return { provider, wallet, contract };
}

/**
 * Enregistre le hash d'un document sur la blockchain Polygon Amoy
 * @param {string} ipfsHash - Le hash IPFS du document
 * @returns {Promise<Object>} - Informations complètes de la transaction
 */
async function recordDocumentHashOnChain(ipfsHash) {
  try {
    // Validation de l'input
    if (!ipfsHash || typeof ipfsHash !== 'string' || ipfsHash.trim().length === 0) {
      throw new Error('Le hash IPFS est invalide ou vide');
    }

    console.log(`🔗 [Blockchain] Certification du document IPFS: ${ipfsHash}`);

    // Initialiser la blockchain
    const { provider, wallet, contract } = await initBlockchain();

    // Vérifier le solde
    const balance = await provider.getBalance(wallet.address);
    const minBalance = ethers.parseEther('0.01');
    if (balance < minBalance) {
      console.warn(`⚠️  [Blockchain] Solde faible: ${ethers.formatEther(balance)} POL`);
      console.warn('   Obtenez du POL sur https://faucet.polygon.technology/');
    }

    // Vérifier le réseau
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== CHAIN_ID) {
      throw new Error(`Réseau incorrect. Attendu: ${CHAIN_ID}, Reçu: ${network.chainId}`);
    }

    console.log(`🔗 [Blockchain] Appel de certifyDocument()...`);

    // Appeler la fonction du contrat avec timeout
    const txPromise = contract.certifyDocument(ipfsHash);
    const tx = await Promise.race([
      txPromise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout: La transaction prend trop de temps')), RPC_TIMEOUT)
      )
    ]);

    console.log(`🔗 [Blockchain] Transaction envoyée: ${tx.hash}`);
    console.log(`   En attente de confirmation...`);

    // Attendre la confirmation (1 bloc)
    const receipt = await tx.wait(1);

    // Parser les events pour récupérer documentId
    const event = receipt.logs.find(
      log => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed && parsed.name === 'DocumentCertified';
        } catch {
          return false;
        }
      }
    );

    let documentId = null;
    if (event) {
      const parsedEvent = contract.interface.parseLog(event);
      documentId = parsedEvent.args.documentId.toString();
    }

    // Calculer le coût en gas
    const gasUsed = receipt.gasUsed.toString();
    const gasPrice = receipt.gasPrice || await provider.getFeeData().then(f => f.gasPrice);
    const cost = BigInt(gasUsed) * BigInt(gasPrice || 0);

    console.log(`✅ [Blockchain] Document certifié avec succès !`);
    console.log(`   Document ID: ${documentId}`);
    console.log(`   Gas utilisé: ${gasUsed}`);
    console.log(`   Coût: ${ethers.formatEther(cost)} POL`);

    return {
      success: true,
      documentId: documentId || 'N/A',
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      ipfsHash: ipfsHash,
      contractAddress: CONTRACT_ADDRESS,
      explorerUrl: `https://amoy.polygonscan.com/tx/${receipt.hash}`,
      gasUsed: gasUsed,
      network: 'Polygon Amoy Testnet',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`❌ [Blockchain] Erreur lors de la certification:`, error.message);

    // Gestion d'erreurs spécifiques
    if (error.message.includes('insufficient funds') || error.message.includes('insufficient balance')) {
      throw new Error('Solde insuffisant. Obtenez du POL sur https://faucet.polygon.technology/');
    }

    if (error.message.includes('nonce') || error.message.includes('replacement')) {
      throw new Error('Problème de nonce. Réessayez dans 30 secondes.');
    }

    if (error.message.includes('timeout') || error.message.includes('network')) {
      throw new Error('Timeout réseau. Vérifiez votre connexion Internet et réessayez.');
    }

    if (error.message.includes('Hash IPFS vide')) {
      throw new Error('Le hash IPFS ne peut pas être vide.');
    }

    throw error;
  }
}

/**
 * Vérifie un document certifié sur la blockchain
 * @param {string|number} documentId - L'ID du document à vérifier
 * @returns {Promise<Object>} - Informations du document
 */
async function verifyDocumentOnChain(documentId) {
  try {
    // Validation de l'input
    const docId = typeof documentId === 'string' ? parseInt(documentId) : documentId;
    if (!docId || docId <= 0 || isNaN(docId)) {
      throw new Error('documentId invalide');
    }

    console.log(`🔗 [Blockchain] Vérification du document ID: ${docId}`);

    // Initialiser la blockchain
    const { contract } = await initBlockchain();

    // Appeler la fonction view
    const result = await Promise.race([
      contract.verifyDocument(docId),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout: La requête prend trop de temps')), RPC_TIMEOUT)
      )
    ]);

    const [ipfsHash, owner, timestamp, exists] = result;

    if (!exists) {
      return {
        exists: false,
        documentId: docId.toString(),
      };
    }

    // Convertir le timestamp en date ISO
    const certificationDate = new Date(Number(timestamp) * 1000).toISOString();

    return {
      exists: true,
      documentId: docId.toString(),
      ipfsHash: ipfsHash,
      owner: owner,
      timestamp: Number(timestamp),
      certificationDate: certificationDate,
    };
  } catch (error) {
    console.error(`❌ [Blockchain] Erreur lors de la vérification:`, error.message);
    throw error;
  }
}

/**
 * Récupère tous les documents d'un utilisateur depuis la blockchain
 * @param {string} userAddress - L'adresse Ethereum de l'utilisateur
 * @returns {Promise<number[]>} - Tableau des IDs de documents
 */
async function getUserDocumentsFromChain(userAddress) {
  try {
    // Validation de l'adresse
    if (!ethers.isAddress(userAddress)) {
      throw new Error('Adresse Ethereum invalide');
    }

    console.log(`🔗 [Blockchain] Récupération des documents pour: ${userAddress}`);

    // Initialiser la blockchain
    const { contract } = await initBlockchain();

    // Appeler la fonction view
    const documentIds = await Promise.race([
      contract.getUserDocuments(userAddress),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout: La requête prend trop de temps')), RPC_TIMEOUT)
      )
    ]);

    // Convertir les BigInt en nombres
    const ids = documentIds.map(id => Number(id));

    console.log(`✅ [Blockchain] ${ids.length} document(s) trouvé(s)`);

    return ids;
  } catch (error) {
    console.error(`❌ [Blockchain] Erreur lors de la récupération:`, error.message);
    throw error;
  }
}

/**
 * Transfère la propriété d'un document
 * @param {string|number} documentId - L'ID du document à transférer
 * @param {string} newOwnerAddress - La nouvelle adresse propriétaire
 * @returns {Promise<Object>} - Informations de la transaction
 */
async function transferDocumentOnChain(documentId, newOwnerAddress) {
  try {
    // Validation des inputs
    const docId = typeof documentId === 'string' ? parseInt(documentId) : documentId;
    if (!docId || docId <= 0 || isNaN(docId)) {
      throw new Error('documentId invalide');
    }

    if (!ethers.isAddress(newOwnerAddress)) {
      throw new Error('Adresse Ethereum invalide pour le nouveau propriétaire');
    }

    console.log(`🔗 [Blockchain] Transfert du document ${docId} vers ${newOwnerAddress}`);

    // Initialiser la blockchain
    const { provider, contract } = await initBlockchain();

    // Vérifier le solde
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const balance = await provider.getBalance(wallet.address);
    const minBalance = ethers.parseEther('0.01');
    if (balance < minBalance) {
      throw new Error('Solde insuffisant pour la transaction. Obtenez du POL sur https://faucet.polygon.technology/');
    }

    // Appeler la fonction
    const tx = await Promise.race([
      contract.transferDocument(docId, newOwnerAddress),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout: La transaction prend trop de temps')), RPC_TIMEOUT)
      )
    ]);

    console.log(`🔗 [Blockchain] Transaction envoyée: ${tx.hash}`);
    console.log(`   En attente de confirmation...`);

    // Attendre la confirmation
    const receipt = await tx.wait(1);

    const gasUsed = receipt.gasUsed.toString();

    console.log(`✅ [Blockchain] Document transféré avec succès !`);
    console.log(`   Gas utilisé: ${gasUsed}`);

    return {
      success: true,
      documentId: docId.toString(),
      newOwner: newOwnerAddress,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      explorerUrl: `https://amoy.polygonscan.com/tx/${receipt.hash}`,
      gasUsed: gasUsed,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`❌ [Blockchain] Erreur lors du transfert:`, error.message);

    // Gestion d'erreurs spécifiques
    if (error.message.includes("Vous n'etes pas le proprietaire")) {
      throw new Error('Vous n\'êtes pas le propriétaire de ce document');
    }

    if (error.message.includes('Document inexistant')) {
      throw new Error('Document inexistant');
    }

    if (error.message.includes('Adresse invalide')) {
      throw new Error('Adresse invalide pour le nouveau propriétaire');
    }

    if (error.message.includes('insufficient funds') || error.message.includes('insufficient balance')) {
      throw new Error('Solde insuffisant. Obtenez du POL sur https://faucet.polygon.technology/');
    }

    throw error;
  }
}

/**
 * Teste la connexion à la blockchain
 * @returns {Promise<Object>} - Informations de connexion
 */
async function testConnection() {
  try {
    console.log(`🔗 [Blockchain] Test de connexion au réseau Amoy...`);

    // Initialiser la blockchain
    const { provider, wallet, contract } = await initBlockchain();

    // Vérifier le réseau
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);

    // Vérifier le solde
    const balance = await provider.getBalance(wallet.address);

    // Vérifier que le contrat existe (lire documentCount)
    let contractExists = false;
    let documentCount = 0;
    try {
      documentCount = await contract.documentCount();
      contractExists = true;
    } catch (error) {
      console.warn(`⚠️  Impossible de lire le contrat: ${error.message}`);
    }

    // Obtenir le numéro de bloc actuel
    const blockNumber = await provider.getBlockNumber();

    const result = {
      success: true,
      network: 'amoy',
      chainId: chainId,
      address: wallet.address,
      balance: ethers.formatEther(balance),
      blockNumber: blockNumber,
      contractAddress: CONTRACT_ADDRESS,
      contractExists: contractExists,
      documentCount: documentCount.toString(),
    };

    console.log(`✅ [Blockchain] Connexion réussie !`);
    console.log(`   Réseau: Polygon Amoy (${chainId})`);
    console.log(`   Wallet: ${wallet.address}`);
    console.log(`   Solde: ${result.balance} POL`);
    console.log(`   Contrat: ${CONTRACT_ADDRESS}`);
    console.log(`   Documents certifiés: ${documentCount}`);

    return result;
  } catch (error) {
    console.error(`❌ [Blockchain] Erreur de connexion:`, error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

module.exports = {
  recordDocumentHashOnChain,
  verifyDocumentOnChain,
  getUserDocumentsFromChain,
  transferDocumentOnChain,
  testConnection,
};
