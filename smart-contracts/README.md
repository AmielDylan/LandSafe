# DocumentCertifier - Smart Contract LandSafe

## 📋 Description

Smart contract de certification de documents fonciers sur Polygon Amoy Testnet.

Permet de certifier l'authenticité et la propriété de documents via la blockchain.

## 🏗️ Architecture technique

**Blockchain** : Polygon Amoy Testnet (ChainID: 80002)

**Solidity** : 0.8.20 avec optimizer activé

**Framework** : Hardhat 2.27.0

**Tests** : 22 tests unitaires - 100% de réussite

**Gas estimé** : ~150,000 gas par certification

## 📦 Installation

```bash
cd smart-contracts
npm install
```

## 🔧 Configuration

### Prérequis

1. Node.js v18+
2. Wallet MetaMask avec réseau Amoy configuré
3. POL testnet (obtenir sur https://faucet.polygon.technology/)
4. Fichier .env configuré dans `landsafe-backend/config/.env`

### Variables d'environnement requises

```env
POLYGON_TESTNET_RPC_URL=https://rpc-amoy.polygon.technology/
WALLET_PRIVATE_KEY=0x...
CHAIN_ID=80002
```

Le fichier `hardhat.config.js` pointe vers `../landsafe-backend/config/.env`

## ⚙️ Commandes disponibles

### Compilation

```bash
npx hardhat compile
```

Compile les contrats Solidity dans `artifacts/`

### Tests unitaires

```bash
npx hardhat test
```

Exécute les 22 tests (doit afficher : 22 passing)

### Tests avec rapport de gas

```bash
REPORT_GAS=true npx hardhat test
```

### Déploiement sur Amoy

```bash
npx hardhat run scripts/deploy.js --network amoy
```

⚠️ Vérifiez d'avoir au moins 0.1 POL avant de déployer

### Vérification sur Polygonscan

```bash
npx hardhat verify --network amoy <CONTRACT_ADDRESS>
```

**Note** : Nécessite `POLYGONSCAN_API_KEY` dans le .env (optionnel)

## 📊 Tests unitaires

**Statut** : ✅ 22/22 tests passent

**Couverture** :

- Déploiement initial (1 test)
- Certification de documents (6 tests)
- Vérification de documents (2 tests)
- Récupération des documents utilisateur (3 tests)
- Transfert de documents (5 tests)
- Vérification d'existence de hash (4 tests)
- Scénarios complexes (2 tests)

Lancer les tests :

```bash
npx hardhat test
```

## 📝 Fonctions du contrat

### `certifyDocument(string ipfsHash)` → `uint256`

Certifie un document sur la blockchain.

**Paramètres** :
- `ipfsHash` : Hash IPFS du document chiffré

**Retour** :
- `documentId` : ID unique du document (auto-incrémenté)

**Event émis** :
- `DocumentCertified(documentId, owner, ipfsHash, timestamp)`

**Restrictions** :
- Le hash IPFS ne doit pas être vide

**Gas estimé** : ~150,000

---

### `verifyDocument(uint256 documentId)` → `(string, address, uint256, bool)`

Vérifie les informations d'un document certifié.

**Paramètres** :
- `documentId` : ID du document à vérifier

**Retour** :
- `ipfsHash` : Hash IPFS du document
- `owner` : Adresse du propriétaire actuel
- `timestamp` : Date de certification (Unix timestamp)
- `exists` : True si le document existe

**Vue** : Cette fonction ne coûte pas de gas

---

### `getUserDocuments(address owner)` → `uint256[]`

Liste tous les documents d'un utilisateur.

**Paramètres** :
- `owner` : Adresse Ethereum de l'utilisateur

**Retour** :
- Tableau des IDs de documents possédés

**Vue** : Pas de gas

---

### `transferDocument(uint256 documentId, address newOwner)`

Transfère la propriété d'un document (pour succession/transmission).

**Paramètres** :
- `documentId` : ID du document à transférer
- `newOwner` : Nouvelle adresse propriétaire

**Event émis** :
- `DocumentTransferred(documentId, from, to, timestamp)`

**Restrictions** :
- Seulement le propriétaire actuel peut transférer
- L'adresse de destination ne peut pas être 0x0
- Le document doit exister

**Gas estimé** : ~80,000

---

### `checkHashExists(string ipfsHash)` → `(bool, uint256)`

Vérifie si un hash IPFS a déjà été certifié.

**Paramètres** :
- `ipfsHash` : Hash IPFS à rechercher

**Retour** :
- `exists` : True si le hash existe
- `documentId` : ID du document trouvé (0 si non trouvé)

**Vue** : Pas de gas (mais recherche linéaire, peut être lente si beaucoup de documents)

## 🔗 Après déploiement

### 1. Vérifier le contrat sur Polygonscan

URL : https://amoy.polygonscan.com/address/<CONTRACT_ADDRESS>

Vous pourrez :
- Voir le code source vérifié
- Consulter les transactions
- Interagir directement avec le contrat

### 2. Fichiers générés automatiquement

Le script de déploiement sauvegarde automatiquement :

**`landsafe-backend/config/contract-deployment.json`**

```json
{
  "address": "0x...",
  "network": "Polygon Amoy Testnet",
  "chainId": 80002,
  "deployer": "0x...",
  "timestamp": "2024-11-09T..."
}
```

**`landsafe-backend/config/DocumentCertifier-ABI.json`**

Contient l'ABI complet du contrat pour intégration backend.

### 3. Mettre à jour le .env

Ajoutez l'adresse du contrat déployé :

```env
CONTRACT_ADDRESS=0xVOTRE_ADRESSE_DEPLOYEE
```

## 💰 Coûts estimés

### Testnet Amoy (gratuit)

- POL obtenus via faucet : https://faucet.polygon.technology/
- Certification : ~150,000 gas
- Transfert : ~80,000 gas
- Vérification : 0 gas (fonction view)

### Production Polygon Mainnet

- Prix gas moyen : ~30 Gwei
- Certification : ~0.01 USD
- Budget 1000 certifications : ~10 USD

## ⚠️ Notes importantes

### Limitations MVP

1. **Transfert de documents** : Ne retire pas le document de la liste de l'ancien propriétaire (historique conservé)
2. **Recherche de hash** : `checkHashExists()` utilise une recherche linéaire (acceptable pour testnet, à optimiser en v2 avec mapping)

### Sécurité

- ⚠️ **NE JAMAIS** commiter `WALLET_PRIVATE_KEY` dans Git
- ⚠️ Utiliser un wallet dédié pour le testnet
- ⚠️ Faire auditer le contrat avant production
- ⚠️ Le contrat ne gère PAS le chiffrement (fait côté backend)

### À faire avant production

- [ ] Audit de sécurité du smart contract
- [ ] Tests de charge (10,000+ documents)
- [ ] Optimisation de `checkHashExists()` avec mapping
- [ ] Mécanisme de pause d'urgence
- [ ] Système d'upgrade (proxy pattern)
- [ ] Monitoring des events on-chain

## 📚 Ressources

### Polygon Amoy

- Faucet : https://faucet.polygon.technology/
- Explorer : https://amoy.polygonscan.com/
- RPC : https://rpc-amoy.polygon.technology/
- ChainID : 80002

### Documentation

- Hardhat : https://hardhat.org/docs
- Solidity : https://docs.soliditylang.org/
- Polygon : https://docs.polygon.technology/

### Support

- En cas d'erreur de déploiement : vérifier solde POL
- Tests qui échouent : `npx hardhat clean && npx hardhat compile`
- RPC timeout : essayer une RPC alternative (Alchemy, Infura)

## 🔄 Workflow complet

```
1. Développement local
   ↓
2. Tests unitaires (npx hardhat test)
   ↓
3. Compilation (npx hardhat compile)
   ↓
4. Déploiement testnet (npx hardhat run scripts/deploy.js --network amoy)
   ↓
5. Vérification Polygonscan (npx hardhat verify --network amoy <ADDRESS>)
   ↓
6. Intégration backend (étape 7.7)
```

## 📞 Prochaines étapes

**Après avoir lu ce README** :

1. ✅ Vérifier que les tests passent : `npx hardhat test`
2. ✅ Obtenir du POL : https://faucet.polygon.technology/
3. 🚀 Déployer sur Amoy : `npx hardhat run scripts/deploy.js --network amoy`
4. 🔗 Intégrer dans le backend (voir étape 7.7)

---

**Projet** : LandSafe - Coffre-fort numérique pour documents fonciers

**Date** : Novembre 2024

**Statut** : Testnet Amoy - Prêt pour déploiement

