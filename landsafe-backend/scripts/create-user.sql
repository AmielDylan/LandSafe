-- Script de création de l'utilisateur landsafe_user pour PostgreSQL

-- Créer l'utilisateur (s'il n'existe pas déjà)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = 'landsafe_user') THEN
        CREATE USER landsafe_user WITH PASSWORD 'landsafe_password';
        RAISE NOTICE 'Utilisateur landsafe_user créé';
    ELSE
        RAISE NOTICE 'Utilisateur landsafe_user existe déjà';
    END IF;
END
$$;

-- Donner le droit de connexion à la base de données landsafe_db
GRANT CONNECT ON DATABASE landsafe_db TO landsafe_user;

