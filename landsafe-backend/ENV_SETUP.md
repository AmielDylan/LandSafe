# Configuration des variables d'environnement

Créez un fichier `.env` à la racine du projet `landsafe-backend/` avec les valeurs suivantes :

```env
# Database Configuration
PGHOST=localhost
PGUSER=landsafe_user
PGPASSWORD=landsafe_password
PGDATABASE=landsafe_db
PGPORT=5432

# Firebase Admin Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email

# IPFS/Pinata Configuration
PINATA_JWT=your-pinata-jwt-token

# Blockchain Configuration
POLYGON_MUMBAI_RPC_URL=https://rpc-mumbai.maticvigil.com
WALLET_PRIVATE_KEY=your-wallet-private-key

# Server Configuration
PORT=3000
NODE_ENV=development
```

## Utilisateur PostgreSQL

L'utilisateur `landsafe_user` a été créé avec les droits suivants :
- Connexion à la base `landsafe_db`
- Création et utilisation du schéma `public`
- Tous les droits (SELECT, INSERT, UPDATE, DELETE) sur les tables existantes et futures
- Tous les droits sur les séquences

Pour recréer l'utilisateur si nécessaire, exécutez :
```bash
psql -d postgres -f scripts/create-user.sql
psql -d landsafe_db -f scripts/grant-permissions.sql
```

