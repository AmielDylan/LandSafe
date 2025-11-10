# 🏛️ LandSafe - Coffre-fort blockchain pour documents fonciers

> Système sécurisé de gestion et certification de documents fonciers avec chiffrement bout-en-bout et certification blockchain immuable.

[![Blockchain](https://img.shields.io/badge/Blockchain-Polygon-8247E5)](https://polygon.technology/)
[![Smart Contract](https://img.shields.io/badge/Smart%20Contract-Solidity-363636)](https://soliditylang.org/)
[![Encryption](https://img.shields.io/badge/Encryption-AES--256--GCM-red)](https://en.wikipedia.org/wiki/Galois/Counter_Mode)
[![Storage](https://img.shields.io/badge/Storage-IPFS-65C2CB)](https://ipfs.tech/)
[![Tests](https://img.shields.io/badge/Tests-36%2F36%20passing-brightgreen)](.)

---

## 📋 Vue d'ensemble

**LandSafe** est une plateforme complète permettant de :

- ✅ **Stocker** des documents fonciers de manière sécurisée et décentralisée
- ✅ **Chiffrer** les documents avec AES-256-GCM avant stockage
- ✅ **Certifier** l'authenticité via la blockchain Polygon
- ✅ **Garantir** l'immuabilité et la traçabilité des documents
- ✅ **Gérer** les transmissions successorales avec preuves cryptographiques

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    UTILISATEUR                              │
│                  (Firebase Auth JWT)                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   API REST (Node.js/Express)                │
│  POST /upload-document | GET /documents | POST /download    │
└────────┬────────────────┬──────────────────┬────────────────┘
         │                │                  │
         ▼                ▼                  ▼
┌──────────────┐  ┌───────────────┐  ┌──────────────┐
│ Chiffrement  │  │   IPFS/       │  │  Blockchain  │
│ AES-256-GCM  │→ │   Pinata      │→ │   Polygon    │
│              │  │ (décentralisé)│  │   Amoy       │
└──────────────┘  └───────────────┘  └──────────────┘
         │                │                  │
         ▼                ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│              PostgreSQL (métadonnées + infos)               │
│  documents | encryption_metadata | transmissions            │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Démarrage rapide

### Prérequis

- Node.js v18+
- PostgreSQL 14+
- Compte Firebase (pour authentification)
- Compte Pinata (pour IPFS)
- Wallet MetaMask avec POL testnet

### Installation

```bash
# Cloner le projet
git clone https://github.com/votre-repo/landsafe.git
cd landsafe

# Backend
cd landsafe-backend
npm install

# Smart contracts
cd ../smart-contracts
npm install
```

### Configuration

#### PostgreSQL

```bash
psql -U postgres
CREATE DATABASE landsafe_db;
CREATE USER landsafe_user WITH PASSWORD 'votre_mot_de_passe';
GRANT ALL PRIVILEGES ON DATABASE landsafe_db TO landsafe_user;

# Migrations
cd landsafe-backend
psql -U landsafe_user -d landsafe_db < init.sql
psql -U landsafe_user -d landsafe_db < migrations/add-blockchain-columns.sql
psql -U landsafe_user -d landsafe_db < migrations/add-encryption-metadata.sql
```

#### Variables d'environnement

Créer `landsafe-backend/config/.env` :

```env
# PostgreSQL
PGHOST=localhost
PGUSER=landsafe_user
PGPASSWORD=votre_mot_de_passe
PGDATABASE=landsafe_db
PGPORT=5432

# Firebase
FIREBASE_CREDENTIALS_PATH=./config/firebase-service-account.json

# IPFS (Pinata)
PINATA_JWT=votre_jwt_pinata

# Blockchain (Polygon Amoy)
POLYGON_TESTNET_RPC_URL=https://rpc-amoy.polygon.technology/
CHAIN_ID=80002
WALLET_PRIVATE_KEY=0xVOTRE_CLE_PRIVEE
CONTRACT_ADDRESS=0xD020Ae0F5B60d2E9d68749D8DF16f0Ce2E523f7F

# App
PORT=3000
NODE_ENV=development
```

### Démarrer le serveur

```bash
cd landsafe-backend
node server.js
```

API disponible sur : http://localhost:3000

---

## 📦 Composants

### 1. Smart Contract (Solidity)

- **Fichier** : `smart-contracts/contracts/DocumentCertifier.sol`
- **Réseau** : Polygon Amoy Testnet (ChainID: 80002)
- **Adresse** : `0xD020Ae0F5B60d2E9d68749D8DF16f0Ce2E523f7F`
- **Explorer** : [Voir sur Polygonscan](https://amoy.polygonscan.com/address/0xD020Ae0F5B60d2E9d68749D8DF16f0Ce2E523f7F)

**Fonctions principales** :
- `certifyDocument(ipfsHash)` : Certifie un document
- `verifyDocument(documentId)` : Vérifie un document
- `getUserDocuments(address)` : Liste les documents d'un utilisateur
- `transferDocument(documentId, newOwner)` : Transfère la propriété

### 2. Backend API (Node.js/Express)

- **Fichier** : `landsafe-backend/server.js`
- **Port** : 3000
- **Documentation** : Voir `landsafe-backend/README.md`

**Routes principales** :
- `POST /api/documents/upload-document` : Upload + chiffrement + certification
- `GET /api/documents/:userId` : Liste des documents
- `GET /api/documents/by-id/:id` : Document avec vérification blockchain
- `POST /api/documents/download/:id` : Téléchargement + déchiffrement
- `GET /api/documents/verify-blockchain/:id` : Vérification blockchain
- `POST /api/transmissions` : Création de transmission
- `GET /api/transmissions/:id` : Détails de transmission

### 3. Module de chiffrement

- **Fichier** : `landsafe-backend/utils/encryption.js`
- **Algorithme** : AES-256-GCM
- **Dérivation de clé** : scrypt
- **Overhead** : 96 bytes par fichier (14.3% en moyenne)

---

## 🔒 Sécurité

### Chiffrement

- **Algorithme** : AES-256-GCM (authentification intégrée)
- **Dérivation de clé** : scrypt (résistant aux attaques brute-force)
- **Salt** : 64 bytes aléatoire par fichier
- **IV** : 16 bytes aléatoire par chiffrement
- **Auth Tag** : 16 bytes pour vérification d'intégrité

### Workflow sécurisé

```
Document original
    ↓
🔒 Chiffrement AES-256-GCM
    ↓
Upload sur IPFS (fichier chiffré, illisible)
    ↓
Hash IPFS certifié sur blockchain (immuable)
    ↓
Métadonnées stockées en PostgreSQL
```

### Garanties

✅ **Confidentialité** : Documents illisibles sur IPFS sans mot de passe  
✅ **Intégrité** : Auth Tag GCM détecte toute corruption  
✅ **Authenticité** : Blockchain certifie le hash IPFS  
✅ **Immuabilité** : Impossible de modifier un document certifié  
✅ **Traçabilité** : Toutes les actions sont auditées

---

## 🧪 Tests

### Tests unitaires

```bash
# Smart contract (Hardhat)
cd smart-contracts
npx hardhat test
# Résultat : 22/22 tests passent

# Module de chiffrement
cd landsafe-backend
node test/encryption.test.js
# Résultat : 9/9 tests passent
```

### Tests End-to-End

```bash
# Test blockchain E2E
cd landsafe-backend
node test-e2e-blockchain.js
# Résultat : 5/5 tests passent

# Test chiffrement E2E
node test-e2e-encryption.js
# Résultat : 9/9 tests passent
```

**Total : 36/36 tests validés ✅**

---

## 📊 Statistiques

### Documents certifiés

- **Total** : 8 documents
- **Coût moyen** : 0.006 POL (~$0.01 USD)
- **Gas moyen** : 190,000 gas
- **Temps moyen** : 4-6 secondes

### Performance

- **Chiffrement** : <100ms
- **Upload IPFS** : 2-3 secondes
- **Certification blockchain** : 4-6 secondes
- **Téléchargement + déchiffrement** : 2-3 secondes

### Coûts (Polygon Mainnet)

- **Certification** : ~$0.01 par document
- **1000 documents** : ~$10 USD
- **Stockage IPFS** : Plan gratuit Pinata jusqu'à 1GB

---

## 📚 Documentation

- **Backend** : [landsafe-backend/README.md](./landsafe-backend/README.md)
- **Smart Contracts** : [smart-contracts/README.md](./smart-contracts/README.md)
- **Chiffrement** : [landsafe-backend/docs/ENCRYPTION.md](./landsafe-backend/docs/ENCRYPTION.md)
- **API** : Voir routes dans le code

---

## 🚧 Limitations connues

### MVP v1.0

- ⚠️ Chiffrement côté serveur (le serveur voit brièvement le fichier en clair)
- ⚠️ Pas de récupération de mot de passe (perte = document irrécupérable)
- ⚠️ Testnet Amoy (migration mainnet nécessaire pour production)
- ⚠️ Recherche de hash linéaire dans smart contract (à optimiser)

### Améliorations futures (v2)

- 🔄 Chiffrement côté client (zero-knowledge)
- 🔄 Système de récupération de clés (escrow, multi-sig)
- 🔄 Partage de documents chiffrés (re-chiffrement)
- 🔄 HSM pour gestion des clés en production
- 🔄 Migration Polygon PoS mainnet
- 🔄 Interface frontend complète
- 🔄 Optimisation smart contract (mapping pour recherche)

---

## 💰 Budget & Coûts

### Testnet (développement)

- **POL Amoy** : Gratuit via [faucet](https://faucet.polygon.technology/)
- **Coût actuel** : 0 USD (testnet)

### Production (estimation)

- **Déploiement smart contract** : ~$5 USD (une fois)
- **Certification par document** : ~$0.01 USD
- **Budget 1000 documents** : ~$15 USD
- **IPFS/Pinata** : $0-20/mois selon volume
- **Serveur backend** : $10-50/mois
- **PostgreSQL** : $10-30/mois

**Total estimé** : ~$50-100/mois pour 1000 certifications

---

## 🛠️ Stack technique

| Composant | Technologie |
|-----------|-------------|
| **Backend** | Node.js + Express |
| **Base de données** | PostgreSQL 14+ |
| **Authentification** | Firebase Auth (JWT) |
| **Chiffrement** | AES-256-GCM (crypto natif) |
| **Stockage** | IPFS via Pinata |
| **Blockchain** | Polygon Amoy Testnet |
| **Smart Contract** | Solidity 0.8.20 |
| **Framework SC** | Hardhat 2.27.0 |
| **Tests** | Mocha, Chai, Hardhat |
| **Librairies** | ethers.js v6, axios, multer |

---

## 🎯 Cas d'usage

### 1. Certification de titre de propriété

```
- Upload du titre foncier scanné
- Chiffrement automatique AES-256
- Certification blockchain immuable
- Preuve d'authenticité vérifiable publiquement
```

### 2. Transmission successorale sécurisée

```
- Enregistrement de la volonté de transmission
- Liste des héritiers avec coordonnées GPS
- Témoins et vidéo de déclaration
- Certification blockchain de l'ensemble
```

### 3. Archivage légal longue durée

```
- Documents fonciers stockés 30+ ans
- Immuabilité garantie par blockchain
- Récupération possible à tout moment
- Preuve de conservation horodatée
```

---

## 🔗 Liens utiles

- **Polygon Amoy Explorer** : https://amoy.polygonscan.com/
- **Contrat déployé** : https://amoy.polygonscan.com/address/0xD020Ae0F5B60d2E9d68749D8DF16f0Ce2E523f7F
- **Faucet Amoy** : https://faucet.polygon.technology/
- **Pinata Gateway** : https://gateway.pinata.cloud/ipfs/
- **Documentation Polygon** : https://docs.polygon.technology/
- **Documentation Hardhat** : https://hardhat.org/docs

---

## 👥 Contribution

Ce projet est actuellement en phase MVP. Les contributions sont les bienvenues pour :

- Optimisation du smart contract
- Interface frontend
- Tests supplémentaires
- Documentation
- Traductions

---

## 📄 Licence

MIT License - Voir [LICENSE](./LICENSE)

---

## 🎉 Remerciements

Construit avec :

- [Polygon](https://polygon.technology/) - Blockchain scalable
- [IPFS](https://ipfs.tech/) - Stockage décentralisé
- [Pinata](https://pinata.cloud/) - IPFS pinning
- [Hardhat](https://hardhat.org/) - Framework Solidity
- [Firebase](https://firebase.google.com/) - Authentification

---

## 📞 Support

Pour toute question ou problème :

- Ouvrir une issue sur GitHub
- Consulter la documentation dans `/docs`
- Vérifier les logs du serveur

---

**Projet** : LandSafe v1.0 MVP  
**Statut** : ✅ Production-ready (testnet)  
**Date** : Novembre 2024

**⚠️ Note** : Ce projet utilise actuellement Polygon Amoy (testnet). Migration vers Polygon PoS mainnet nécessaire pour usage en production.

---

<div align="center">

**🔒 Sécurisé • ⛓️ Décentralisé • 🌐 Transparent**

Made with ❤️ by Amiel ADJOVI

</div>

