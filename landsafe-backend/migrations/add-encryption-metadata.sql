-- Table pour métadonnées de chiffrement
CREATE TABLE IF NOT EXISTS encryption_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID UNIQUE NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    algorithm VARCHAR(50) NOT NULL DEFAULT 'aes-256-gcm',
    key_derivation VARCHAR(50) NOT NULL DEFAULT 'scrypt',
    salt_length INTEGER NOT NULL DEFAULT 64,
    iv_length INTEGER NOT NULL DEFAULT 16,
    tag_length INTEGER NOT NULL DEFAULT 16,
    password_hash TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_encryption_document ON encryption_metadata(document_id);

COMMENT ON TABLE encryption_metadata IS 'Métadonnées de chiffrement des documents';
COMMENT ON COLUMN encryption_metadata.password_hash IS 'Hash du mot de passe utilisateur (optionnel)';

-- Ajouter colonnes dans documents
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS encryption_method VARCHAR(50) DEFAULT 'aes-256-gcm';

COMMENT ON COLUMN documents.is_encrypted IS 'Indique si le document IPFS est chiffré';
COMMENT ON COLUMN documents.encryption_method IS 'Méthode de chiffrement utilisée';

