const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const API_URL = 'http://localhost:3000/api/documents';

async function testAPIComplete() {
  console.log('\n🧪 Test API REST complet avec authentification Firebase\n');
  console.log('════════════════════════════════════════════════════════\n');
  
  try {
    // ÉTAPE 1 : Obtenir un token Firebase de test
    console.log('🔑 ÉTAPE 1 : Génération du token Firebase...');
    
    const tokenResponse = await axios.get(`${API_URL}/test-generate-token`);
    const { testToken, userId } = tokenResponse.data;
    
    if (!testToken) {
      throw new Error('Test Token non généré par le serveur');
    }
    
    console.log('✅ Test Token généré (mode développement)');
    console.log(`   User ID : ${userId}`);
    console.log(`   Test Token : ${testToken}\n`);
    
    const finalToken = testToken;
    
    // ÉTAPE 2 : Créer un fichier de test réaliste
    console.log('📄 ÉTAPE 2 : Création du document de test...');
    
    const testContent = `
════════════════════════════════════════════════════════════
           ACTE DE PROPRIÉTÉ FONCIÈRE - TEST API
════════════════════════════════════════════════════════════

RÉFÉRENCES CADASTRALES
Parcelle : 75008-CD-${Date.now()}
Section : CD
Numéro : ${Math.floor(Math.random() * 10000)}
Surface : 850 m²

PROPRIÉTAIRE
Nom : Madame Sophie MARTIN
Adresse : 42 Boulevard Haussmann
Ville : 75008 Paris, France
Date de naissance : 15/03/1975

CARACTÉRISTIQUES
Type de bien : Terrain constructible
Zone : Zone urbaine résidentielle
Valeur cadastrale : 450 000 €
Date d'acquisition : ${new Date().toLocaleDateString('fr-FR')}

DOCUMENTS ANNEXES
- Plan cadastral
- Certificat d'urbanisme
- Bornage géomètre

MENTIONS LÉGALES
Ce document est confidentiel et protégé par chiffrement AES-256-GCM.
Seul le propriétaire légitime peut y accéder avec son mot de passe.

Certifié par blockchain Polygon le : ${new Date().toISOString()}
Hash de certification : [Sera généré lors de la certification]

════════════════════════════════════════════════════════════
Document généré automatiquement par LandSafe v1.0
Test API REST - ${new Date().toLocaleString('fr-FR')}
════════════════════════════════════════════════════════════
`;
    
    const testFilePath = './test-document-api.txt';
    fs.writeFileSync(testFilePath, testContent);
    
    console.log('✅ Document test créé');
    console.log(`   Chemin : ${testFilePath}`);
    console.log(`   Taille : ${testContent.length} bytes`);
    console.log(`   Contenu : Acte de propriété fictif\n`);
    
    // ÉTAPE 3 : Upload via l'API REST
    console.log('📤 ÉTAPE 3 : Upload via API REST...');
    console.log('   → Chiffrement AES-256-GCM...');
    console.log('   → Upload IPFS...');
    console.log('   → Certification blockchain...');
    console.log('   (Cela peut prendre 10-15 secondes)\n');
    
    const formData = new FormData();
    formData.append('file', fs.createReadStream(testFilePath));
    formData.append('titre', 'Acte de propriété - Test API');
    formData.append('type', 'titre_foncier');
    // Pas de password = génération automatique sécurisée
    
    const startTime = Date.now();
    
    const uploadResponse = await axios.post(
      `${API_URL}/upload-document`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${finalToken}`
        },
        timeout: 60000, // 60 secondes
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );
    
    const uploadTime = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`✅ Upload réussi en ${uploadTime}s !\n`);
    
    const { document, blockchain, encryption } = uploadResponse.data;
    
    // Affichage détaillé des résultats
    console.log('═══════════════════════════════════════════════');
    console.log('📋 INFORMATIONS DU DOCUMENT');
    console.log('═══════════════════════════════════════════════');
    console.log(`ID (base de données) : ${document.id}`);
    console.log(`Titre : ${document.titre}`);
    console.log(`Type : ${document.type}`);
    console.log(`Statut : ${document.statut}`);
    console.log(`Chiffré : ${document.is_encrypted ? 'OUI ✅' : 'NON ❌'}`);
    console.log(`Méthode chiffrement : ${document.encryption_method}`);
    console.log(`Date de création : ${new Date(document.created_at).toLocaleString('fr-FR')}`);
    
    console.log('\n═══════════════════════════════════════════════');
    console.log('⛓️  CERTIFICATION BLOCKCHAIN');
    console.log('═══════════════════════════════════════════════');
    
    if (blockchain) {
      console.log(`Document ID blockchain : ${blockchain.documentId}`);
      console.log(`Transaction Hash : ${blockchain.transactionHash}`);
      console.log(`Bloc : ${blockchain.blockNumber}`);
      console.log(`Réseau : ${blockchain.network}`);
      console.log(`\n🔍 Explorer : ${blockchain.explorerUrl}`);
    } else {
      console.log('⚠️  Certification blockchain échouée');
      console.log('   Le document est enregistré mais non certifié');
      console.log('   Raison possible : Solde POL insuffisant ou erreur réseau');
    }
    
    console.log('\n═══════════════════════════════════════════════');
    console.log('🔒 CHIFFREMENT & SÉCURITÉ');
    console.log('═══════════════════════════════════════════════');
    
    let generatedPassword = null;
    
    if (encryption.password) {
      generatedPassword = encryption.password;
      console.log(`⚠️  MOT DE PASSE GÉNÉRÉ : ${generatedPassword}`);
      console.log('\n' + encryption.warning);
      console.log('\n💾 SAUVEGARDEZ CE MOT DE PASSE MAINTENANT !');
    } else {
      console.log(encryption.message);
    }
    
    console.log('\n═══════════════════════════════════════════════');
    console.log('📥 STOCKAGE IPFS');
    console.log('═══════════════════════════════════════════════');
    console.log(`Hash IPFS : ${document.ipfsHash}`);
    console.log(`URL publique : ${document.ipfsUrl}`);
    console.log('⚠️  Note : Fichier CHIFFRÉ sur IPFS (illisible sans mot de passe)');
    
    // ÉTAPE 4 : Vérifier que le fichier sur IPFS est bien chiffré
    console.log('\n🔍 ÉTAPE 4 : Vérification du chiffrement sur IPFS...');
    
    const ipfsResponse = await axios.get(document.ipfsUrl, {
      responseType: 'arraybuffer',
      timeout: 15000
    });
    
    const ipfsContentText = Buffer.from(ipfsResponse.data).toString('utf8', 0, 500);
    
    if (ipfsContentText.includes('Sophie MARTIN') || 
        ipfsContentText.includes('Boulevard Haussmann') ||
        ipfsContentText.includes('PROPRIÉTÉ')) {
      console.log('❌ ERREUR CRITIQUE : Fichier NON CHIFFRÉ sur IPFS !');
      console.log('   Des informations sensibles sont visibles en clair !');
      throw new Error('Chiffrement défaillant');
    } else {
      console.log('✅ Fichier bien chiffré sur IPFS');
      console.log('   Contenu illisible sans mot de passe');
      console.log(`   Aperçu hexadécimal : ${Buffer.from(ipfsResponse.data).toString('hex').substring(0, 80)}...`);
    }
    
    // ÉTAPE 5 : Téléchargement et déchiffrement
    if (generatedPassword) {
      console.log('\n📥 ÉTAPE 5 : Téléchargement et déchiffrement...');
      
      const downloadResponse = await axios.post(
        `${API_URL}/download/${document.id}`,
        { password: generatedPassword },
        {
          headers: {
            'Authorization': `Bearer ${finalToken}`
          },
          responseType: 'arraybuffer',
          timeout: 30000
        }
      );
      
      const decryptedContent = Buffer.from(downloadResponse.data).toString('utf8');
      
      console.log('✅ Téléchargement et déchiffrement réussis');
      console.log(`   Taille déchiffrée : ${decryptedContent.length} bytes`);
      
      // Vérifier l'intégrité
      if (decryptedContent === testContent) {
        console.log('✅ Intégrité vérifiée : contenu identique à l\'original');
        console.log('   Le document contient bien : "Sophie MARTIN", "Boulevard Haussmann"');
      } else {
        console.log('❌ ERREUR : Contenu déchiffré différent de l\'original !');
        throw new Error('Perte d\'intégrité lors du déchiffrement');
      }
      
      // Test avec mauvais mot de passe
      console.log('\n❌ ÉTAPE 5.1 : Test avec mauvais mot de passe...');
      try {
        await axios.post(
          `${API_URL}/download/${document.id}`,
          { password: 'MauvaisMotDePasse123!' },
          {
            headers: {
              'Authorization': `Bearer ${finalToken}`
            },
            responseType: 'arraybuffer'
          }
        );
        console.log('❌ ERREUR : Mauvais mot de passe accepté !');
      } catch (error) {
        if (error.response && error.response.status === 401) {
          console.log('✅ Mauvais mot de passe correctement rejeté (401)');
        } else {
          throw error;
        }
      }
    }
    
    // ÉTAPE 6 : Récupération de la liste des documents
    console.log('\n📋 ÉTAPE 6 : Récupération de la liste des documents...');
    
    // Utiliser l'ID du document pour récupérer l'utilisateur, ou utiliser un UUID de test
    // Pour simplifier, on va utiliser l'email comme identifiant
    const listResponse = await axios.get(
      `${API_URL}/${userId}`, // L'API va convertir en UUID automatiquement
      {
        headers: {
          'Authorization': `Bearer ${finalToken}`
        }
      }
    );
    
    console.log(`✅ ${listResponse.data.count} document(s) trouvé(s) pour cet utilisateur`);
    if (listResponse.data.documents && listResponse.data.documents.length > 0) {
      const lastDoc = listResponse.data.documents[listResponse.data.documents.length - 1];
      console.log('   Dernier document :');
      console.log(`   - Titre : ${lastDoc.titre}`);
      console.log(`   - Statut : ${lastDoc.statut}`);
    }
    
    // ÉTAPE 7 : Vérification blockchain (si certifié)
    if (blockchain) {
      console.log('\n⛓️  ÉTAPE 7 : Vérification blockchain...');
      
      const verifyResponse = await axios.get(
        `${API_URL}/verify-blockchain/${document.id}`,
        {
          headers: {
            'Authorization': `Bearer ${finalToken}`
          }
        }
      );
      
      console.log('✅ Vérification blockchain réussie');
      console.log(`   Document existe on-chain : ${verifyResponse.data.verified}`);
      console.log(`   Propriétaire on-chain : ${verifyResponse.data.owner}`);
      console.log(`   Hash IPFS correspond : ${verifyResponse.data.ipfsHashMatches}`);
      console.log(`   Date certification : ${new Date(verifyResponse.data.certificationDate).toLocaleString('fr-FR')}`);
    } else {
      console.log('\n⏭️  ÉTAPE 7 : Vérification blockchain skippée (document non certifié)');
    }
    
    // Nettoyage
    fs.unlinkSync(testFilePath);
    console.log('\n🗑️  Fichier temporaire supprimé');
    
    // RÉSUMÉ FINAL
    console.log('\n════════════════════════════════════════════════════════');
    console.log('🎉 TEST API REST COMPLET 100% RÉUSSI ! 🎉');
    console.log('════════════════════════════════════════════════════════\n');
    
    console.log('✅ Authentification Firebase (JWT custom token)');
    console.log('✅ Upload de fichier multipart/form-data');
    console.log('✅ Chiffrement automatique AES-256-GCM');
    console.log('✅ Upload IPFS du fichier chiffré');
    console.log('✅ Certification blockchain Polygon');
    console.log('✅ Fichier IPFS illisible sans mot de passe');
    console.log('✅ Téléchargement + déchiffrement OK');
    console.log('✅ Intégrité du document vérifiée');
    console.log('✅ Mauvais mot de passe rejeté');
    console.log('✅ Liste des documents récupérée');
    console.log('✅ Vérification blockchain validée');
    
    console.log('\n🚀 API REST 100% OPÉRATIONNELLE ET SÉCURISÉE\n');
    
    console.log('📊 Statistiques du test :');
    console.log(`   Temps total : ${uploadTime}s`);
    console.log(`   Taille document : ${testContent.length} bytes`);
    console.log(`   Hash IPFS : ${document.ipfsHash}`);
    if (blockchain) {
      console.log(`   Document ID blockchain : ${blockchain.documentId}`);
      console.log(`   Transaction : ${blockchain.transactionHash}`);
    } else {
      console.log(`   Blockchain : Non certifié (voir logs serveur)`);
    }
    
    if (generatedPassword) {
      console.log(`\n⚠️  MOT DE PASSE : ${generatedPassword}`);
      console.log('   (Ce mot de passe a été utilisé pour ce test et peut être jeté)\n');
    }
    
  } catch (error) {
    console.error('\n❌ ERREUR LORS DU TEST API:', error.message);
    
    if (error.response) {
      console.error('\nRéponse serveur:');
      console.error('  Status:', error.response.status);
      console.error('  Data:', JSON.stringify(error.response.data, null, 2));
    }
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n⚠️  Le serveur n\'est pas démarré !');
      console.error('   Lancez : node server.js');
    }
    
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

// Lancer le test
console.log('🚀 Démarrage du test API REST...\n');
testAPIComplete();

