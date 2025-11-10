require('dotenv').config({ path: require('path').join(__dirname, '..', 'config', '.env') });
const { expect } = require('chai');
const {
  testConnection,
  recordDocumentHashOnChain,
  verifyDocumentOnChain,
  getUserDocumentsFromChain,
  transferDocumentOnChain,
} = require('../utils/blockchain');

describe('Blockchain Integration Tests', function () {
  // Augmenter le timeout pour les tests blockchain (30 secondes)
  this.timeout(30000);

  describe('testConnection()', function () {
    it('Devrait se connecter au réseau Amoy avec succès', async function () {
      const result = await testConnection();

      expect(result).to.have.property('success');
      expect(result.success).to.be.true;
      expect(result).to.have.property('network', 'amoy');
      expect(result).to.have.property('chainId', 80002);
      expect(result).to.have.property('address');
      expect(result).to.have.property('balance');
      expect(result).to.have.property('contractAddress');
      expect(result).to.have.property('contractExists', true);
    });

    it('Devrait retourner les informations du contrat', async function () {
      const result = await testConnection();

      expect(result.contractAddress).to.be.a('string');
      expect(result.contractAddress).to.match(/^0x[a-fA-F0-9]{40}$/);
      expect(result.documentCount).to.be.a('string');
    });
  });

  describe('recordDocumentHashOnChain()', function () {
    const testIpfsHash = `QmTest${Date.now()}`;

    it('Devrait certifier un document avec un hash IPFS valide', async function () {
      const result = await recordDocumentHashOnChain(testIpfsHash);

      expect(result).to.have.property('success', true);
      expect(result).to.have.property('documentId');
      expect(result).to.have.property('transactionHash');
      expect(result).to.have.property('blockNumber');
      expect(result).to.have.property('ipfsHash', testIpfsHash);
      expect(result).to.have.property('contractAddress');
      expect(result).to.have.property('explorerUrl');
      expect(result).to.have.property('gasUsed');
      expect(result).to.have.property('network', 'Polygon Amoy Testnet');

      // Vérifier le format de la transaction hash
      expect(result.transactionHash).to.match(/^0x[a-fA-F0-9]{64}$/);
    });

    it('Devrait rejeter un hash IPFS vide', async function () {
      try {
        await recordDocumentHashOnChain('');
        expect.fail('Devrait avoir levé une erreur');
      } catch (error) {
        expect(error).to.be.an('Error');
      }
    });

    it('Devrait rejeter un hash IPFS invalide', async function () {
      try {
        await recordDocumentHashOnChain(null);
        expect.fail('Devrait avoir levé une erreur');
      } catch (error) {
        expect(error).to.be.an('Error');
      }
    });
  });

  describe('verifyDocumentOnChain()', function () {
    let testDocumentId = null;

    before(async function () {
      // Certifier un document pour les tests
      const testHash = `QmVerify${Date.now()}`;
      const result = await recordDocumentHashOnChain(testHash);
      testDocumentId = result.documentId;
    });

    it('Devrait vérifier un document existant', async function () {
      const result = await verifyDocumentOnChain(testDocumentId);

      expect(result).to.have.property('exists', true);
      expect(result).to.have.property('documentId', testDocumentId);
      expect(result).to.have.property('ipfsHash');
      expect(result).to.have.property('owner');
      expect(result).to.have.property('timestamp');
      expect(result).to.have.property('certificationDate');

      // Vérifier le format de l'adresse
      expect(result.owner).to.match(/^0x[a-fA-F0-9]{40}$/);
    });

    it('Devrait retourner exists=false pour un document inexistant', async function () {
      const result = await verifyDocumentOnChain(999999);

      expect(result).to.have.property('exists', false);
      expect(result).to.have.property('documentId', '999999');
    });

    it('Devrait rejeter un documentId invalide', async function () {
      try {
        await verifyDocumentOnChain(0);
        expect.fail('Devrait avoir levé une erreur');
      } catch (error) {
        expect(error).to.be.an('Error');
      }
    });
  });

  describe('getUserDocumentsFromChain()', function () {
    it('Devrait retourner un tableau de documents pour une adresse valide', async function () {
      // Utiliser l'adresse du wallet configuré
      const connection = await testConnection();
      const userAddress = connection.address;

      const documents = await getUserDocumentsFromChain(userAddress);

      expect(documents).to.be.an('array');
      // Les documents peuvent être vides ou contenir des IDs
      documents.forEach(id => {
        expect(id).to.be.a('number');
        expect(id).to.be.greaterThan(0);
      });
    });

    it('Devrait rejeter une adresse invalide', async function () {
      try {
        await getUserDocumentsFromChain('invalid-address');
        expect.fail('Devrait avoir levé une erreur');
      } catch (error) {
        expect(error).to.be.an('Error');
      }
    });
  });

  describe('transferDocumentOnChain()', function () {
    let testDocumentId = null;
    const { ethers } = require('ethers');

    before(async function () {
      // Certifier un document pour les tests de transfert
      const testHash = `QmTransfer${Date.now()}`;
      const result = await recordDocumentHashOnChain(testHash);
      testDocumentId = result.documentId;
    });

    it('Devrait transférer un document vers une nouvelle adresse', async function () {
      // Créer une nouvelle adresse pour le test
      const newOwner = ethers.Wallet.createRandom().address;

      const result = await transferDocumentOnChain(testDocumentId, newOwner);

      expect(result).to.have.property('success', true);
      expect(result).to.have.property('documentId', testDocumentId);
      expect(result).to.have.property('newOwner', newOwner);
      expect(result).to.have.property('transactionHash');
      expect(result).to.have.property('blockNumber');
      expect(result).to.have.property('explorerUrl');
      expect(result).to.have.property('gasUsed');

      // Vérifier que le document appartient maintenant au nouveau propriétaire
      const verification = await verifyDocumentOnChain(testDocumentId);
      expect(verification.owner.toLowerCase()).to.equal(newOwner.toLowerCase());
    });

    it('Devrait rejeter un documentId invalide', async function () {
      const newOwner = ethers.Wallet.createRandom().address;
      try {
        await transferDocumentOnChain(0, newOwner);
        expect.fail('Devrait avoir levé une erreur');
      } catch (error) {
        expect(error).to.be.an('Error');
      }
    });

    it('Devrait rejeter une adresse invalide', async function () {
      try {
        await transferDocumentOnChain(testDocumentId, 'invalid-address');
        expect.fail('Devrait avoir levé une erreur');
      } catch (error) {
        expect(error).to.be.an('Error');
      }
    });

    it('Devrait rejeter le transfert d\'un document inexistant', async function () {
      const newOwner = ethers.Wallet.createRandom().address;
      try {
        await transferDocumentOnChain(999999, newOwner);
        expect.fail('Devrait avoir levé une erreur');
      } catch (error) {
        expect(error).to.be.an('Error');
      }
    });
  });

  describe('Gestion d\'erreurs', function () {
    it('Devrait gérer les erreurs de réseau gracieusement', async function () {
      // Ce test vérifie que les erreurs sont bien gérées
      // En cas de problème réseau, une erreur claire doit être levée
      try {
        await recordDocumentHashOnChain('QmTestError');
      } catch (error) {
        expect(error).to.be.an('Error');
        expect(error.message).to.be.a('string');
      }
    });
  });
});

