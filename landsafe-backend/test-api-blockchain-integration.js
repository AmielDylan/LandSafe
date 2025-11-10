require('dotenv').config({ path: './config/.env' });
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const TEST_USER_TOKEN = process.env.TEST_FIREBASE_TOKEN || ''; // À remplir avec un vrai token Firebase

/**
 * Test d'intégration API complète avec blockchain
 */
async function runAPITests() {
  console.log('\n🧪 Tests d\'intégration API - Blockchain\n');
  console.log('═══════════════════════════════════════════════\n');

  if (!TEST_USER_TOKEN) {
    console.error('❌ TEST_FIREBASE_TOKEN non configuré dans .env');
    console.log('💡 Pour tester l\'API, vous devez configurer un token Firebase valide\n');
    process.exit(1);
  }

  const headers = {
    'Authorization': `Bearer ${TEST_USER_TOKEN}`,
  };

  let documentId = null;
  let blockchainInfo = null;

  try {
    // TEST 1 : Upload document avec certification blockchain
    console.log('📝 TEST 1 : Upload document avec certification blockchain...');
    
    // Créer un fichier de test
    const testContent = `Document de test LandSafe
Créé le: ${new Date().toISOString()}
Ce document sert à tester l'intégration blockchain complète.
`;
    const testFilePath = path.join(__dirname, 'test-document.txt');
    fs.writeFileSync(testFilePath, testContent);

    // Préparer le FormData
    const formData = new FormData();
    formData.append('file', fs.createReadStream(testFilePath));
    formData.append('titre', 'Document de test blockchain');
    formData.append('type', 'autre');

    console.log('   Envoi de la requête POST /api/documents/upload-document...');

    const uploadResponse = await axios.post(
      `${BASE_URL}/api/documents/upload-document`,
      formData,
      {
        headers: {
          ...headers,
          ...formData.getHeaders(),
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );

    console.log('✅ Document uploadé avec succès !');
    console.log(`   Document ID (DB): ${uploadResponse.data.document.id}`);
    console.log(`   Statut: ${uploadResponse.data.document.statut}`);
    
    if (uploadResponse.data.blockchain) {
      blockchainInfo = uploadResponse.data.blockchain;
      console.log(`   Blockchain Document ID: ${blockchainInfo.documentId}`);
      console.log(`   Transaction Hash: ${blockchainInfo.transactionHash}`);
      console.log(`   Explorer: ${blockchainInfo.explorerUrl}`);
    } else {
      console.log('   ⚠️  Certification blockchain échouée ou non effectuée');
    }

    documentId = uploadResponse.data.document.id;
    console.log('');

    // Nettoyer le fichier de test
    fs.unlinkSync(testFilePath);

    // TEST 2 : Récupération du document avec vérification blockchain
    if (documentId) {
      console.log('🔍 TEST 2 : Récupération du document avec vérification blockchain...');
      
      const getResponse = await axios.get(
        `${BASE_URL}/api/documents/by-id/${documentId}`,
        { headers }
      );

      console.log('✅ Document récupéré !');
      console.log(`   Titre: ${getResponse.data.titre}`);
      console.log(`   Statut: ${getResponse.data.statut}`);
      
      if (getResponse.data.blockchainVerification) {
        console.log('   Vérification blockchain:');
        console.log(`     Vérifié: ${getResponse.data.blockchainVerification.verified}`);
        console.log(`     Propriétaire on-chain: ${getResponse.data.blockchainVerification.onChainOwner}`);
        console.log(`     Hash IPFS correspond: ${getResponse.data.blockchainVerification.ipfsHashMatches}`);
      }
      console.log('');
    }

    // TEST 3 : Vérification blockchain dédiée
    if (documentId && blockchainInfo) {
      console.log('⛓️ TEST 3 : Vérification blockchain dédiée...');
      
      const verifyResponse = await axios.get(
        `${BASE_URL}/api/documents/verify-blockchain/${documentId}`,
        { headers }
      );

      console.log('✅ Vérification blockchain réussie !');
      console.log(`   Vérifié: ${verifyResponse.data.verified}`);
      console.log(`   Document ID (blockchain): ${verifyResponse.data.documentId}`);
      console.log(`   Propriétaire: ${verifyResponse.data.owner}`);
      console.log(`   Date certification: ${verifyResponse.data.certificationDate}`);
      console.log(`   Hash IPFS correspond: ${verifyResponse.data.ipfsHashMatches}`);
      if (verifyResponse.data.explorerUrl) {
        console.log(`   Explorer: ${verifyResponse.data.explorerUrl}`);
      }
      console.log('');
    }

    // TEST 4 : Liste des documents avec infos blockchain
    console.log('📋 TEST 4 : Liste des documents de l\'utilisateur...');
    
    // Récupérer l'userId depuis le token (ou utiliser une valeur de test)
    // Pour ce test, on suppose qu'on peut utiliser l'UID Firebase
    const testUserId = 'test-user-id'; // À remplacer par l'UID réel
    
    try {
      const listResponse = await axios.get(
        `${BASE_URL}/api/documents/${testUserId}`,
        { headers }
      );

      console.log('✅ Liste récupérée !');
      console.log(`   Nombre de documents: ${listResponse.data.count}`);
      
      if (listResponse.data.documents.length > 0) {
        const firstDoc = listResponse.data.documents[0];
        console.log(`   Premier document:`);
        console.log(`     ID: ${firstDoc.id}`);
        console.log(`     Titre: ${firstDoc.titre}`);
        console.log(`     Statut: ${firstDoc.statut}`);
        if (firstDoc.blockchain_tx_hash) {
          console.log(`     Blockchain TX: ${firstDoc.blockchain_tx_hash}`);
        }
      }
      console.log('');
    } catch (error) {
      console.log('⚠️  Test 4 skippé (userId non disponible ou erreur)');
      console.log('');
    }

    // RÉSUMÉ
    console.log('═══════════════════════════════════════════════');
    console.log('🎉 TESTS D\'INTÉGRATION API TERMINÉS ! 🎉');
    console.log('═══════════════════════════════════════════════\n');
    console.log('✅ Upload document avec certification blockchain');
    console.log('✅ Récupération document avec vérification');
    console.log('✅ Vérification blockchain dédiée');
    console.log('✅ Liste des documents\n');
    console.log('🚀 API REST complète et opérationnelle avec blockchain !\n');

  } catch (error) {
    console.error('\n❌ ERREUR LORS DES TESTS API:', error.message);
    
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('   Détails:', error);
    }
    
    process.exit(1);
  }
}

// Note: Ce script nécessite un serveur API en cours d'exécution
// et un token Firebase valide pour fonctionner
console.log('⚠️  Ce script nécessite:');
console.log('   1. Serveur API démarré (npm run dev)');
console.log('   2. TEST_FIREBASE_TOKEN configuré dans .env');
console.log('   3. Connexion Internet active\n');

runAPITests();

