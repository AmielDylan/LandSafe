-- =====================================================
-- Script d'initialisation de la base de données LandSafe
-- =====================================================

-- Extension pour générer des UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- Types ENUM
-- =====================================================

-- Type pour les rôles utilisateurs
CREATE TYPE user_role AS ENUM ('proprietaire', 'notaire', 'admin');

-- Type pour les types de documents
CREATE TYPE document_type AS ENUM ('titre_foncier', 'succession', 'autre');

-- Type pour les statuts de documents
CREATE TYPE document_status AS ENUM ('en_attente', 'verifie', 'rejete');

-- =====================================================
-- Table: users
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    nom VARCHAR(255),
    rôle user_role NOT NULL DEFAULT 'proprietaire',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index sur l'email pour les recherches rapides
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Index sur le rôle pour les filtres
CREATE INDEX IF NOT EXISTS idx_users_role ON users(rôle);

-- Commentaires sur la table
COMMENT ON TABLE users IS 'Table des utilisateurs de l''application LandSafe';
COMMENT ON COLUMN users.id IS 'Identifiant unique de l''utilisateur (UUID)';
COMMENT ON COLUMN users.email IS 'Adresse email unique de l''utilisateur';
COMMENT ON COLUMN users.nom IS 'Nom complet de l''utilisateur';
COMMENT ON COLUMN users.rôle IS 'Rôle de l''utilisateur : proprietaire, notaire ou admin';
COMMENT ON COLUMN users.created_at IS 'Date et heure de création du compte';

-- =====================================================
-- Table: documents
-- =====================================================
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    titre VARCHAR(255) NOT NULL,
    ipfs_hash VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    type document_type NOT NULL DEFAULT 'autre',
    statut document_status NOT NULL DEFAULT 'en_attente',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Contrainte de clé étrangère vers users
    CONSTRAINT fk_documents_user 
        FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
);

-- Index sur user_id pour les jointures rapides
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);

-- Index sur le statut pour les filtres
CREATE INDEX IF NOT EXISTS idx_documents_statut ON documents(statut);

-- Index sur le type pour les filtres
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);

-- Index sur ipfs_hash pour les recherches
CREATE INDEX IF NOT EXISTS idx_documents_ipfs_hash ON documents(ipfs_hash);

-- Index sur created_at pour le tri chronologique
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);

-- Commentaires sur la table
COMMENT ON TABLE documents IS 'Table des documents fonciers stockés';
COMMENT ON COLUMN documents.id IS 'Identifiant unique du document (UUID)';
COMMENT ON COLUMN documents.user_id IS 'Référence vers l''utilisateur propriétaire';
COMMENT ON COLUMN documents.titre IS 'Titre/description du document';
COMMENT ON COLUMN documents.ipfs_hash IS 'Hash IPFS du document pour vérification';
COMMENT ON COLUMN documents.file_url IS 'URL du fichier stocké (IPFS ou autre)';
COMMENT ON COLUMN documents.type IS 'Type de document : titre_foncier, succession ou autre';
COMMENT ON COLUMN documents.statut IS 'Statut de vérification : en_attente, verifie ou rejete';
COMMENT ON COLUMN documents.created_at IS 'Date et heure de création/upload du document';

-- =====================================================
-- Table: transmissions
-- =====================================================
CREATE TABLE IF NOT EXISTS transmissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL,
    héritiers_json JSONB,
    video_url TEXT,
    witnesses JSONB,
    gps_lat DOUBLE PRECISION,
    gps_long DOUBLE PRECISION,
    hash_blockchain VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Contrainte de clé étrangère vers documents
    CONSTRAINT fk_transmissions_document 
        FOREIGN KEY (document_id) 
        REFERENCES documents(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
);

-- Index sur document_id pour les jointures rapides
CREATE INDEX IF NOT EXISTS idx_transmissions_document_id ON transmissions(document_id);

-- Index sur hash_blockchain pour les recherches
CREATE INDEX IF NOT EXISTS idx_transmissions_hash_blockchain ON transmissions(hash_blockchain);

-- Index GIN sur héritiers_json pour les recherches JSONB
CREATE INDEX IF NOT EXISTS idx_transmissions_heritiers_json ON transmissions USING GIN (héritiers_json);

-- Index GIN sur witnesses pour les recherches JSONB
CREATE INDEX IF NOT EXISTS idx_transmissions_witnesses ON transmissions USING GIN (witnesses);

-- Index sur les coordonnées GPS pour les recherches géographiques
CREATE INDEX IF NOT EXISTS idx_transmissions_gps ON transmissions(gps_lat, gps_long);

-- Index sur created_at pour le tri chronologique
CREATE INDEX IF NOT EXISTS idx_transmissions_created_at ON transmissions(created_at DESC);

-- Commentaires sur la table
COMMENT ON TABLE transmissions IS 'Table des transmissions de documents (volontés de transmission)';
COMMENT ON COLUMN transmissions.id IS 'Identifiant unique de la transmission (UUID)';
COMMENT ON COLUMN transmissions.document_id IS 'Référence vers le document concerné';
COMMENT ON COLUMN transmissions.héritiers_json IS 'Liste des héritiers au format JSONB';
COMMENT ON COLUMN transmissions.video_url IS 'URL de la vidéo de transmission (si disponible)';
COMMENT ON COLUMN transmissions.witnesses IS 'Liste des témoins au format JSONB';
COMMENT ON COLUMN transmissions.gps_lat IS 'Latitude GPS du lieu de transmission';
COMMENT ON COLUMN transmissions.gps_long IS 'Longitude GPS du lieu de transmission';
COMMENT ON COLUMN transmissions.hash_blockchain IS 'Hash de la transaction blockchain (Polygon Mumbai)';
COMMENT ON COLUMN transmissions.created_at IS 'Date et heure de création de la transmission';

-- =====================================================
-- Vues utiles (optionnel)
-- =====================================================

-- Vue pour les documents avec informations utilisateur
CREATE OR REPLACE VIEW documents_with_user AS
SELECT 
    d.id,
    d.titre,
    d.ipfs_hash,
    d.file_url,
    d.type,
    d.statut,
    d.created_at,
    u.id as user_id,
    u.email as user_email,
    u.nom as user_nom,
    u.rôle as user_role
FROM documents d
INNER JOIN users u ON d.user_id = u.id;

COMMENT ON VIEW documents_with_user IS 'Vue combinant les documents avec les informations utilisateur';

-- Vue pour les transmissions complètes
CREATE OR REPLACE VIEW transmissions_complete AS
SELECT 
    t.id,
    t.document_id,
    t.héritiers_json,
    t.video_url,
    t.witnesses,
    t.gps_lat,
    t.gps_long,
    t.hash_blockchain,
    t.created_at,
    d.titre as document_titre,
    d.ipfs_hash as document_ipfs_hash,
    d.user_id as document_user_id,
    u.email as document_user_email,
    u.nom as document_user_nom
FROM transmissions t
INNER JOIN documents d ON t.document_id = d.id
INNER JOIN users u ON d.user_id = u.id;

COMMENT ON VIEW transmissions_complete IS 'Vue combinant les transmissions avec les informations document et utilisateur';

-- =====================================================
-- Fin du script
-- =====================================================

