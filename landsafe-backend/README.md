# LandSafe Backend - API de coffre-fort numérique pour documents fonciers

## 📋 Description

API REST sécurisée pour la gestion de documents fonciers avec certification blockchain sur Polygon.

## 🏗️ Architecture

**Stack technique** :
- Backend : Node.js + Express
- Base de données : PostgreSQL
- Authentification : Firebase Auth (JWT)
- Stockage : IPFS via Pinata
- Blockchain : Polygon Amoy Testnet
- Smart Contract : DocumentCertifier (0xD020Ae0F5B60d2E9d68749D8DF16f0Ce2E523f7F)

## 📦 Installation

```bash
cd landsafe-backend
npm install
```

## 🔧 Configuration

### 1. PostgreSQL

Créer la base de données :

```bash
psql -U postgres
CREATE DATABASE landsafe_db;
CREATE USER landsafe_user WITH PASSWORD 'votre_mot_de_passe';
GRANT ALL PRIVILEGES ON DATABASE landsafe_db TO landsafe_user;
```

Exécuter les migrations :

```bash
psql -U landsafe_user -d landsafe_db < init.sql
psql -U landsafe_user -d landsafe_db < migrations/add-blockchain-columns.sql
psql -U landsafe_user -d landsafe_db < migrations/add-encryption-metadata.sql
```

### 2. Variables d'environnement

Créer `config/.env` :

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
WALLET_PRIVATE_KEY=0x...
CONTRACT_ADDRESS=0xD020Ae0F5B60d2E9d68749D8DF16f0Ce2E523f7F

# App
PORT=3000
NODE_ENV=development
```

### 3. Firebase

Télécharger le fichier `firebase-service-account.json` depuis la console Firebase et le placer dans `config/`

## 🚀 Démarrage

```bash
node server.js
```

Le serveur démarre sur http://localhost:3000

Health check : http://localhost:3000/health

## 📝 Routes API

### Documents

**Upload et certification**

POST /api/documents/upload-document

Headers: Authorization: Bearer <firebase_token>

Body: multipart/form-data avec file

Workflow :

1. **Chiffrement** : Chiffrement AES-256-GCM du fichier (avec mot de passe utilisateur ou généré)
2. Upload fichier chiffré sur IPFS
3. Certification sur blockchain Polygon
4. Enregistrement en base de données avec métadonnées de chiffrement

**Paramètres optionnels** :
- `password` : Mot de passe pour chiffrer (si absent, un mot de passe sécurisé est généré)

Réponse :

```json
{
  "success": true,
  "document": { ... },
  "blockchain": {
    "documentId": "7",
    "transactionHash": "0x...",
    "explorerUrl": "https://amoy.polygonscan.com/tx/0x..."
  }
}
```

**Liste des documents**

GET /api/documents/:userId

Headers: Authorization: Bearer <firebase_token>

Retourne tous les documents d'un utilisateur avec infos blockchain

**Document par ID**

GET /api/documents/by-id/:id

Headers: Authorization: Bearer <firebase_token>

Retourne un document avec vérification blockchain en temps réel

**Vérification blockchain**

GET /api/documents/verify-blockchain/:id

Headers: Authorization: Bearer <firebase_token>

Vérifie l'authenticité d'un document sur la blockchain

**Téléchargement et déchiffrement**

POST /api/documents/download/:id

Headers: Authorization: Bearer <firebase_token>

Body (JSON):
```json
{
  "password": "mot_de_passe_de_chiffrement"
}
```

Télécharge le document depuis IPFS et le déchiffre avec le mot de passe fourni.

**Réponse** : Fichier déchiffré (binary)

**Erreurs possibles** :
- `400 Bad Request` : Mot de passe manquant
- `401 Unauthorized` : Mot de passe incorrect
- `404 Not Found` : Document non trouvé

### Transmissions

**Créer une transmission**

POST /api/transmissions

Headers: Authorization: Bearer <firebase_token>

Body: {
  "document_id": "uuid",
  "héritiers_json": [...],
  "video_url": "...",
  "witnesses": [...],
  "gps_lat": 48.8566,
  "gps_long": 2.3522
}

**Récupérer une transmission**

GET /api/transmissions/:id

Headers: Authorization: Bearer <firebase_token>

## 🔍 Tests

**Tests unitaires blockchain** :

```bash
cd ../smart-contracts
npx hardhat test
```

**Tests E2E blockchain** :

```bash
node test-e2e-blockchain.js
```

**Tests d'intégration API** :

```bash
node test-api-blockchain-integration.js
```

**Tests de chiffrement** :

```bash
node test/encryption.test.js
```

## 🔒 Sécurité

### Chiffrement des documents

✅ **IMPLÉMENTÉ** : Tous les documents sont chiffrés avec **AES-256-GCM** avant upload sur IPFS.

**Caractéristiques** :
- Algorithme : AES-256-GCM (256 bits)
- Dérivation de clé : scrypt
- Salt aléatoire : 64 bytes (unique par fichier)
- IV aléatoire : 16 bytes (unique par chiffrement)
- Tag d'authentification : 16 bytes (intégrité garantie)

**Gestion des mots de passe** :
- Si l'utilisateur fournit un mot de passe : utilisé pour chiffrer
- Si aucun mot de passe : génération automatique d'un mot de passe sécurisé (retourné dans la réponse API)
- ⚠️ **IMPORTANT** : Le mot de passe généré doit être sauvegardé par l'utilisateur. Perte = document irrécupérable.

**Documentation complète** : Voir `docs/ENCRYPTION.md`

### Bonnes pratiques

- Ne JAMAIS commiter `.env` dans Git
- Utiliser des wallets dédiés pour testnet/production
- Activer le rate limiting en production
- Logs d'audit pour toutes les opérations sensibles
- Sauvegarder les mots de passe de chiffrement dans un gestionnaire de mots de passe sécurisé

## 💰 Coûts

**Testnet Amoy** (développement) :
- POL gratuits via https://faucet.polygon.technology/
- Certification : ~150,000 gas (~0.005 POL / ~$0.01)
- 7 documents certifiés à ce jour

**Production Polygon Mainnet** :
- Certification : ~$0.01-0.02 par document
- Budget estimé 1000 docs : ~$10-20

## 📊 Monitoring

**Statistiques actuelles** :
- Documents certifiés : 7
- Solde wallet : 0.06+ POL
- Smart contract : https://amoy.polygonscan.com/address/0xD020Ae0F5B60d2E9d68749D8DF16f0Ce2E523f7F

## 🚧 Limitations connues

1. **Mot de passe perdu** : Si l'utilisateur perd son mot de passe de chiffrement, le document est irrécupérable (par design)
2. **Testnet** : Amoy peut être instable, prévoir fallback RPC
3. **Scalabilité** : Recherche de hash linéaire dans smart contract (OK pour MVP)
4. **Documents anciens** : Les documents uploadés avant l'implémentation du chiffrement ne sont pas chiffrés (`is_encrypted = false`)

## 🔄 Workflow complet

### Upload

```
User upload document (+ mot de passe optionnel)
↓
Backend reçoit fichier
↓
Chiffrement AES-256-GCM (avec mot de passe ou généré)
↓
Upload fichier chiffré sur IPFS/Pinata → Hash
↓
Certification blockchain → documentId, txHash
↓
Enregistrement PostgreSQL + métadonnées chiffrement
↓
Retour success avec lien Polygonscan (+ mot de passe si généré)
```

### Download

```
User demande téléchargement avec mot de passe
↓
Backend récupère document depuis DB
↓
Téléchargement fichier chiffré depuis IPFS
↓
Déchiffrement AES-256-GCM avec mot de passe
↓
Retour fichier déchiffré à l'utilisateur
```

## 📚 Documentation technique

- Smart contract : `../smart-contracts/README.md`
- Tests blockchain : `../smart-contracts/test/`
- Chiffrement : `docs/ENCRYPTION.md`
- Architecture : Voir diagrammes dans `/docs`

## 🛠️ Maintenance

**Mise à jour des dépendances** :

```bash
npm update
npm audit fix
```

**Backup base de données** :

```bash
pg_dump -U landsafe_user landsafe_db > backup_$(date +%Y%m%d).sql
```

## 📞 Support

- Backend : landsafe-backend/
- Smart contracts : smart-contracts/
- Logs : Console serveur + PostgreSQL logs

## 🎯 Prochaines étapes

1. ✅ **Chiffrement implémenté** (Étape 6.5) - TERMINÉ
2. ⏳ Créer le frontend (dashboard, upload UI)
3. ⏳ Audit de sécurité du smart contract
4. ⏳ Tests de charge (1000+ documents)
5. ⏳ Migration vers Polygon mainnet

---

**Projet** : LandSafe

**Status** : MVP Blockchain + Chiffrement Opérationnel (100%)

**Date** : Novembre 2024
