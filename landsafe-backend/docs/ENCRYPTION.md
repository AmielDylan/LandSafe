# Système de chiffrement LandSafe

## 📋 Vue d'ensemble

LandSafe utilise un système de chiffrement **AES-256-GCM** pour garantir la confidentialité des documents fonciers avant leur stockage sur IPFS. Ce système garantit que même si quelqu'un obtient le hash IPFS, il ne peut pas lire le contenu sans le mot de passe de déchiffrement.

## 🔐 Architecture technique

### Algorithme
- **Algorithme** : AES-256-GCM (Advanced Encryption Standard avec Galois/Counter Mode)
- **Taille de clé** : 256 bits (32 bytes)
- **Dérivation de clé** : scrypt (RFC 7914)
- **Taille du salt** : 512 bits (64 bytes)
- **Taille de l'IV** : 128 bits (16 bytes)
- **Taille du tag d'authentification** : 128 bits (16 bytes)

### Pourquoi AES-256-GCM ?

1. **Confidentialité** : AES-256 est l'un des algorithmes de chiffrement les plus sécurisés
2. **Authentification** : GCM fournit un tag d'authentification qui garantit l'intégrité des données
3. **Performance** : GCM est rapide et efficace pour les gros fichiers
4. **Standard** : Utilisé par les services cloud majeurs (AWS, Google Cloud, etc.)

## 🔄 Workflow de chiffrement

### Upload (Chiffrement)

```
1. Utilisateur upload un fichier
   ↓
2. Backend reçoit le fichier (Buffer)
   ↓
3. Génération ou récupération du mot de passe
   ↓
4. Chiffrement AES-256-GCM :
   - Génération salt aléatoire (64 bytes)
   - Génération IV aléatoire (16 bytes)
   - Dérivation de la clé via scrypt(password, salt)
   - Chiffrement du fichier
   - Génération du tag d'authentification (16 bytes)
   ↓
5. Format final : [salt][iv][authTag][données chiffrées]
   ↓
6. Upload du fichier chiffré sur IPFS
   ↓
7. Certification blockchain du hash IPFS
   ↓
8. Enregistrement en base de données avec métadonnées
```

### Download (Déchiffrement)

```
1. Utilisateur demande le téléchargement avec mot de passe
   ↓
2. Backend récupère le document depuis la DB
   ↓
3. Téléchargement du fichier chiffré depuis IPFS
   ↓
4. Extraction des composants :
   - salt (64 bytes)
   - IV (16 bytes)
   - authTag (16 bytes)
   - données chiffrées (reste)
   ↓
5. Dérivation de la clé via scrypt(password, salt)
   ↓
6. Déchiffrement AES-256-GCM avec vérification du tag
   ↓
7. Retour du fichier déchiffré à l'utilisateur
```

## 📦 Structure des données chiffrées

Le fichier chiffré est structuré comme suit :

```
[Salt: 64 bytes][IV: 16 bytes][AuthTag: 16 bytes][Données chiffrées: variable]
```

**Taille totale** = 64 + 16 + 16 + taille_données_chiffrées

**Exemple** :
- Fichier original : 100 KB
- Fichier chiffré : ~100 KB + 96 bytes (overhead)

## 🔑 Gestion des mots de passe

### Génération automatique

Si l'utilisateur ne fournit pas de mot de passe lors de l'upload, le système génère automatiquement un mot de passe sécurisé de 32 bytes encodé en base64 (≈44 caractères).

**⚠️ IMPORTANT** : Le mot de passe généré est retourné dans la réponse API. L'utilisateur **DOIT** le sauvegarder, car :
- Il n'est pas stocké en clair dans la base de données
- Seul un hash est stocké (pour vérification optionnelle)
- **Perte du mot de passe = document irrécupérable**

### Mot de passe utilisateur

L'utilisateur peut fournir son propre mot de passe lors de l'upload. Dans ce cas :
- Le mot de passe n'est jamais stocké en clair
- Un hash (scrypt) est stocké dans `encryption_metadata.password_hash`
- Le hash peut être utilisé pour vérifier le mot de passe (optionnel)

## 🗄️ Base de données

### Table `encryption_metadata`

```sql
CREATE TABLE encryption_metadata (
    id UUID PRIMARY KEY,
    document_id UUID UNIQUE REFERENCES documents(id),
    algorithm VARCHAR(50) DEFAULT 'aes-256-gcm',
    key_derivation VARCHAR(50) DEFAULT 'scrypt',
    salt_length INTEGER DEFAULT 64,
    iv_length INTEGER DEFAULT 16,
    tag_length INTEGER DEFAULT 16,
    password_hash TEXT,  -- Hash du mot de passe (optionnel)
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Colonnes ajoutées à `documents`

```sql
ALTER TABLE documents 
ADD COLUMN is_encrypted BOOLEAN DEFAULT TRUE,
ADD COLUMN encryption_method VARCHAR(50) DEFAULT 'aes-256-gcm';
```

## 🔒 Sécurité

### Points forts

1. **Chiffrement fort** : AES-256 est considéré comme inviolable avec les technologies actuelles
2. **Authentification** : GCM garantit que les données n'ont pas été modifiées
3. **Salt aléatoire** : Chaque fichier a un salt unique, empêchant les attaques par dictionnaire
4. **IV aléatoire** : Chaque chiffrement produit un résultat différent
5. **Pas de stockage en clair** : Le mot de passe n'est jamais stocké en clair

### Limitations connues

1. **Mot de passe perdu** : Si l'utilisateur perd son mot de passe, le document est irrécupérable
2. **Pas de récupération** : Aucun mécanisme de récupération de mot de passe (par design)
3. **Performance** : Le chiffrement/déchiffrement ajoute un overhead (négligeable pour la plupart des fichiers)

### Recommandations

1. **Sauvegarder le mot de passe** : Utiliser un gestionnaire de mots de passe (1Password, LastPass, etc.)
2. **Mot de passe fort** : Si l'utilisateur fournit son propre mot de passe, utiliser au moins 16 caractères avec majuscules, minuscules, chiffres et symboles
3. **Backup** : Conserver une copie du mot de passe dans un endroit sûr (coffre-fort physique, etc.)

## 📝 API

### Upload avec chiffrement

**POST** `/api/documents/upload-document`

**Body** (multipart/form-data):
- `file`: Fichier à uploader
- `titre`: Titre du document
- `type`: Type de document
- `password`: Mot de passe (optionnel, généré si absent)

**Réponse** (si mot de passe généré):
```json
{
  "success": true,
  "document": { ... },
  "blockchain": { ... },
  "encryption": {
    "password": "base64_encoded_password_here",
    "warning": "⚠️ SAUVEGARDEZ CE MOT DE PASSE ! ...",
    "encrypted": true,
    "algorithm": "aes-256-gcm"
  }
}
```

### Téléchargement avec déchiffrement

**POST** `/api/documents/download/:id`

**Body** (JSON):
```json
{
  "password": "mot_de_passe_ici"
}
```

**Réponse** : Fichier déchiffré (binary)

**Erreurs possibles** :
- `400 Bad Request` : Mot de passe manquant
- `401 Unauthorized` : Mot de passe incorrect
- `404 Not Found` : Document non trouvé
- `500 Internal Server Error` : Erreur de déchiffrement ou téléchargement IPFS

## 🧪 Tests

Les tests du module de chiffrement sont disponibles dans `test/encryption.test.js`.

**Exécuter les tests** :
```bash
node test/encryption.test.js
```

**Tests couverts** :
- ✅ Chiffrement puis déchiffrement
- ✅ Contenu modifié par chiffrement
- ✅ Contenu restauré identique
- ✅ Mauvais mot de passe rejeté
- ✅ Génération mot de passe sécurisé
- ✅ Salt/IV aléatoires (deux chiffrements ≠)
- ✅ Fichier vide
- ✅ Fichier volumineux (100 KB+)

## 🔄 Migration depuis documents non chiffrés

Les documents uploadés **avant** l'implémentation du chiffrement ne sont pas chiffrés. Ils ont :
- `is_encrypted = false` (ou NULL)
- Pas d'entrée dans `encryption_metadata`

**Recommandation** : Re-uploader ces documents pour les chiffrer.

## 📚 Références

- [AES-GCM Specification (NIST)](https://csrc.nist.gov/publications/detail/sp/800-38d/final)
- [scrypt (RFC 7914)](https://tools.ietf.org/html/rfc7914)
- [Node.js crypto documentation](https://nodejs.org/api/crypto.html)

## ⚠️ Avertissements

1. **Perte de mot de passe = perte définitive du document**
2. **Le chiffrement ne protège que contre l'accès non autorisé via IPFS**
3. **Le backend a accès aux fichiers déchiffrés pendant le traitement** (nécessaire pour le fonctionnement)
4. **En production, considérer l'utilisation d'un HSM (Hardware Security Module) pour la gestion des clés**

---

**Date de création** : Novembre 2024  
**Version** : 1.0  
**Statut** : Production-ready

