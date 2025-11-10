require('dotenv').config({ path: './config/.env' });
const { 
  testConnection,
  recordDocumentHashOnChain,
  verifyDocumentOnChain,
  getUserDocumentsFromChain
} = require('./utils/blockchain');

async function runE2ETests() {
  console.log('\n🧪 Tests End-to-End - Blockchain Integration\n');
  console.log('═══════════════════════════════════════════════\n');
  
  try {
    // TEST 0 : Connexion
    console.log('📡 TEST 0 : Vérification de la connexion...');
    const connectionResult = await testConnection();
    console.log('✅ Connexion OK');
    console.log(`   Réseau: ${connectionResult.network}`);
    console.log(`   Solde: ${connectionResult.balance} POL`);
    console.log(`   Contrat: ${connectionResult.contractAddress}\n`);
    
    if (!connectionResult.success) {
      throw new Error('Connexion échouée');
    }
    
    // TEST 1 : Certification
    console.log('📝 TEST 1 : Certification d\'un document...');
    const testIpfsHash = `QmTest${Date.now()}`; // Hash fictif unique
    console.log(`   Hash IPFS test: ${testIpfsHash}`);
    
    const certifyResult = await recordDocumentHashOnChain(testIpfsHash);
    console.log('✅ Document certifié !');
    console.log(`   Document ID: ${certifyResult.documentId}`);
    console.log(`   Transaction: ${certifyResult.transactionHash}`);
    console.log(`   Bloc: ${certifyResult.blockNumber}`);
    console.log(`   Gas utilisé: ${certifyResult.gasUsed}`);
    console.log(`   Explorer: ${certifyResult.explorerUrl}\n`);
    
    const documentId = certifyResult.documentId;
    
    // TEST 2 : Vérification
    console.log('🔍 TEST 2 : Vérification du document...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Attendre 2s
    
    const verifyResult = await verifyDocumentOnChain(documentId);
    console.log('✅ Document vérifié !');
    console.log(`   Existe: ${verifyResult.exists}`);
    console.log(`   Hash IPFS: ${verifyResult.ipfsHash}`);
    console.log(`   Propriétaire: ${verifyResult.owner}`);
    console.log(`   Date: ${verifyResult.certificationDate}\n`);
    
    if (verifyResult.ipfsHash !== testIpfsHash) {
      throw new Error('Hash IPFS ne correspond pas !');
    }
    
    // TEST 3 : Liste des documents
    console.log('📋 TEST 3 : Récupération des documents de l\'utilisateur...');
    const userDocs = await getUserDocumentsFromChain(connectionResult.address);
    console.log('✅ Documents récupérés !');
    console.log(`   Nombre de documents: ${userDocs.length}`);
    console.log(`   IDs: [${userDocs.join(', ')}]\n`);
    
    if (!userDocs.includes(Number(documentId))) {
      throw new Error('Document ID absent de la liste !');
    }
    
    // TEST 4 : Document inexistant
    console.log('❌ TEST 4 : Vérification d\'un document inexistant...');
    const nonExistResult = await verifyDocumentOnChain(99999);
    console.log('✅ Comportement correct pour document inexistant');
    console.log(`   Existe: ${nonExistResult.exists}\n`);
    
    if (nonExistResult.exists) {
      throw new Error('Document inexistant détecté comme existant !');
    }
    
    // RÉSUMÉ
    console.log('═══════════════════════════════════════════════');
    console.log('🎉 TOUS LES TESTS SONT PASSÉS ! 🎉');
    console.log('═══════════════════════════════════════════════\n');
    console.log('✅ Connexion blockchain fonctionnelle');
    console.log('✅ Certification de documents OK');
    console.log('✅ Vérification de documents OK');
    console.log('✅ Récupération des documents utilisateur OK');
    console.log('✅ Gestion des cas limites OK\n');
    console.log('🚀 Backend prêt pour l\'intégration avec les routes API\n');
    
  } catch (error) {
    console.error('\n❌ ERREUR LORS DES TESTS E2E:', error.message);
    console.error('\nDétails:', error);
    process.exit(1);
  }
}

// Exécuter les tests
runE2ETests();

