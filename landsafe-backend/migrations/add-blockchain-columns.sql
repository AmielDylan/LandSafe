-- Migration : Ajout des colonnes blockchain à la table documents
-- Date : 2025-11-09

-- Ajouter les colonnes blockchain
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS blockchain_tx_hash VARCHAR(66),
ADD COLUMN IF NOT EXISTS blockchain_document_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS blockchain_block_number INTEGER,
ADD COLUMN IF NOT EXISTS blockchain_network VARCHAR(50) DEFAULT 'polygon-amoy';

-- Index pour recherches rapides
CREATE INDEX IF NOT EXISTS idx_documents_blockchain_tx ON documents(blockchain_tx_hash);
CREATE INDEX IF NOT EXISTS idx_documents_blockchain_doc_id ON documents(blockchain_document_id);

-- Commentaires
COMMENT ON COLUMN documents.blockchain_tx_hash IS 'Hash de la transaction de certification blockchain';
COMMENT ON COLUMN documents.blockchain_document_id IS 'ID du document sur le smart contract';
COMMENT ON COLUMN documents.blockchain_block_number IS 'Numéro du bloc de certification blockchain';
COMMENT ON COLUMN documents.blockchain_network IS 'Réseau blockchain utilisé (polygon-amoy, polygon-mainnet, etc.)';

