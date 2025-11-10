const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DocumentCertifier", function () {
  let documentCertifier;
  let owner;
  let addr1;
  let addr2;
  let addr3;

  beforeEach(async function () {
    // Récupérer les comptes de test
    [owner, addr1, addr2, addr3] = await ethers.getSigners();

    // Déployer le contrat
    const DocumentCertifier = await ethers.getContractFactory("DocumentCertifier");
    documentCertifier = await DocumentCertifier.deploy();
    await documentCertifier.waitForDeployment();
  });

  describe("Déploiement", function () {
    it("Devrait déployer le contrat avec documentCount à 0", async function () {
      expect(await documentCertifier.documentCount()).to.equal(0);
    });
  });

  describe("Certification de documents", function () {
    const testIpfsHash = "QmNwCvGU8pPQbC4oELG84nS6u8QF91kQcBncHc6GGFjT9C";

    it("Devrait certifier un document avec un hash IPFS valide", async function () {
      const tx = await documentCertifier.connect(addr1).certifyDocument(testIpfsHash);
      const receipt = await tx.wait();

      // Vérifier l'événement
      const event = receipt.logs.find(
        log => documentCertifier.interface.parseLog(log)?.name === "DocumentCertified"
      );
      expect(event).to.not.be.undefined;

      const parsedEvent = documentCertifier.interface.parseLog(event);
      expect(parsedEvent.args.documentId).to.equal(1);
      expect(parsedEvent.args.owner).to.equal(addr1.address);
      expect(parsedEvent.args.ipfsHash).to.equal(testIpfsHash);

      // Vérifier le documentCount
      expect(await documentCertifier.documentCount()).to.equal(1);

      // Vérifier que le document est enregistré
      const doc = await documentCertifier.verifyDocument(1);
      expect(doc.ipfsHash).to.equal(testIpfsHash);
      expect(doc.owner).to.equal(addr1.address);
      expect(doc.exists).to.be.true;
    });

    it("Devrait retourner le bon documentId après certification", async function () {
      const tx = await documentCertifier.connect(addr1).certifyDocument(testIpfsHash);
      const receipt = await tx.wait();

      const event = receipt.logs.find(
        log => documentCertifier.interface.parseLog(log)?.name === "DocumentCertified"
      );
      const parsedEvent = documentCertifier.interface.parseLog(event);
      const documentId = parsedEvent.args.documentId;

      expect(documentId).to.equal(1);
    });

    it("Devrait empêcher la certification avec un hash IPFS vide", async function () {
      await expect(
        documentCertifier.connect(addr1).certifyDocument("")
      ).to.be.revertedWith("Hash IPFS vide");
    });

    it("Devrait permettre de certifier plusieurs documents", async function () {
      const hash1 = "QmHash1";
      const hash2 = "QmHash2";
      const hash3 = "QmHash3";

      await documentCertifier.connect(addr1).certifyDocument(hash1);
      await documentCertifier.connect(addr1).certifyDocument(hash2);
      await documentCertifier.connect(addr2).certifyDocument(hash3);

      expect(await documentCertifier.documentCount()).to.equal(3);
    });

    it("Devrait incrémenter documentCount pour chaque certification", async function () {
      expect(await documentCertifier.documentCount()).to.equal(0);

      await documentCertifier.connect(addr1).certifyDocument("QmHash1");
      expect(await documentCertifier.documentCount()).to.equal(1);

      await documentCertifier.connect(addr1).certifyDocument("QmHash2");
      expect(await documentCertifier.documentCount()).to.equal(2);

      await documentCertifier.connect(addr2).certifyDocument("QmHash3");
      expect(await documentCertifier.documentCount()).to.equal(3);
    });
  });

  describe("Vérification de documents", function () {
    const testIpfsHash = "QmTestHash";

    beforeEach(async function () {
      await documentCertifier.connect(addr1).certifyDocument(testIpfsHash);
    });

    it("Devrait retourner les informations complètes d'un document existant", async function () {
      const [ipfsHash, owner, timestamp, exists] = await documentCertifier.verifyDocument(1);

      expect(ipfsHash).to.equal(testIpfsHash);
      expect(owner).to.equal(addr1.address);
      expect(timestamp).to.be.greaterThan(0);
      expect(exists).to.be.true;
    });

    it("Devrait retourner exists=false pour un document inexistant", async function () {
      const [ipfsHash, docOwner, timestamp, exists] = await documentCertifier.verifyDocument(999);

      expect(ipfsHash).to.equal("");
      expect(docOwner).to.equal(ethers.ZeroAddress);
      expect(timestamp).to.equal(0);
      expect(exists).to.be.false;
    });
  });

  describe("Récupération des documents utilisateur", function () {
    beforeEach(async function () {
      // Certifier plusieurs documents pour différents utilisateurs
      await documentCertifier.connect(addr1).certifyDocument("QmHash1");
      await documentCertifier.connect(addr1).certifyDocument("QmHash2");
      await documentCertifier.connect(addr2).certifyDocument("QmHash3");
      await documentCertifier.connect(addr1).certifyDocument("QmHash4");
    });

    it("Devrait retourner tous les documents d'un utilisateur", async function () {
      const userDocs = await documentCertifier.getUserDocuments(addr1.address);
      expect(userDocs.length).to.equal(3);
      expect(userDocs[0]).to.equal(1);
      expect(userDocs[1]).to.equal(2);
      expect(userDocs[2]).to.equal(4);
    });

    it("Devrait retourner un tableau vide pour un utilisateur sans documents", async function () {
      const userDocs = await documentCertifier.getUserDocuments(addr3.address);
      expect(userDocs.length).to.equal(0);
    });

    it("Devrait retourner les bons documents pour chaque utilisateur", async function () {
      const addr1Docs = await documentCertifier.getUserDocuments(addr1.address);
      const addr2Docs = await documentCertifier.getUserDocuments(addr2.address);

      expect(addr1Docs.length).to.equal(3);
      expect(addr2Docs.length).to.equal(1);
      expect(addr2Docs[0]).to.equal(3);
    });
  });

  describe("Transfert de documents", function () {
    const testIpfsHash = "QmTransferHash";

    beforeEach(async function () {
      await documentCertifier.connect(addr1).certifyDocument(testIpfsHash);
    });

    it("Devrait permettre au propriétaire de transférer un document", async function () {
      const tx = await documentCertifier.connect(addr1).transferDocument(1, addr2.address);
      const receipt = await tx.wait();

      // Vérifier l'événement
      const event = receipt.logs.find(
        log => documentCertifier.interface.parseLog(log)?.name === "DocumentTransferred"
      );
      expect(event).to.not.be.undefined;

      const parsedEvent = documentCertifier.interface.parseLog(event);
      expect(parsedEvent.args.documentId).to.equal(1);
      expect(parsedEvent.args.from).to.equal(addr1.address);
      expect(parsedEvent.args.to).to.equal(addr2.address);

      // Vérifier que le propriétaire a changé
      const doc = await documentCertifier.verifyDocument(1);
      expect(doc.owner).to.equal(addr2.address);

      // Vérifier que le document est dans la liste du nouveau propriétaire
      const newOwnerDocs = await documentCertifier.getUserDocuments(addr2.address);
      expect(newOwnerDocs).to.include(1n);
    });

    it("Devrait empêcher un non-propriétaire de transférer un document", async function () {
      await expect(
        documentCertifier.connect(addr2).transferDocument(1, addr3.address)
      ).to.be.revertedWith("Vous n'etes pas le proprietaire");
    });

    it("Devrait empêcher le transfert vers l'adresse zéro", async function () {
      await expect(
        documentCertifier.connect(addr1).transferDocument(1, ethers.ZeroAddress)
      ).to.be.revertedWith("Adresse invalide");
    });

    it("Devrait empêcher le transfert d'un document inexistant", async function () {
      await expect(
        documentCertifier.connect(addr1).transferDocument(999, addr2.address)
      ).to.be.revertedWith("Document inexistant");
    });

    it("Devrait permettre plusieurs transferts successifs", async function () {
      // Transfert 1: addr1 -> addr2
      await documentCertifier.connect(addr1).transferDocument(1, addr2.address);
      let doc = await documentCertifier.verifyDocument(1);
      expect(doc.owner).to.equal(addr2.address);

      // Transfert 2: addr2 -> addr3
      await documentCertifier.connect(addr2).transferDocument(1, addr3.address);
      doc = await documentCertifier.verifyDocument(1);
      expect(doc.owner).to.equal(addr3.address);
    });
  });

  describe("Vérification d'existence de hash", function () {
    const existingHash = "QmExistingHash";
    const nonExistingHash = "QmNonExistingHash";

    beforeEach(async function () {
      await documentCertifier.connect(addr1).certifyDocument(existingHash);
      await documentCertifier.connect(addr2).certifyDocument("QmAnotherHash");
    });

    it("Devrait retourner true et le documentId pour un hash existant", async function () {
      const [exists, documentId] = await documentCertifier.checkHashExists(existingHash);
      expect(exists).to.be.true;
      expect(documentId).to.equal(1);
    });

    it("Devrait retourner false et 0 pour un hash inexistant", async function () {
      const [exists, documentId] = await documentCertifier.checkHashExists(nonExistingHash);
      expect(exists).to.be.false;
      expect(documentId).to.equal(0);
    });

    it("Devrait trouver le bon documentId même après plusieurs certifications", async function () {
      // Certifier un nouveau document avec un hash spécifique
      await documentCertifier.connect(addr1).certifyDocument("QmTargetHash");

      const [exists, documentId] = await documentCertifier.checkHashExists("QmTargetHash");
      expect(exists).to.be.true;
      // Le documentId devrait être 3 (après les 2 certifications du beforeEach)
      expect(documentId).to.equal(3);
    });

    it("Devrait retourner le premier documentId trouvé si le hash existe plusieurs fois (cas théorique)", async function () {
      // Note: Dans l'implémentation actuelle, un même hash peut être certifié plusieurs fois
      // Le checkHashExists retourne le premier trouvé
      await documentCertifier.connect(addr1).certifyDocument(existingHash); // Duplique le hash

      const [exists, documentId] = await documentCertifier.checkHashExists(existingHash);
      expect(exists).to.be.true;
      expect(documentId).to.equal(1); // Retourne le premier trouvé
    });
  });

  describe("Scénarios complexes", function () {
    it("Devrait gérer correctement un utilisateur avec de nombreux documents", async function () {
      const numberOfDocs = 10;
      for (let i = 0; i < numberOfDocs; i++) {
        await documentCertifier.connect(addr1).certifyDocument(`QmHash${i}`);
      }

      const userDocs = await documentCertifier.getUserDocuments(addr1.address);
      expect(userDocs.length).to.equal(numberOfDocs);
      expect(await documentCertifier.documentCount()).to.equal(numberOfDocs);
    });

    it("Devrait maintenir l'intégrité après transfert et nouvelle certification", async function () {
      // Certifier un document
      await documentCertifier.connect(addr1).certifyDocument("QmHash1");
      
      // Transférer
      await documentCertifier.connect(addr1).transferDocument(1, addr2.address);
      
      // Note: Le contrat actuel ne retire pas le document de la liste de l'ancien propriétaire
      // Le document reste dans la liste de addr1 mais appartient maintenant à addr2
      let addr1Docs = await documentCertifier.getUserDocuments(addr1.address);
      // Le document reste dans la liste (comportement actuel du contrat)
      expect(addr1Docs.length).to.equal(1);
      
      // Vérifier que addr2 a le document
      let addr2Docs = await documentCertifier.getUserDocuments(addr2.address);
      expect(addr2Docs).to.include(1n);
      
      // Certifier un nouveau document pour addr1
      await documentCertifier.connect(addr1).certifyDocument("QmHash2");
      
      // Vérifier que addr1 a maintenant 2 documents (l'ancien transféré + le nouveau)
      // Note: Le contrat ne retire pas les documents transférés de la liste
      addr1Docs = await documentCertifier.getUserDocuments(addr1.address);
      expect(addr1Docs.length).to.equal(2);
      expect(addr1Docs).to.include(1n); // L'ancien document (transféré mais toujours dans la liste)
      expect(addr1Docs).to.include(2n); // Le nouveau document
    });
  });
});

