require('dotenv').config({ path: './config/.env' });

const { 
  encryptFile, 
  decryptFile, 
  generateSecurePassword 
} = require('./utils/encryption');

const { uploadToIPFS } = require('./utils/ipfs');

const { recordDocumentHashOnChain } = require('./utils/blockchain');

const axios = require('axios');

async function testEncryptionE2E() {
  console.log('\n🧪 Test E2E : Chiffrement → IPFS → Blockchain → Déchiffrement\n');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  try {
    // TEST 1 : Créer un document test
    console.log('📝 TEST 1 : Création du document test...');
    const originalContent = Buffer.from(`
═══════════════════════════════════════════
DOCUMENT FONCIER CONFIDENTIEL
═══════════════════════════════════════════

Titre de propriété
Parcelle n°: 12345-AB-2024
Propriétaire : Jean Dupont
Adresse : 123 Rue de la Paix, Paris

Ce document est CONFIDENTIEL et ne doit être
accessible qu'avec le mot de passe de déchiffrement.

═══════════════════════════════════════════
Date : ${new Date().toISOString()}
    `);
    
    console.log('✅ Document créé');
    console.log(`   Taille : ${originalContent.length} bytes\n`);
    
    // TEST 2 : Chiffrement
    console.log('🔒 TEST 2 : Chiffrement du document...');
    const password = generateSecurePassword();
    console.log(`   Mot de passe généré : ${password.substring(0, 20)}...`);
    
    const { encryptedBuffer, metadata } = encryptFile(originalContent, password);
    
    console.log('✅ Document chiffré !');
    console.log(`   Algorithme : ${metadata.algorithm}`);
    console.log(`   Taille originale : ${metadata.originalSize} bytes`);
    console.log(`   Taille chiffrée : ${metadata.encryptedSize} bytes`);
    console.log(`   Overhead : ${metadata.encryptedSize - metadata.originalSize} bytes\n`);
    
    // TEST 3 : Upload IPFS (fichier chiffré)
    console.log('📤 TEST 3 : Upload du fichier CHIFFRÉ sur IPFS...');
    const ipfsResult = await uploadToIPFS(encryptedBuffer, 'document-foncier-chiffre.txt');
    
    console.log('✅ Fichier chiffré uploadé sur IPFS !');
    console.log(`   Hash IPFS : ${ipfsResult.ipfsHash}`);
    console.log(`   URL : ${ipfsResult.ipfsUrl}\n`);
    
    // TEST 4 : Vérifier que le fichier sur IPFS est bien chiffré (illisible)
    console.log('🔍 TEST 4 : Vérification que le fichier IPFS est chiffré...');
    const ipfsUrl = ipfsResult.ipfsUrl;
    const ipfsResponse = await axios.get(ipfsUrl, { 
      responseType: 'arraybuffer',
      timeout: 10000 
    });
    
    const ipfsContent = Buffer.from(ipfsResponse.data).toString('utf8');
    
    if (ipfsContent.includes('CONFIDENTIEL') || ipfsContent.includes('Jean Dupont')) {
      throw new Error('❌ ERREUR CRITIQUE : Le fichier IPFS N\'EST PAS CHIFFRÉ !');
    }
    
    console.log('✅ Fichier IPFS bien chiffré (contenu illisible)');
    console.log(`   Aperçu : ${Buffer.from(ipfsResponse.data).toString('hex').substring(0, 60)}...\n`);
    
    // TEST 5 : Certification blockchain
    console.log('⛓️ TEST 5 : Certification sur la blockchain...');
    const blockchainResult = await recordDocumentHashOnChain(ipfsResult.ipfsHash);
    
    console.log('✅ Document certifié sur blockchain !');
    console.log(`   Document ID : ${blockchainResult.documentId}`);
    console.log(`   Transaction : ${blockchainResult.transactionHash}`);
    console.log(`   Explorer : ${blockchainResult.explorerUrl}\n`);
    
    // TEST 6 : Téléchargement depuis IPFS
    console.log('📥 TEST 6 : Téléchargement depuis IPFS...');
    const downloadResponse = await axios.get(ipfsUrl, {
      responseType: 'arraybuffer',
      timeout: 10000
    });
    
    const downloadedEncrypted = Buffer.from(downloadResponse.data);
    
    console.log('✅ Fichier téléchargé depuis IPFS');
    console.log(`   Taille : ${downloadedEncrypted.length} bytes\n`);
    
    // TEST 7 : Déchiffrement avec le bon mot de passe
    console.log('🔓 TEST 7 : Déchiffrement avec le mot de passe correct...');
    const { decryptedBuffer } = decryptFile(downloadedEncrypted, password);
    
    console.log('✅ Fichier déchiffré !');
    console.log(`   Taille : ${decryptedBuffer.length} bytes\n`);
    
    // TEST 8 : Vérifier que le contenu déchiffré = original
    console.log('🔍 TEST 8 : Vérification de l\'intégrité...');
    
    if (originalContent.toString() !== decryptedBuffer.toString()) {
      throw new Error('❌ ERREUR : Contenu déchiffré différent de l\'original !');
    }
    
    console.log('✅ Intégrité vérifiée : contenu identique');
    console.log(`   Le document contient bien : "CONFIDENTIEL", "Jean Dupont"\n`);
    
    // TEST 9 : Tentative avec mauvais mot de passe
    console.log('❌ TEST 9 : Tentative avec mauvais mot de passe...');
    
    try {
      decryptFile(downloadedEncrypted, 'MauvaisMotDePasse123!');
      throw new Error('❌ ERREUR : Mauvais mot de passe accepté !');
    } catch (error) {
      if (error.message.includes('Mot de passe incorrect')) {
        console.log('✅ Mauvais mot de passe correctement rejeté\n');
      } else {
        throw error;
      }
    }
    
    // RÉSUMÉ FINAL
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎉 TOUS LES TESTS E2E AVEC CHIFFREMENT PASSENT ! 🎉');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    console.log('✅ Document chiffré avec AES-256-GCM');
    console.log('✅ Fichier sur IPFS est ILLISIBLE sans mot de passe');
    console.log('✅ Certification blockchain OK');
    console.log('✅ Téléchargement + déchiffrement OK');
    console.log('✅ Intégrité vérifiée');
    console.log('✅ Mauvais mot de passe rejeté');
    console.log('\n🔒 CONFIDENTIALITÉ GARANTIE');
    console.log('🎊 SYSTÈME 100% OPÉRATIONNEL\n');
    
    console.log('📊 Statistiques :');
    console.log(`   Mot de passe : ${password}`);
    console.log(`   Hash IPFS : ${ipfsResult.ipfsHash}`);
    console.log(`   Document ID blockchain : ${blockchainResult.documentId}`);
    console.log(`   Transaction : ${blockchainResult.transactionHash}`);
    console.log(`   Overhead chiffrement : ${metadata.encryptedSize - metadata.originalSize} bytes (${((metadata.encryptedSize - metadata.originalSize) / metadata.originalSize * 100).toFixed(1)}%)\n`);
    
  } catch (error) {
    console.error('\n❌ ERREUR LORS DU TEST E2E:', error.message);
    console.error('\nDétails:', error);
    process.exit(1);
  }
}

// Exécuter le test
testEncryptionE2E();

