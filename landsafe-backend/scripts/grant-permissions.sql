-- Script pour donner les droits à landsafe_user sur le schema public de landsafe_db
-- À exécuter en étant connecté à la base landsafe_db

-- Donner les droits d'utilisation et de création sur le schema public
GRANT USAGE ON SCHEMA public TO landsafe_user;
GRANT CREATE ON SCHEMA public TO landsafe_user;

-- Donner tous les droits sur toutes les tables existantes et futures
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO landsafe_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO landsafe_user;

-- Si des tables existent déjà, leur donner les droits
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO landsafe_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO landsafe_user;

